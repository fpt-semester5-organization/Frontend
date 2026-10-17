import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MockRequest, MockResponse } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { detail, mockRecipesApi, signInAsGuest, signInAsMember } from '../test/recipeFixtures';
import RecipeEditor from './RecipeEditor';

/** Công thức của chính Nguyễn An (1024) với các trường giả định dành cho tác giả. */
const own = (status: string, extra: Record<string, unknown> = {}) =>
  detail(540, {
    title: 'Cháo đậu xanh hạt sen',
    authorId: 1024,
    status,
    categoryId: 1,
    dietarySchoolId: 1,
    difficultyLevel: 'EASY',
    ingredients: [{ ingredientId: 1, name: 'Đậu phụ', quantity: 300, unit: 'g', isOptional: false }],
    instructions: ['Ngâm đậu xanh 2 giờ.', 'Nấu cháo nhừ.'],
    ...extra,
  });

const DetailProbe = () => <p>Đã mở chi tiết {useParams().id}</p>;

function renderEdit(recipe: ReturnType<typeof own> | MockResponse, extra: (req: MockRequest) => MockResponse | undefined = () => undefined) {
  const calls = mockRecipesApi((req) => {
    const custom = extra(req);
    if (custom) return custom;
    if (req.url === '/recipes/540' && req.method === 'GET') return 'status' in recipe && typeof recipe.status === 'number' ? (recipe as MockResponse) : { data: recipe };
    return undefined;
  });
  renderPage(
    <Routes>
      <Route path="/recipes/:id/edit" element={<RecipeEditor />} />
      <Route path="/recipes/:id" element={<DetailProbe />} />
    </Routes>,
    { route: '/recipes/540/edit' }
  );
  return calls;
}

const writes = (calls: MockRequest[]) => calls.filter((c) => c.method !== 'GET');

beforeAll(() => {
  URL.createObjectURL = () => 'blob:preview';
  URL.revokeObjectURL = () => {};
});

describe('RecipeEditor — chế độ sửa (/recipes/:id/edit)', () => {
  it('Khách được mời đăng nhập, không tải công thức', () => {
    signInAsGuest();
    const calls = renderEdit(own('DRAFT'));
    expect(screen.getByRole('heading', { name: 'Đăng nhập để sửa công thức' })).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/recipes/540')).toBe(false);
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('bản nháp: điền sẵn form, có Gửi duyệt và Lưu nháp; lưu nháp chỉ gửi trường đã đổi', async () => {
      const calls = renderEdit(own('DRAFT'), (req) =>
        req.method === 'PUT' ? { message: 'Đã lưu nháp.', data: { recipeId: 540, status: 'DRAFT', moderated: false } } : undefined
      );
      const title = await screen.findByLabelText(/Tên món/);
      expect(title).toHaveValue('Cháo đậu xanh hạt sen');
      await screen.findByRole('option', { name: 'Thuần chay' });
      await waitFor(() => expect(screen.getByLabelText(/Trường phái ăn chay/)).toHaveValue('1'));
      await screen.findByRole('option', { name: 'Món canh' });
      await waitFor(() => expect(screen.getByLabelText(/Danh mục món/)).toHaveValue('1'));
      expect(screen.getByLabelText('Nguyên liệu 1')).toHaveValue('Đậu phụ');
      expect(screen.getByLabelText('Định lượng nguyên liệu 1')).toHaveValue('300');
      expect(screen.getByLabelText('Bước 2')).toHaveValue('Nấu cháo nhừ.');
      expect(screen.getByText('Bản nháp')).toBeInTheDocument();
      // Đã tra danh mục nguyên liệu để có calo/100g: ước tính hiện ngay (300 g × 76 kcal).
      expect(await screen.findByText('228')).toBeInTheDocument();

      await userEvent.clear(title);
      await userEvent.type(title, 'Cháo đậu xanh hạt sen nước cốt dừa');
      await userEvent.click(screen.getByRole('button', { name: /Lưu nháp/ }));
      await waitFor(() =>
        expect(writes(calls)[0]).toEqual(
          expect.objectContaining({ method: 'PUT', url: '/recipes/540', body: { title: 'Cháo đậu xanh hạt sen nước cốt dừa', submit: false } })
        )
      );
      expect(await screen.findByText(/Bản nháp · đã lưu lúc/)).toBeInTheDocument();
    });

    it('bản nháp: Gửi duyệt khi không đổi gì thì chỉ gửi submit = true; được đăng thì mở trang chi tiết', async () => {
      const calls = renderEdit(own('DRAFT'), (req) =>
        req.method === 'PUT' ? { message: 'Đã đăng công thức.', data: { recipeId: 540, status: 'APPROVED_ACTIVE', moderated: true } } : undefined
      );
      await screen.findByLabelText(/Tên món/);
      await userEvent.click(screen.getByRole('button', { name: /Gửi duyệt & đăng/ }));
      expect(await screen.findByText('Đã mở chi tiết 540')).toBeInTheDocument();
      expect(writes(calls)[0]).toMatchObject({ method: 'PUT', url: '/recipes/540', body: { submit: true } });
    });

    it('bản đã đăng: chỉ có Lưu thay đổi; không đổi gì thì không gọi API, đổi thời gian nấu thì chỉ gửi trường đó', async () => {
      const calls = renderEdit(own('APPROVED_ACTIVE'), (req) =>
        req.method === 'PUT' ? { message: 'Cập nhật thành công.', data: { recipeId: 540, status: 'APPROVED_ACTIVE', moderated: true } } : undefined
      );
      await screen.findByLabelText(/Tên món/);
      expect(screen.queryByRole('button', { name: /Lưu nháp/ })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
      expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Bạn chưa thay đổi nội dung nào.');
      expect(writes(calls)).toHaveLength(0);

      const cook = screen.getByLabelText(/^Nấu/);
      await userEvent.clear(cook);
      await userEvent.type(cook, '30');
      await userEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
      expect(await screen.findByText('Đã mở chi tiết 540')).toBeInTheDocument();
      expect(writes(calls)[0].body).toEqual({ cookTimeMinutes: 30 });
    });

    it('bản bị từ chối có trứng gắn nhãn Thuần chay: cảnh báo ngay khi mở', async () => {
      renderEdit(own('REJECTED', { ingredients: [{ ingredientId: 2, name: 'Trứng gà', quantity: 2, unit: 'quả', isOptional: false }] }));
      expect(await screen.findByText(/Thuần chay không dùng trứng/)).toBeInTheDocument();
      expect(screen.getByText('Bị từ chối')).toBeInTheDocument();
    });

    it('không phải tác giả thì không sửa được', async () => {
      renderEdit(own('APPROVED_ACTIVE', { authorId: 2048 }));
      expect(await screen.findByRole('heading', { name: 'Bạn không thể sửa công thức này' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/Tên món/)).not.toBeInTheDocument();
    });

    it('đang bị ẩn chờ Admin thì báo khóa, không hiện form', async () => {
      renderEdit(own('QUARANTINED_HIDDEN'));
      expect(await screen.findByRole('heading', { name: 'Công thức đang bị khóa' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Về công thức của tôi' })).toHaveAttribute('href', '/me/recipes');
    });

    it('404 thì báo không tìm thấy', async () => {
      renderEdit({ status: 404, errorCode: 'ERR_CONTENT_NOT_FOUND', message: 'Không tồn tại.' });
      expect(await screen.findByRole('heading', { name: 'Không tìm thấy công thức' })).toBeInTheDocument();
      expect(within(screen.getByRole('status')).getByRole('link', { name: 'Về công thức của tôi' })).toBeInTheDocument();
    });
  });
});
