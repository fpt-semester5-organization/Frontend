import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/utils';
import PostFeed from '../pages/PostFeed';
import PostDetail from '../pages/PostDetail';
import PostEditor from '../pages/PostEditor';
import MyPosts from '../pages/MyPosts';
import type { PostComment, PostDetail as PostDetailType, PostListItem } from '../types/community.types';

const mockPosts: PostListItem[] = [
  {
    postId: 101,
    title: 'Hành trình 30 ngày ăn chay thuần',
    authorName: 'Trần Tâm',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
    voteCount: 42,
    commentCount: 5,
    createdAt: '2026-10-10T08:00:00Z',
  },
  {
    postId: 102,
    title: 'Cách làm đậu phụ sốt cà chua nấm hương',
    authorName: 'Lê Minh',
    imageUrl: '',
    voteCount: 18,
    commentCount: 2,
    createdAt: '2026-10-12T09:30:00Z',
  },
  {
    postId: 103,
    title: 'Bí quyết cân bằng dinh dưỡng cho người ăn chay trường',
    authorName: 'Phạm Hương',
    imageUrl: '',
    voteCount: 30,
    commentCount: 7,
    createdAt: '2026-10-13T10:00:00Z',
  },
];

const mockDetailPost: PostDetailType = {
  postId: 101,
  title: 'Hành trình 30 ngày ăn chay thuần',
  content: 'Đây là bài chia sẻ chi tiết về trải nghiệm ăn chay 30 ngày cải thiện sức khỏe.',
  imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
  author: { userId: 5, fullName: 'Trần Tâm' },
  videos: [],
  recipes: [],
  voteCount: 42,
  commentCount: 1,
  memberActions: { canVote: true, canComment: true },
};

const mockComments: PostComment[] = [
  {
    commentId: 1,
    author: { userId: 8, fullName: 'Hoàng Nam' },
    content: 'Bài viết rất hữu ích, cảm ơn bạn đã chia sẻ!',
    parentCommentId: null,
    status: 'ACTIVE',
    createdAt: '2026-10-10T10:00:00Z',
    replies: [
      {
        commentId: 2,
        author: { userId: 5, fullName: 'Trần Tâm' },
        content: 'Cảm ơn bạn Nam đã ủng hộ nhé!',
        parentCommentId: 1,
        status: 'ACTIVE',
        createdAt: '2026-10-10T10:15:00Z',
        replies: [],
      },
    ],
  },
];

