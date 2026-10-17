import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockRequest, MockResponse } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { detail, listItem, mockRecipesApi, signInAsGuest, signInAsMember } from '../test/recipeFixtures';
import RecipeDetail from './RecipeDetail';

const COMMENTS = [
  {
    commentId: 306,
    author: { userId: 3072, fullName: 'Lê Minh Chi' },
    content: 'Món này rất thanh đạm!',
    parentCommentId: null,
    status: 'ACTIVE',
    createdAt: '2026-10-15T08:00:00Z',
    replies: [],
  },
];

/** API giả của trang chi tiết công thức 512; `override` xử lý trước. */
function mockDetail(override: (req: MockRequest) => MockResponse | undefined = () => undefined) {
  return mockRecipesApi((req) => {
    const custom = override(req);
    if (custom) return custom;
    if (req.url === '/recipes/512') return { data: detail(512) };
    if (req.url === '/recipes/512/related') return { data: { recipes: [listItem(520, { title: 'Canh đậu hũ cà chua' })], posts: [], videos: [] } };
    if (req.url === '/recipes/512/comments' && req.method === 'GET') return { data: COMMENTS, meta: { page: 1, size: 20, total: 1 } };
    return undefined;
  });
}

const renderDetail = (route = '/recipes/512') =>
  renderPage(
    <Routes>
      <Route path="/recipes/:id" element={<RecipeDetail />} />
      <Route path="/recipes" element={<p>Trang kho công thức</p>} />
    </Routes>,
    { route }
  );

beforeEach(() => signInAsGuest());

/** Đổi người đăng nhập sang tài khoản `userId` (tác giả công thức trong ca kiểm thử). */
const switchUser = (userId: number) =>
  useAuthStore.setState((state) => ({ user: state.user && { ...state.user, userId, fullName: 'Lê Minh Chi' } }));

