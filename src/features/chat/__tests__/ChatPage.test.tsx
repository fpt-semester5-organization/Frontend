import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { useUiStore } from '@/stores/ui.store';
import { PATHS } from '@/routes/paths';
import { ApiError } from '@/lib/apiError';
import * as chatApi from '../api/chat.api';
import ChatPage from '../pages/ChatPage';

describe('ChatPage Screen & Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      sessionStatus: 'ready',
      isAuthenticated: false,
    });
    useGuestStore.setState({
      guestId: 'guest_test',
      quota: {
        ai: { limit: 3, used: 0, remaining: 3 },
        barcodeDaily: { limit: 5, used: 0, remaining: 5 },
        mapSearch: { limit: 10, used: 0, remaining: 10 },
      },
    });
    useUiStore.setState({
      signupPrompt: { open: false, returnUrl: '/' },
    });
  });

  describe('1. Kiểm thử giao diện trạng thái trống (Empty State) & Anti-AI copy', () => {
    it('hiển thị tiêu đề cố vấn và 4 thẻ gợi ý Bento Prompt Matrix', () => {
      renderWithProviders(<ChatPage />);

      expect(screen.getByText('Cố vấn Dinh dưỡng Chay')).toBeInTheDocument();
      expect(screen.getByText(/Tư vấn dinh dưỡng & thực đơn chay/i)).toBeInTheDocument();

      // 4 câu hỏi gợi ý Bento
      expect(screen.getByText('Ăn chay kết hợp đạm thế nào?')).toBeInTheDocument();
      expect(screen.getByText('Bữa tối 20 phút đủ chất')).toBeInTheDocument();
      expect(screen.getByText('Phụ gia thực phẩm chay')).toBeInTheDocument();
      expect(screen.getByText('Cách nấu đậu không đầy bụng')).toBeInTheDocument();
    });

    it('loại bỏ hoàn toàn các thuật ngữ kỹ thuật (Qdrant, RAG, Gemini 2.5 Flash, Chuyên mục)', () => {
      renderWithProviders(<ChatPage />);

      expect(screen.queryByText(/Qdrant/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/RAG Verified/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Gemini 2.5 Flash/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/100% Bảo chứng/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Chuyên mục/i)).not.toBeInTheDocument();
    });
  });

  describe('2. Kiểm thử Panel 3 (Hồ sơ & Lối tắt)', () => {
    it('hiển thị "Kcalo mục tiêu" dạng "---- kcal" đối với Khách vãng lai', () => {
      renderWithProviders(<ChatPage />);

      expect(screen.getByText('Kcalo mục tiêu')).toBeInTheDocument();
      expect(screen.getByText('---- kcal')).toBeInTheDocument();
      expect(screen.getByText('Đăng nhập thiết lập hồ sơ')).toBeInTheDocument();
    });

    it('hiển thị "Kcalo mục tiêu" dạng "1850 kcal/ngày" đối với Thành viên đã đăng nhập', () => {
      useAuthStore.setState({
        user: {
          userId: 1,
          email: 'member@veggielife.vn',
          fullName: 'Minh Tâm',
          role: 'MEMBER',
          isVip: false,
        },
        sessionStatus: 'ready',
        isAuthenticated: true,
      });

      renderWithProviders(<ChatPage />);

      expect(screen.getByText('Kcalo mục tiêu')).toBeInTheDocument();
      expect(screen.getByText('1850 kcal/ngày')).toBeInTheDocument();
      expect(screen.getAllByText('Minh Tâm').length).toBeGreaterThanOrEqual(1);
    });

    it('hiển thị 3 lối tắt dinh dưỡng cá nhân hóa với class "!no-underline" để triệt tiêu gạch chân Bootstrap', () => {
      renderWithProviders(<ChatPage />);

      const shortcut1 = screen.getByRole('link', { name: /Dị ứng & Kiêng cữ/i });
      const shortcut2 = screen.getByRole('link', { name: /Mục tiêu thể trạng/i });
      const shortcut3 = screen.getByRole('link', { name: /Món chay đã lưu/i });

      expect(shortcut1).toBeInTheDocument();
      expect(shortcut1).toHaveAttribute('href', PATHS.ME.DIETARY_PREFERENCES);
      expect(shortcut1.className).toContain('!no-underline');

      expect(shortcut2).toBeInTheDocument();
      expect(shortcut2).toHaveAttribute('href', PATHS.ME.HEALTH);
      expect(shortcut2.className).toContain('!no-underline');

      expect(shortcut3).toBeInTheDocument();
      expect(shortcut3).toHaveAttribute('href', PATHS.ME.RECIPES);
      expect(shortcut3.className).toContain('!no-underline');
    });

    it('khi Khách bấm vào lối tắt cá nhân hóa, kích hoạt modal yêu cầu đăng nhập', async () => {
      const user = userEvent.setup();
      const openSignupPromptSpy = vi.fn();
      useUiStore.setState({ openSignupPrompt: openSignupPromptSpy });

      renderWithProviders(<ChatPage />);

      const shortcut = screen.getByRole('link', { name: /Dị ứng & Kiêng cữ/i });
      await user.click(shortcut);

      expect(openSignupPromptSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Kiểm thử ô nhập câu hỏi và gửi tin nhắn', () => {
    it('nút gửi tin nhắn bị vô hiệu hóa khi ô nhập rỗng hoặc chỉ có khoảng trắng', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Nhập câu hỏi của bạn về dinh dưỡng/i);
      const sendBtn = screen.getByRole('button', { name: 'Gửi câu hỏi' });

      expect(sendBtn).toBeDisabled();

      await user.type(textarea, '   ');
      expect(sendBtn).toBeDisabled();

      await user.type(textarea, 'Tư vấn đạm');
      expect(sendBtn).toBeEnabled();
    });

    it('bấm "Điền câu hỏi" trên thẻ Bento prompt điền nội dung vào ô nhập', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatPage />);

      const fillButtons = screen.getAllByRole('button', { name: 'Điền câu hỏi' });
      await user.click(fillButtons[0]);

      const textarea = screen.getByPlaceholderText(/Nhập câu hỏi của bạn về dinh dưỡng/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain('phối hợp thực phẩm thế nào');
    });

    it('bấm "Hỏi ngay" trên thẻ Bento prompt tự động kích hoạt gửi câu hỏi', async () => {
      const user = userEvent.setup();

      const createSpy = vi.spyOn(chatApi, 'createChatSession').mockResolvedValue({
        sessionId: 50,
        title: 'Ăn chay kết hợp đạm thế nào?',
        contextType: 'NUTRITION_CONSULTATION',
        startedAt: '2026-10-13T10:00:00Z',
      });

      const sendSpy = vi.spyOn(chatApi, 'sendChatMessage').mockResolvedValue({
        message: {
          messageId: 2,
          senderType: 'ASSISTANT',
          content: 'Bạn nên kết hợp đậu gà với cơm gạo lứt hoặc bánh mì nguyên cám.',
          createdAt: '2026-10-13T10:00:02Z',
        },
        quota: { limit: 3, used: 1, remaining: 2 },
      });

      renderWithProviders(<ChatPage />);

      const askNowButtons = screen.getAllByRole('button', { name: /Hỏi ngay/i });
      await user.click(askNowButtons[0]);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledWith(
          50,
          expect.stringContaining('Tôi ăn thuần chay thì nên phối hợp thực phẩm thế nào')
        );
      });
    });

    it('hiển thị thông báo lỗi và nút "Gửi lại" khi việc gửi tin nhắn gặp sự cố dịch vụ gián đoạn (503)', async () => {
      const user = userEvent.setup();

      vi.spyOn(chatApi, 'createChatSession').mockResolvedValue({
        sessionId: 60,
        title: 'Lỗi mạng',
        contextType: 'NUTRITION_CONSULTATION',
        startedAt: '2026-10-13T10:00:00Z',
      });

      // Giả lập lỗi 503 AI Circuit Open
      const error503 = new ApiError({
        status: 503,
        errorCode: 'ERR_AI_CIRCUIT_OPEN',
        message: 'Hệ thống AI đang quá tải, vui lòng thử lại sau giây lát.',
      });

      vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValueOnce(error503);

      renderWithProviders(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Nhập câu hỏi của bạn về dinh dưỡng/i);
      await user.type(textarea, 'Cách nấu cháo yến mạch?');

      const sendBtn = screen.getByRole('button', { name: 'Gửi câu hỏi' });
      await user.click(sendBtn);

      // Hiển thị alert lỗi và nút Gửi lại
      expect(
        await screen.findByText(/Hệ thống AI đang quá tải, vui lòng thử lại sau giây lát./i)
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Gửi lại/i });
      expect(retryBtn).toBeInTheDocument();

      // Giả lập lần thứ 2 gửi thành công
      const sendSpy = vi.spyOn(chatApi, 'sendChatMessage').mockResolvedValueOnce({
        message: {
          messageId: 4,
          senderType: 'ASSISTANT',
          content: 'Nấu yến mạch với sữa đậu nành...',
          createdAt: '2026-10-13T10:00:02Z',
        },
      });

      await user.click(retryBtn);

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith(60, 'Cách nấu cháo yến mạch?');
      });
    });
  });

  describe('4. Kiểm thử thanh lịch sử phong cách Gemini (Search, Ghim, Tài khoản kèm Hạn mức)', () => {
    it('hiển thị thanh tài khoản kèm hạn mức lượt hỏi ở chân trang', () => {
      useAuthStore.setState({
        user: {
          userId: 1,
          email: 'member@veggielife.vn',
          fullName: 'Nguyễn Văn Minh Tâm',
          role: 'MEMBER',
          isVip: true,
        },
        sessionStatus: 'ready',
        isAuthenticated: true,
      });

      renderWithProviders(<ChatPage />);

      // Tên người dùng và gói Pro
      expect(screen.getAllByText('Nguyễn Văn Minh Tâm').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText(/0\/200 câu/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cài đặt tài khoản' })).toBeInTheDocument();
    });

    it('hỗ trợ tính năng tìm kiếm và ghim cuộc trò chuyện', async () => {
      const user = userEvent.setup();

      vi.spyOn(chatApi, 'listChatSessions').mockResolvedValue({
        items: [
          { sessionId: 1, title: 'Outline Bài Thuyết Trình Cấu Trúc', updatedAt: '2026-10-16T10:00:00Z' },
          { sessionId: 2, title: 'Global Hackathon 2026', updatedAt: '2026-10-16T11:00:00Z' },
        ],
        meta: { page: 1, size: 50, total: 2 },
      });

      useAuthStore.setState({
        user: {
          userId: 1,
          email: 'member@veggielife.vn',
          fullName: 'Nguyễn Văn Minh Tâm',
          role: 'MEMBER',
          isVip: false,
        },
        sessionStatus: 'ready',
        isAuthenticated: true,
      });

      renderWithProviders(<ChatPage />);

      // Tìm thấy các cuộc trò chuyện
      expect(await screen.findByText('Outline Bài Thuyết Trình Cấu Trúc')).toBeInTheDocument();
      expect(screen.getByText('Global Hackathon 2026')).toBeInTheDocument();

      // Bật ô tìm kiếm
      const searchBtn = screen.getByRole('button', { name: 'Tìm kiếm cuộc trò chuyện' });
      await user.click(searchBtn);

      const searchInput = screen.getByPlaceholderText(/Tìm kiếm cuộc trò chuyện/i);
      expect(searchInput).toBeInTheDocument();

      // Tìm kiếm lọc
      fireEvent.change(searchInput, { target: { value: 'Hackathon' } });
      await waitFor(() => {
        expect(screen.queryByText('Outline Bài Thuyết Trình Cấu Trúc')).not.toBeInTheDocument();
        expect(screen.getByText('Global Hackathon 2026')).toBeInTheDocument();
      });

      // Nút ghim cuộc trò chuyện
      const pinButtons = screen.getAllByRole('button', { name: /Ghim cuộc trò chuyện/i });
      expect(pinButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(pinButtons[0]);
    });
  });
});

