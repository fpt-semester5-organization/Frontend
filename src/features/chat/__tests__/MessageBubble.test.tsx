import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PATHS } from '@/routes/paths';
import type { ChatMessage } from '../types/chat.types';
import { AssistantBubble, UserBubble } from '../components/MessageBubble';

describe('MessageBubble Components', () => {
  describe('UserBubble', () => {
    it('hiển thị đúng nội dung tin nhắn và thời gian của người dùng', () => {
      const msg: ChatMessage = {
        messageId: 1,
        senderType: 'USER',
        content: 'Tôi muốn tư vấn thực đơn chay cho người tập gym.',
        createdAt: '2026-10-13T10:00:00Z',
      };

      renderWithProviders(<UserBubble m={msg} />);

      expect(
        screen.getByText('Tôi muốn tư vấn thực đơn chay cho người tập gym.')
      ).toBeInTheDocument();
    });
  });

  describe('AssistantBubble', () => {
    const mockAssistantMsg: ChatMessage = {
      messageId: 2,
      senderType: 'ASSISTANT',
      content: 'Để tăng cơ hiệu quả, bạn nên kết hợp đậu phụ [S1] và tài liệu dinh dưỡng [S2].',
      createdAt: '2026-10-13T10:00:05Z',
      ragUsed: true,
      sources: [
        { type: 'RECIPE', id: 101, title: 'Đậu phụ áp chảo xốt nấm' },
        { type: 'NUTRITION_DOC', id: 5, title: 'Hướng dẫn hấp thụ leucine thực vật' },
      ],
      recommendedRecipes: [
        {
          recipeId: 202,
          title: 'Salad đậu gà sốt mè',
          cookTimeMinutes: 15,
        },
      ],
      disclaimer: 'Lưu ý: Lời khuyên chỉ mang tính tham khảo dinh dưỡng tổng quát.',
    };

    it('hiển thị tiêu đề Cố vấn và loại bỏ hoàn toàn huy hiệu Đã kiểm chứng', () => {
      renderWithProviders(
        <AssistantBubble
          m={mockAssistantMsg}
          sessionId={12}
          question="Tập gym ăn chay thế nào?"
        />
      );

      expect(screen.getByText('Cố vấn Dinh dưỡng VeggieLife')).toBeInTheDocument();
      expect(screen.queryByText('Đã kiểm chứng')).not.toBeInTheDocument();
      // Đảm bảo không chứa từ ngữ kỹ thuật
      expect(screen.queryByText(/RAG/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Qdrant/i)).not.toBeInTheDocument();
    });

    it('hiển thị trích dẫn [S1], [S2] gắn liên kết neo vào danh mục tài liệu tham khảo y khoa', () => {
      renderWithProviders(
        <AssistantBubble
          m={mockAssistantMsg}
          sessionId={12}
          question="Tập gym ăn chay thế nào?"
        />
      );

      const cite1 = screen.getByRole('link', { name: '[S1]' });
      expect(cite1).toHaveAttribute('href', '#src-2-1');
      expect(cite1).toHaveAttribute('title', 'Đậu phụ áp chảo xốt nấm');

      expect(screen.getByText('Tài liệu tham khảo y khoa')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ áp chảo xốt nấm')).toBeInTheDocument();
      expect(screen.getByText('Hướng dẫn hấp thụ leucine thực vật')).toBeInTheDocument();
    });

    it('hiển thị phần gợi ý công thức thuần chay tương thích kèm đường dẫn chi tiết', () => {
      renderWithProviders(
        <AssistantBubble
          m={mockAssistantMsg}
          sessionId={12}
          question="Tập gym ăn chay thế nào?"
        />
      );

      expect(screen.getByText('Gợi ý công thức thuần chay tương thích')).toBeInTheDocument();
      expect(screen.getByText('Salad đậu gà sốt mè')).toBeInTheDocument();
      expect(screen.getByText(/Thời gian nấu: 15 phút/i)).toBeInTheDocument();

      const recipeLink = screen.getByRole('link', { name: /Xem công thức/i });
      expect(recipeLink).toHaveAttribute('href', PATHS.RECIPES.DETAIL(202));
    });

    it('hiển thị lời miễn trừ y khoa và widget đánh giá sao', () => {
      renderWithProviders(
        <AssistantBubble
          m={mockAssistantMsg}
          sessionId={12}
          question="Tập gym ăn chay thế nào?"
        />
      );

      expect(
        screen.getByText('Lưu ý: Lời khuyên chỉ mang tính tham khảo dinh dưỡng tổng quát.')
      ).toBeInTheDocument();
      expect(screen.getByText('Câu trả lời có hữu ích không?')).toBeInTheDocument();
    });

    it('chuyển đổi cú pháp Markdown **in đậm** và *in nghiêng* thành các thẻ HTML tương ứng', () => {
      const markdownMsg: ChatMessage = {
        messageId: 3,
        senderType: 'ASSISTANT',
        content: '1. **Canh nấm đậu phụ** (khoảng 25 phút): Món này *thanh đạm* [S1].',
        createdAt: '2026-10-13T10:00:10Z',
        sources: [{ type: 'RECIPE', id: 101, title: 'Canh nấm' }],
      };

      renderWithProviders(
        <AssistantBubble
          m={markdownMsg}
          sessionId={12}
          question="Món canh chay?"
        />
      );

      const boldElement = screen.getByText('Canh nấm đậu phụ');
      expect(boldElement.tagName).toBe('STRONG');
      expect(boldElement).toHaveClass('font-semibold');

      const italicElement = screen.getByText('thanh đạm');
      expect(italicElement.tagName).toBe('EM');
      expect(italicElement).toHaveClass('italic');

      // Đảm bảo không còn ký tự dấu hoa thị raw trên màn hình
      expect(screen.queryByText(/\*\*Canh nấm đậu phụ\*\*/)).not.toBeInTheDocument();
    });

    it('chuyển đổi danh sách gạch đầu dòng hoa thị * **In đậm** mà không để lại dấu hoa thị raw', () => {
      const bulletMsg: ChatMessage = {
        messageId: 4,
        senderType: 'ASSISTANT',
        content: '*   **Thực phẩm đậm đặc năng lượng**: Bơ hạt, các loại hạt [S1].\n*   **Đảm bảo đủ đạm**: Đậu phụ và tempeh.',
        createdAt: '2026-10-13T10:00:15Z',
        sources: [{ type: 'RECIPE', id: 101, title: 'Bơ hạt' }],
      };

      renderWithProviders(
        <AssistantBubble
          m={bulletMsg}
          sessionId={12}
          question="Tăng cân chay?"
        />
      );

      const boldItem1 = screen.getByText('Thực phẩm đậm đặc năng lượng');
      expect(boldItem1.tagName).toBe('STRONG');
      expect(boldItem1).toHaveClass('font-semibold');

      const boldItem2 = screen.getByText('Đảm bảo đủ đạm');
      expect(boldItem2.tagName).toBe('STRONG');
      expect(boldItem2).toHaveClass('font-semibold');

      // Không còn dấu * trần trụi
      expect(screen.queryByText(/\*/)).not.toBeInTheDocument();
    });
  });
});