describe('RecipeDetail (SCR-12)', () => {
  it('hiện skeleton rồi đủ thông tin, nguyên liệu có định lượng, các bước, món tương tự và bình luận', async () => {
    mockDetail();
    renderDetail();
    expect(screen.getByRole('status', { name: 'Đang tải công thức' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Canh nấm đậu phụ rong biển' })).toBeInTheDocument();
    expect(screen.getByText('Món canh thanh đạm.')).toBeInTheDocument();
    expect(screen.getByText('Công thức chay chuẩn')).toBeInTheDocument();
    expect(screen.getByText('10 phút')).toBeInTheDocument();
    expect(screen.getByText('310 kcal')).toBeInTheDocument();

    const ingredients = within(screen.getByRole('region', { name: /Nguyên liệu/ }));
    expect(ingredients.getByText('Nấm rơm')).toBeInTheDocument();
    expect(ingredients.getByText('200 g')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Cách làm/ })).getAllByRole('listitem')).toHaveLength(2);

    expect(await screen.findByRole('link', { name: 'Canh đậu hũ cà chua' })).toHaveAttribute('href', '/recipes/520');
    expect(await screen.findByText('Món này rất thanh đạm!')).toBeInTheDocument();
  });

  it('404 hiện "Không tìm thấy công thức"', async () => {
    mockDetail((req) =>
      req.url === '/recipes/512' ? { status: 404, errorCode: 'ERR_CONTENT_NOT_FOUND', message: 'Nội dung không tồn tại.' } : undefined
    );
    renderDetail();
    expect(await screen.findByText('Không tìm thấy công thức')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về kho công thức' })).toHaveAttribute('href', '/recipes');
  });

  it('mã công thức sai thì không gọi API', async () => {
    const calls = mockDetail();
    renderDetail('/recipes/abc');
    expect(screen.getByText('Không tìm thấy công thức')).toBeInTheDocument();
    expect(calls.some((c) => c.url.startsWith('/recipes/'))).toBe(false);
  });

  it('lỗi 500 có nút thử lại', async () => {
    mockDetail((req) =>
      req.url === '/recipes/512' ? { status: 500, errorCode: 'ERR_SYS_DATABASE_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu.' } : undefined
    );
    renderDetail();
    expect(await screen.findByText('Không kết nối được cơ sở dữ liệu.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('Khách bấm thả tim hoặc báo cáo thì mở SignupPromptModal, không gọi API', async () => {
    const calls = mockDetail();
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Yêu thích/ }));
    expect(useUiStore.getState().signupPrompt.open).toBe(true);
    useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' } });
    await userEvent.click(screen.getByRole('button', { name: 'Báo cáo công thức' }));
    expect(useUiStore.getState().signupPrompt.open).toBe(true);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('thả tim gọi POST /recipes/{id}/votes và cập nhật số tim', async () => {
      const calls = mockDetail((req) => (req.url === '/recipes/512/votes' ? { data: { voted: true, voteCount: 43 } } : undefined));
      renderDetail();
      await userEvent.click(await screen.findByRole('button', { name: /Yêu thích \(42\)/ }));
      expect(await screen.findByRole('button', { name: /Đã thích \(43\)/ })).toHaveAttribute('aria-pressed', 'true');
      expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual(['/recipes/512/votes']);
    });

    it('bình luận gốc gọi POST /recipes/{id}/comments không kèm parentCommentId', async () => {
      const posted = { ...COMMENTS[0], commentId: 999, author: { userId: 1024, fullName: 'Nguyễn An' }, content: 'Ngon và dễ làm!' };
      let saved = false;
      const calls = mockDetail((req) => {
        if (req.url !== '/recipes/512/comments') return undefined;
        if (req.method === 'POST') {
          saved = true;
          return { status: 201, message: 'Đã bình luận.', data: posted };
        }
        // Sau khi gửi, server trả cả bình luận mới khi tải lại.
        return saved ? { data: [...COMMENTS, posted], meta: { page: 1, size: 20, total: 2 } } : undefined;
      });
      renderDetail();
      await userEvent.type(await screen.findByRole('textbox', { name: 'Viết bình luận' }), 'Ngon và dễ làm!');
      await userEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
      await waitFor(() =>
        expect(calls.find((c) => c.method === 'POST')).toMatchObject({ url: '/recipes/512/comments', body: { content: 'Ngon và dễ làm!' } })
      );
      expect(await screen.findByText('Ngon và dễ làm!')).toBeInTheDocument();
    });

    it('tác giả thấy nút Sửa công thức, không thấy nút Báo cáo, bình luận của mình có nhãn Tác giả', async () => {
      mockDetail((req) => (req.url === '/recipes/512' ? { data: detail(512, { authorId: 3072, status: 'APPROVED_ACTIVE' }) } : undefined));
      signInAsMember();
      switchUser(3072);
      renderDetail();
      expect(await screen.findByRole('link', { name: 'Sửa công thức' })).toHaveAttribute('href', '/recipes/512/edit');
      expect(screen.queryByRole('button', { name: 'Báo cáo công thức' })).not.toBeInTheDocument();
      expect(await screen.findByText('Tác giả')).toBeInTheDocument();
    });

    it('tác giả xem bản nháp của mình: có khung trạng thái, không tải bình luận và món tương tự', async () => {
      const calls = mockDetail((req) =>
        req.url === '/recipes/512' ? { data: detail(512, { authorId: 1024, status: 'DRAFT', voteCount: 0, commentCount: 0 }) } : undefined
      );
      renderDetail();
      expect(await screen.findByText('Bản nháp · chỉ bạn xem được')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Tiếp tục chỉnh sửa' })).toHaveAttribute('href', '/recipes/512/edit');
      expect(screen.queryByRole('button', { name: /Yêu thích/ })).not.toBeInTheDocument();
      expect(calls.some((c) => c.url.endsWith('/comments') || c.url.endsWith('/related'))).toBe(false);
    });

    it('báo cáo công thức gửi targetType RECIPE rồi về kho công thức', async () => {
      const calls = mockDetail((req) =>
        req.url === '/reports' ? { status: 201, message: 'Đã ghi nhận báo cáo.', data: { reportId: 1, status: 'PENDING' } } : undefined
      );
      renderDetail();
      await userEvent.click(await screen.findByRole('button', { name: 'Báo cáo công thức' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByLabelText(/Có nguyên liệu động vật/));
      await userEvent.type(within(dialog).getByLabelText('Mô tả vi phạm'), 'Công thức có dùng nước mắm cá.');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }));
      expect(await screen.findByText('Trang kho công thức')).toBeInTheDocument();
      expect(calls.find((c) => c.url === '/reports')?.body).toEqual({
        targetType: 'RECIPE',
        targetId: 512,
        violationType: 'VIO_MEAT',
        evidenceSummary: 'Công thức có dùng nước mắm cá.',
      });
    });
  });
});
