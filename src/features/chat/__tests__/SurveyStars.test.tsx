import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import * as chatApi from '../api/chat.api';
import { SurveyStars } from '../components/SurveyStars';

describe('SurveyStars Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      sessionStatus: 'ready',
      isAuthenticated: false,
    });
    useUiStore.setState({
      signupPrompt: { open: false, returnUrl: '/' },
    });
  });

  it('khi Khách chưa đăng nhập bấm vào sao, mở popup nhắc đăng ký/đăng nhập', async () => {
    const user = userEvent.setup();
    const openSignupPromptSpy = vi.fn();
    useUiStore.setState({ openSignupPrompt: openSignupPromptSpy });

    renderWithProviders(<SurveyStars sessionId={10} question="Cách bổ sung đạm?" />);

    const star4 = screen.getByRole('radio', { name: '4 sao' });
    await user.click(star4);

    expect(openSignupPromptSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('4/5')).not.toBeInTheDocument();
  });

  it('khi Thành viên đã đăng nhập bấm vào sao, hiển thị số điểm và ô nhập góp ý tùy chọn', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        userId: 1,
        email: 'user@example.com',
        fullName: 'Nguyễn Văn A',
        role: 'MEMBER',
        isVip: false,
      },
      sessionStatus: 'ready',
      isAuthenticated: true,
    });

    renderWithProviders(<SurveyStars sessionId={10} question="Cách bổ sung đạm?" />);

    const star5 = screen.getByRole('radio', { name: '5 sao' });
    await user.click(star5);

    expect(screen.getByText('5/5')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Chia sẻ thêm ý kiến của bạn \(không bắt buộc\)/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi phản hồi/i })).toBeInTheDocument();
  });

  it('gửi đánh giá thành công và hiển thị thông báo cảm ơn', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        userId: 1,
        email: 'user@example.com',
        fullName: 'Nguyễn Văn A',
        role: 'MEMBER',
        isVip: false,
      },
      sessionStatus: 'ready',
      isAuthenticated: true,
    });

    const createSurveyMock = vi.spyOn(chatApi, 'createSurvey').mockResolvedValue({ surveyId: 99 });

    renderWithProviders(<SurveyStars sessionId={10} question="Bữa sáng chay đủ chất?" />);

    // Click 5 sao
    const star5 = screen.getByRole('radio', { name: '5 sao' });
    await user.click(star5);

    // Nhập feedback
    const textarea = screen.getByPlaceholderText(/Chia sẻ thêm ý kiến/i);
    await user.type(textarea, 'Rất hữu ích và khoa học!');

    // Bấm nút gửi
    const submitBtn = screen.getByRole('button', { name: /Gửi phản hồi/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSurveyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          chatSessionId: 10,
          contextQuestion: 'Bữa sáng chay đủ chất?',
          ratingScore: 5,
          feedbackContent: 'Rất hữu ích và khoa học!',
        })
      );
    });

    // Thông báo xác nhận
    expect(await screen.findByText(/Cảm ơn bạn đã phản hồi! \(5\/5 sao\)/i)).toBeInTheDocument();
  });
});
