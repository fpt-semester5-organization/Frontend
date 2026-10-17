import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import MyContent from './MyContent';

const POSTS = [
  { postId: 5, title: 'Bữa sáng chay nhanh gọn cho sinh viên', authorName: 'Nguyễn An', voteCount: 3, commentCount: 1, createdAt: '2026-10-17T09:27:26Z' },
  { postId: 4, title: 'Sữa đậu nành tự làm tại nhà', authorName: 'Nguyễn An', voteCount: 0, commentCount: 0, createdAt: '2026-10-16T08:00:00Z' },
];

const mockPosts = () =>
  mockApi((req) => (req.url === '/posts' && req.method === 'GET' ? { data: POSTS, meta: { page: 1, size: 10, total: POSTS.length } } : undefined));

const signIn = (signedIn: boolean) =>
  useAuthStore.setState(
    signedIn
      ? {
          user: { userId: 1024, fullName: 'Nguyễn An', email: 'an.nguyen@gmail.com', role: 'MEMBER', isVip: false },
          accessToken: 'member-token',
          token: 'member-token',
          guestToken: null,
          isAuthenticated: true,
          sessionStatus: 'ready',
        }
      : { user: null, accessToken: null, token: null, guestToken: 'guest-jwt', isAuthenticated: false, sessionStatus: 'ready' }
  );

describe('MyContent (Nội dung của tôi)', () => {
  it('Khách thấy lời mời đăng nhập, quay lại đúng trang', () => {
    signIn(false);
    const calls = mockPosts();
    renderPage(<MyContent />, { route: '/me/content' });
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/auth/login?returnUrl=%2Fme%2Fcontent');
    expect(calls).toHaveLength(0);
  });

  describe('Thành viên', () => {
    beforeEach(() => signIn(true));

    it('tab Bài viết mặc định: GET /posts theo tác giả là mình, mới nhất trước', async () => {
      const calls = mockPosts();
      renderPage(<MyContent />, { route: '/me/content' });
      expect(screen.getByRole('tab', { name: 'Bài viết' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByRole('link', { name: 'Bữa sáng chay nhanh gọn cho sinh viên' })).toHaveAttribute('href', '/community/posts/5');
      expect(calls[0]).toMatchObject({ method: 'GET', url: '/posts', params: { authorId: 1024, sort: 'NEWEST', page: 1, size: 10 } });
      expect(within(screen.getByRole('tabpanel')).getByText('Tổng số bài').nextElementSibling).toHaveTextContent('2');
    });

    it('tab Công thức báo đang phát triển và không gọi GET /recipes', async () => {
      const calls = mockPosts();
      renderPage(<MyContent />, { route: '/me/content' });
      await userEvent.click(screen.getByRole('tab', { name: 'Công thức' }));
      expect(screen.getByRole('tab', { name: 'Công thức' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('heading', { name: 'Danh sách công thức của bạn đang được phát triển' })).toBeInTheDocument();
      expect(within(screen.getByRole('tabpanel')).getByRole('link', { name: 'Đăng công thức' })).toHaveAttribute('href', '/recipes/new');
      await waitFor(() => expect(calls.some((c) => c.url.startsWith('/recipes'))).toBe(false));
    });

    it('mở thẳng ?tab=recipes thì chọn sẵn tab Công thức', () => {
      const calls = mockPosts();
      renderPage(<MyContent />, { route: '/me/content?tab=recipes' });
      expect(screen.getByRole('tab', { name: 'Công thức' })).toHaveAttribute('aria-selected', 'true');
      expect(calls).toHaveLength(0);
    });
  });
});
