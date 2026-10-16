import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { appendMessages, chatKeys, flattenMessages } from '../hooks/useChat';
import type { ChatMessage, MessagesPage } from '../types/chat.types';

describe('Chat Query Hooks & Caching Utilities (useChat.ts)', () => {
  it('chatKeys: sinh đúng cấu trúc queryKey chuẩn cho React Query', () => {
    expect(chatKeys.sessions).toEqual(['chat', 'sessions']);
    expect(chatKeys.messages(42)).toEqual(['chat', 'messages', 42]);
    expect(chatKeys.quota).toEqual(['chat', 'quota']);
  });

  describe('flattenMessages', () => {
    it('trả về mảng rỗng khi data là undefined', () => {
      expect(flattenMessages(undefined)).toEqual([]);
    });

    it('gộp các trang theo đúng thứ tự thời gian cũ -> mới và loại bỏ tin nhắn trùng lặp id', () => {
      const page1: MessagesPage = {
        items: [
          { messageId: 3, senderType: 'USER', content: 'C3', createdAt: '3' },
          { messageId: 4, senderType: 'ASSISTANT', content: 'C4', createdAt: '4' },
        ],
        hasMore: true,
        oldestId: 3,
      };

      const page2: MessagesPage = {
        items: [
          { messageId: 1, senderType: 'USER', content: 'C1', createdAt: '1' },
          { messageId: 2, senderType: 'ASSISTANT', content: 'C2', createdAt: '2' },
          { messageId: 3, senderType: 'USER', content: 'C3 trùng', createdAt: '3' },
        ],
        hasMore: false,
        oldestId: 1,
      };

      // infinite data pages: [page1 (mới nhất), page2 (cũ hơn)]
      const infiniteData = {
        pages: [page1, page2],
        pageParams: [undefined, 3],
      };

      const flattened = flattenMessages(infiniteData);

      expect(flattened.map((m) => m.messageId)).toEqual([1, 2, 3, 4]);
      expect(flattened.length).toBe(4);
    });
  });

  describe('appendMessages', () => {
    it('khởi tạo dữ liệu cache khi chưa có trang nào', () => {
      const qc = new QueryClient();
      const newMsgs: ChatMessage[] = [
        { messageId: 10, senderType: 'USER', content: 'Câu hỏi mới', createdAt: '10' },
        { messageId: 11, senderType: 'ASSISTANT', content: 'Trả lời mới', createdAt: '11' },
      ];

      appendMessages(qc, 99, newMsgs);

      const cached = qc.getQueryData<{ pages: MessagesPage[] }>(chatKeys.messages(99));
      expect(cached).toBeDefined();
      expect(cached?.pages[0].items).toEqual(newMsgs);
      expect(cached?.pages[0].oldestId).toBe(10);
    });

    it('nối thêm tin nhắn vào trang đầu tiên khi cache đã tồn tại', () => {
      const qc = new QueryClient();
      const initialMsg: ChatMessage = {
        messageId: 1,
        senderType: 'USER',
        content: 'Ban đầu',
        createdAt: '1',
      };

      qc.setQueryData(chatKeys.messages(99), {
        pages: [{ items: [initialMsg], hasMore: false, oldestId: 1 }],
        pageParams: [undefined],
      });

      const appended: ChatMessage[] = [
        { messageId: 2, senderType: 'ASSISTANT', content: 'Nối thêm', createdAt: '2' },
      ];

      appendMessages(qc, 99, appended);

      const cached = qc.getQueryData<{ pages: MessagesPage[] }>(chatKeys.messages(99));
      expect(cached?.pages[0].items.length).toBe(2);
      expect(cached?.pages[0].items[1].content).toBe('Nối thêm');
    });
  });
});
