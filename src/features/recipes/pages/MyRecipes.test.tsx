import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockRequest, MockResponse } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { listItem, mockRecipesApi, signInAsGuest, signInAsMember } from '../test/recipeFixtures';
import MyRecipes from './MyRecipes';

const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;

const MINE = [
  { ...listItem(527, { title: 'Đậu hũ kho tiêu' }), status: 'APPROVED_ACTIVE' },
  { ...listItem(540, { title: 'Cháo đậu xanh hạt sen' }), status: 'DRAFT' },
  { ...listItem(541, { title: 'Lẩu nấm thập cẩm' }), status: 'QUARANTINED_HIDDEN' },
  { ...listItem(543, { title: 'Chả lụa chay' }), status: 'REJECTED' },
];

const listCalls = (calls: MockRequest[]) => calls.filter((c) => c.url === '/recipes' && c.method === 'GET').map((c) => c.params as Record<string, unknown>);

/** API giả: GET /recipes lọc theo status trên danh sách `items()` hiện tại; `extra` xử lý trước (DELETE…). */
function mockMine(extra: (req: MockRequest) => MockResponse | undefined = () => undefined, items: () => typeof MINE = () => MINE) {
  return mockRecipesApi((req) => {
    const custom = extra(req);
    if (custom) return custom;
    if (req.url === '/recipes' && req.method === 'GET') {
      const status = (req.params as { status?: string }).status;
      const data = status ? items().filter((item) => item.status === status) : items();
      return { data, meta: { page: 1, size: 10, total: data.length } };
    }
    return undefined;
  });
}

const row = (title: string) => screen.getByRole('link', { name: title }).closest('li') as HTMLElement;

describe('MyRecipes (SCR-14)', () => {
  it('Khách thấy lời mời đăng nhập, không gọi API', () => {
    signInAsGuest();
    const calls = mockMine();
    renderPage(<MyRecipes />, { route: '/me/recipes' });
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/auth/login?returnUrl=%2Fme%2Frecipes');
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('tải danh sách theo authorId của mình, mới nhất trước, kèm nhãn trạng thái', async () => {
      const calls = mockMine();
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      expect(screen.getByRole('status', { name: 'Đang tải công thức của bạn' })).toBeInTheDocument();
      expect(await screen.findByRole('link', { name: 'Đậu hũ kho tiêu' })).toHaveAttribute('href', '/recipes/527');
      expect(listCalls(calls)[0]).toEqual({ authorId: 1024, sort: 'NEWEST', page: 1, size: 10 });
      expect(screen.getByText('4 công thức')).toBeInTheDocument();
      expect(within(row('Cháo đậu xanh hạt sen')).getByText('Bản nháp')).toBeInTheDocument();
      expect(within(row('Lẩu nấm thập cẩm')).getByText('Đang bị ẩn')).toBeInTheDocument();
    });

    it('thao tác theo trạng thái: nháp thì tiếp tục sửa, đang bị ẩn thì không sửa, đã đăng thì gỡ được', async () => {
      mockMine();
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      await screen.findByRole('link', { name: 'Đậu hũ kho tiêu' });
      expect(screen.getByRole('link', { name: 'Cháo đậu xanh hạt sen' })).toHaveAttribute('href', '/recipes/540/edit');
      expect(within(row('Cháo đậu xanh hạt sen')).getByRole('link', { name: /Tiếp tục chỉnh sửa/ })).toHaveAttribute('href', '/recipes/540/edit');
      expect(within(row('Chả lụa chay')).getByRole('link', { name: /Sửa và gửi lại/ })).toBeInTheDocument();
      expect(within(row('Lẩu nấm thập cẩm')).queryByRole('link', { name: /Sửa/ })).not.toBeInTheDocument();
      expect(within(row('Đậu hũ kho tiêu')).getByRole('button', { name: /Gỡ khỏi trang cá nhân/ })).toBeInTheDocument();
      expect(within(row('Cháo đậu xanh hạt sen')).queryByRole('button', { name: /Gỡ khỏi trang cá nhân/ })).not.toBeInTheDocument();
    });

    it('chọn tab và tìm kiếm thì gửi status, keyword và ghi vào URL', async () => {
      const calls = mockMine();
      renderPage(
        <>
          <MyRecipes />
          <LocationProbe />
        </>,
        { route: '/me/recipes' }
      );
      await screen.findByRole('link', { name: 'Đậu hũ kho tiêu' });
      await userEvent.click(screen.getByRole('button', { name: 'Bản nháp' }));
      await waitFor(() => expect(listCalls(calls).at(-1)).toMatchObject({ status: 'DRAFT', page: 1 }));
      expect(screen.getByTestId('location')).toHaveTextContent('?status=DRAFT');
      expect(await screen.findByRole('heading', { name: 'Bản nháp' })).toBeInTheDocument();

      await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm trong công thức của tôi' }), 'cháo{Enter}');
      await waitFor(() => expect(listCalls(calls).at(-1)).toMatchObject({ status: 'DRAFT', keyword: 'cháo' }));
    });

    it('xóa công thức: hỏi xác nhận rồi gọi DELETE mode=all và làm mới danh sách', async () => {
      let items = MINE;
      const calls = mockMine(
        (req) => {
          if (req.method !== 'DELETE') return undefined;
          items = MINE.filter((item) => item.recipeId !== 540);
          return { message: 'Đã xóa công thức.', data: { recipeId: 540, status: 'DELETED' } };
        },
        () => items
      );
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      await userEvent.click(await screen.findByRole('button', { name: 'Xóa công thức Cháo đậu xanh hạt sen' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/không thể hoàn tác/)).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Xóa công thức' }));
      await waitFor(() => expect(screen.queryByRole('link', { name: 'Cháo đậu xanh hạt sen' })).not.toBeInTheDocument());
      const del = calls.find((c) => c.method === 'DELETE');
      expect(del).toMatchObject({ url: '/recipes/540', params: { mode: 'all' } });
      expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Đã xóa công thức.');
    });

    it('gỡ khỏi trang cá nhân gọi DELETE mode=archive', async () => {
      const calls = mockMine((req) =>
        req.method === 'DELETE' ? { message: 'Đã gỡ công thức khỏi trang cá nhân.', data: { recipeId: 527, status: 'ARCHIVED' } } : undefined
      );
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      await userEvent.click(await screen.findByRole('button', { name: /Gỡ khỏi trang cá nhân/ }));
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Gỡ công thức' }));
      await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({ url: '/recipes/527', params: { mode: 'archive' } }));
    });

    it('chưa có công thức nào thì mời đăng công thức; tab rỗng thì gợi ý xem tất cả', async () => {
      mockMine(undefined, () => []);
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      expect(await screen.findByText('Bạn chưa có công thức nào')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Đăng công thức' })).toHaveAttribute('href', '/recipes/new');
    });

    it('tab không có công thức thì hiện thông điệp của tab đó', async () => {
      mockMine();
      renderPage(<MyRecipes />, { route: '/me/recipes?status=ARCHIVED' });
      expect(await screen.findByText('Không có công thức ở mục “Đã gỡ”')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Xem tất cả' })).toBeInTheDocument();
    });

    it('lỗi 500 có nút thử lại', async () => {
      mockMine((req) =>
        req.url === '/recipes' ? { status: 500, errorCode: 'ERR_SYS_DATABASE_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu.' } : undefined
      );
      renderPage(<MyRecipes />, { route: '/me/recipes' });
      expect(await screen.findByText('Không kết nối được cơ sở dữ liệu.', {}, { timeout: 3000 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    });
  });
});
