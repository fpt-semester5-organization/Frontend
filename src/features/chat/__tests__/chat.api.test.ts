import { describe, expect, it, vi, beforeEach } from 'vitest';
import http from '@/api/http';
import {
  AI_TIMEOUT_MS,
  createChatSession,
  createSurvey,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  sendChatMessage,
} from '../api/chat.api';

describe('Chat API Service (chat.api.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createChatSession: gọi đúng endpoint và trả về dữ liệu session', async () => {
    const postSpy = vi.spyOn(http, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          sessionId: 101,
          title: 'Tư vấn đạm chay',
          contextType: 'NUTRITION_CONSULTATION',
          startedAt: '2026-10-13T10:00:00Z',
        },
      },
    });

    const result = await createChatSession({ title: 'Tư vấn đạm chay' });

    expect(postSpy).toHaveBeenCalledWith('/chat/sessions', { title: 'Tư vấn đạm chay' });
    expect(result.sessionId).toBe(101);
    expect(result.title).toBe('Tư vấn đạm chay');
  });

  it('listChatSessions: gửi kèm page và size, trả về danh sách phiên', async () => {
    const getSpy = vi.spyOn(http, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            sessionId: 1,
            title: 'Phiên 1',
            lastMessagePreview: 'Xin chào',
            updatedAt: '2026-10-13T10:00:00Z',
          },
        ],
        meta: { page: 1, size: 50, total: 1 },
      },
    });

    const result = await listChatSessions(1, 50);

    expect(getSpy).toHaveBeenCalledWith('/chat/sessions', {
      params: { page: 1, size: 50 },
    });
    expect(result.items.length).toBe(1);
    expect(result.meta.total).toBe(1);
  });

  it('sendChatMessage: gọi với timeout 25s (AI_TIMEOUT_MS) theo đặc tả FN-CHAT-02', async () => {
    const postSpy = vi.spyOn(http, 'post').mockResolvedValue({
      data: {
        success: true,
        data: {
          message: {
            messageId: 11,
            senderType: 'ASSISTANT',
            content: 'Từ đậu nành và tempeh.',
            createdAt: '2026-10-13T10:00:02Z',
          },
          quota: { limit: 20, used: 3, remaining: 17 },
        },
      },
    });

    const result = await sendChatMessage(101, 'Nạp đạm từ đâu?');

    expect(postSpy).toHaveBeenCalledWith(
      '/chat/sessions/101/messages',
      { message: 'Nạp đạm từ đâu?' },
      { timeout: AI_TIMEOUT_MS }
    );
    expect(result.message.messageId).toBe(11);
    expect(result.message.content).toBe('Từ đậu nành và tempeh.');
    expect(result.quota?.remaining).toBe(17);
  });

  it('listChatMessages: tự động sắp xếp tin nhắn tăng dần theo messageId', async () => {
    const getSpy = vi.spyOn(http, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [
          { messageId: 30, senderType: 'ASSISTANT', content: 'Tin 2', createdAt: '2026-10-13T10:02:00Z' },
          { messageId: 20, senderType: 'USER', content: 'Tin 1', createdAt: '2026-10-13T10:01:00Z' },
        ],
        meta: { page: 1, size: 30, total: 2, hasMore: false },
      },
    });

    const result = await listChatMessages(101, undefined, 30);

    expect(getSpy).toHaveBeenCalledWith('/chat/sessions/101/messages', {
      params: { before: undefined, size: 30 },
    });
    // Đã được sort: 20 trước, 30 sau
    expect(result.items[0].messageId).toBe(20);
    expect(result.items[1].messageId).toBe(30);
    expect(result.oldestId).toBe(20);
    expect(result.hasMore).toBe(false);
  });

  it('deleteChatSession: gọi DELETE session/{id}', async () => {
    const delSpy = vi.spyOn(http, 'delete').mockResolvedValue({ data: { success: true } });

    await deleteChatSession(101);

    expect(delSpy).toHaveBeenCalledWith('/chat/sessions/101');
  });

  it('createSurvey: gọi POST /surveys với dữ liệu đánh giá', async () => {
    const postSpy = vi.spyOn(http, 'post').mockResolvedValue({
      data: { success: true, data: { surveyId: 88 } },
    });

    const result = await createSurvey({
      chatSessionId: 101,
      contextQuestion: 'Cách nạp đạm?',
      ratingScore: 5,
      feedbackContent: 'Rất tốt',
    });

    expect(postSpy).toHaveBeenCalledWith('/surveys', {
      chatSessionId: 101,
      contextQuestion: 'Cách nạp đạm?',
      ratingScore: 5,
      feedbackContent: 'Rất tốt',
    });
    expect(result.surveyId).toBe(88);
  });
});