describe('Phân hệ Cộng đồng - Sprint 6', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      sessionStatus: 'ready',
    });
    useUiStore.setState({
      signupPrompt: { open: false, returnUrl: '/' },
      toasts: [],
    });
  });

  describe('1. Khách bấm thao tác ghi -> Hiện hộp mời đăng ký (SignupPromptModal)', () => {
    it('Khách bấm nút "Viết bài mới" trên Bảng tin -> Hiện popup đăng ký', async () => {
      mockApi((req) => {
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 10, total: mockPosts.length } };
        }
      });

      renderWithProviders(<PostFeed />, '/community');
      const writeButton = await screen.findByRole('button', { name: /Viết bài mới/i });
      await userEvent.click(writeButton);

      expect(await screen.findByRole('heading', { name: /Đăng ký để tiếp tục/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Đăng ký miễn phí/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Tôi đã có tài khoản/i })).toBeInTheDocument();
    });

    it('Khách bấm thẻ "Tham gia cộng đồng" trên sidebar Bảng tin -> Hiện popup đăng ký', async () => {
      mockApi((req) => {
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 10, total: mockPosts.length } };
        }
      });

      renderWithProviders(<PostFeed />, '/community');
      const sidebarCard = await screen.findByText(/Tham gia cộng đồng/i);
      await userEvent.click(sidebarCard);

      expect(await screen.findByRole('heading', { name: /Đăng ký để tiếp tục/i })).toBeInTheDocument();
    });

    it('Khách bấm nút Thả tim trên thẻ bài viết -> Hiện popup đăng ký', async () => {
      mockApi((req) => {
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 10, total: mockPosts.length } };
        }
      });

      renderWithProviders(<PostFeed />, '/community');
      const heartButtons = await screen.findAllByRole('button', { name: /Yêu thích/i });
      await userEvent.click(heartButtons[0]);

      expect(await screen.findByRole('heading', { name: /Đăng ký để tiếp tục/i })).toBeInTheDocument();
    });

    it('Khách vào trang Chi tiết bài viết bấm Viết bình luận -> Hiện popup đăng ký', async () => {
      mockApi((req) => {
        if (req.url === '/posts/101') return { data: mockDetailPost };
        if (req.url === '/posts/101/comments') {
          return { data: mockComments, meta: { page: 1, size: 20, total: 1 } };
        }
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 6, total: 3 } };
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/community/posts/:id" element={<PostDetail />} />
        </Routes>,
        '/community/posts/101'
      );

      expect(await screen.findByRole('heading', { name: mockDetailPost.title })).toBeInTheDocument();

      const commentBox = await screen.findByLabelText(/Đăng nhập để tham gia bình luận/i);
      await userEvent.click(commentBox);

      expect(await screen.findByRole('heading', { name: /Đăng ký để tiếp tục/i })).toBeInTheDocument();
    });

    it('Khách bấm "Trả lời" bình luận -> Hiện popup đăng ký', async () => {
      mockApi((req) => {
        if (req.url === '/posts/101') return { data: mockDetailPost };
        if (req.url === '/posts/101/comments') {
          return { data: mockComments, meta: { page: 1, size: 20, total: 1 } };
        }
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 6, total: 3 } };
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/community/posts/:id" element={<PostDetail />} />
        </Routes>,
        '/community/posts/101'
      );

      const replyButtons = await screen.findAllByRole('button', { name: /Trả lời/i });
      await userEvent.click(replyButtons[0]);

      expect(await screen.findByRole('heading', { name: /Đăng ký để tiếp tục/i })).toBeInTheDocument();
    });
  });

  describe('2. Bình luận hiện ngay sau khi gửi (Optimistic Updates)', () => {
    it('Thành viên gửi bình luận -> Bình luận xuất hiện ngay lập tức trên màn hình', async () => {
      // Giả lập Thành viên đã đăng nhập
      useAuthStore.setState({
        token: 'valid-jwt-token',
        user: { userId: 99, fullName: 'Nguyễn Văn A', email: 'a@veggie.vn', role: 'MEMBER', isVip: false },
        isAuthenticated: true,
        sessionStatus: 'ready',
      });

      const dynamicComments: PostComment[] = [...mockComments];
      let commentCreated = false;

      mockApi((req) => {
        if (req.url === '/posts/101') return { data: mockDetailPost };
        if (req.url === '/posts/101/comments' && req.method === 'get') {
          return { data: dynamicComments, meta: { page: 1, size: 20, total: dynamicComments.length } };
        }
        if (req.url === '/posts/101/comments' && req.method === 'post') {
          commentCreated = true;
          const body = req.body as { content: string };
          const newComment: PostComment = {
            commentId: 555,
            author: { userId: 99, fullName: 'Nguyễn Văn A' },
            content: body.content,
            parentCommentId: null,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            replies: [],
          };
          dynamicComments.push(newComment);
          return {
            status: 201,
            data: newComment,
            message: 'Đã gửi bình luận.',
          };
        }
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 6, total: 3 } };
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/community/posts/:id" element={<PostDetail />} />
        </Routes>,
        '/community/posts/101'
      );

      expect(await screen.findByRole('heading', { name: mockDetailPost.title })).toBeInTheDocument();

      const textarea = await screen.findByPlaceholderText(/Chia sẻ cảm nghĩ hoặc đặt câu hỏi…/i);
      const submitButton = screen.getByRole('button', { name: /Gửi bình luận/i });

      // Nhập nội dung bình luận
      const myNewComment = 'Món này mình nấu thử rồi, ngon tuyệt vời!';
      await userEvent.type(textarea, myNewComment);
      await userEvent.click(submitButton);

      // Bình luận hiển thị ngay lập tức (optimistic update)
      expect(await screen.findByText(myNewComment)).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();

      // Kiểm tra API đã nhận được lệnh post
      await waitFor(() => expect(commentCreated).toBe(true));
    });
  });

  describe('3. Khối gợi ý bài liên quan (Related Posts)', () => {
    it('Hiển thị khối "Bài viết liên quan & Gợi ý cho bạn" loại trừ bài hiện tại', async () => {
      mockApi((req) => {
        if (req.url === '/posts/101') return { data: mockDetailPost };
        if (req.url === '/posts/101/comments') {
          return { data: [], meta: { page: 1, size: 20, total: 0 } };
        }
        if (req.url.includes('/posts')) {
          return { data: mockPosts, meta: { page: 1, size: 6, total: 3 } };
        }
      });

      renderWithProviders(
        <Routes>
          <Route path="/community/posts/:id" element={<PostDetail />} />
        </Routes>,
        '/community/posts/101'
      );

      // Chờ tiêu đề khối gợi ý xuất hiện
      expect(await screen.findByRole('heading', { name: /Bài viết liên quan & Gợi ý cho bạn/i })).toBeInTheDocument();

      // Bài 102 và 103 phải xuất hiện
      expect(screen.getByText('Cách làm đậu phụ sốt cà chua nấm hương')).toBeInTheDocument();
      expect(screen.getByText('Bí quyết cân bằng dinh dưỡng cho người ăn chay trường')).toBeInTheDocument();

      // Không chứa bài viết hiện tại (101) trong danh sách gợi ý
      const relatedCards = screen.getAllByRole('article');
      // 1 bài chính + 2 bài liên quan
      expect(relatedCards.length).toBe(3);
    });
  });

  describe('4. Màn hình Bài viết của tôi (MyPosts)', () => {
    it('Chưa đăng nhập: hiển thị nhắc đăng nhập', async () => {
      renderWithProviders(<MyPosts />, '/me/posts');
      expect(await screen.findByRole('heading', { name: /Bài viết của tôi/i })).toBeInTheDocument();
      expect(screen.getByText(/Đăng nhập để xem và quản lý bài viết của bạn/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Đăng nhập$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Đăng ký$/i })).toBeInTheDocument();
    });

    it('Đã đăng nhập: hiển thị danh sách bài viết cá nhân và thống kê', async () => {
      useAuthStore.setState({
        token: 'valid-jwt',
        user: { userId: 5, fullName: 'Trần Tâm', email: 'tam@veggie.vn', role: 'MEMBER', isVip: false },
        isAuthenticated: true,
        sessionStatus: 'ready',
      });

      mockApi((req) => {
        if (req.url.includes('/posts')) {
          return {
            data: [mockPosts[0]], // Bài của userId 5
            meta: { page: 1, size: 10, total: 1 },
          };
        }
      });

      renderWithProviders(<MyPosts />, '/me/posts');

      expect(await screen.findByText('Hành trình 30 ngày ăn chay thuần')).toBeInTheDocument();
      expect(screen.getByText('Tổng số bài')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Viết bài mới/i })).toBeInTheDocument();
    });
  });

  describe('5. Màn hình Soạn bài (PostEditor)', () => {
    it('Thành viên có thể nhập tiêu đề, nội dung và chọn chế độ hiển thị', async () => {
      useAuthStore.setState({
        token: 'valid-jwt',
        user: { userId: 5, fullName: 'Trần Tâm', email: 'tam@veggie.vn', role: 'MEMBER', isVip: false },
        isAuthenticated: true,
        sessionStatus: 'ready',
      });

      renderWithProviders(<PostEditor />, '/community/posts/new');

      expect(await screen.findByLabelText(/Tiêu đề bài viết/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nội dung/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Công khai/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Chỉ mình tôi/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xuất bản bài viết/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lưu bản nháp/i })).toBeInTheDocument();
    });
  });
});
