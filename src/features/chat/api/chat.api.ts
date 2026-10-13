import http from '@/api/http';
import type { ApiEnvelope, PageMeta } from '@/api/types';
import type {
  ChatMessage,
  ChatSession,
  ChatSessionItem,
  ContextType,
  MessagesPage,
  SendResult,
} from '../types/chat.types';
import type { SurveyForm } from '../schemas/chat.schema';

export const AI_TIMEOUT_MS = 25000;

/** FN-CHAT-01 — POST /api/v1/chat/sessions (Khách & Thành viên) */
export async function createChatSession(body: {
  title?: string;
  contextType?: ContextType | string;
}): Promise<ChatSession> {
  const res = await http.post<ApiEnvelope<ChatSession>>('/chat/sessions', body);
  return res.data.data;
}

/** FN-CHAT-03 — GET /api/v1/chat/sessions (Chỉ Thành viên / VIP) */
export async function listChatSessions(
  page = 1,
  size = 50
): Promise<{ items: ChatSessionItem[]; meta: PageMeta }> {
  const res = await http.get<ApiEnvelope<ChatSessionItem[]>>('/chat/sessions', {
    params: { page, size },
  });
  return {
    items: res.data.data ?? [],
    meta: res.data.meta ?? { page, size, total: res.data.data?.length ?? 0 },
  };
}

/** FN-CHAT-02 — POST /api/v1/chat/sessions/{id}/messages (RAG qua AI service, timeout 25s) */
export async function sendChatMessage(sessionId: number, message: string): Promise<SendResult> {
  const res = await http.post<ApiEnvelope<SendResult>>(
    `/chat/sessions/${sessionId}/messages`,
    { message },
    { timeout: AI_TIMEOUT_MS }
  );
  return res.data.data;
}

/** FN-CHAT-04 — GET /api/v1/chat/sessions/{id}/messages?before=&size= */
export async function listChatMessages(
  sessionId: number,
  before?: number,
  size = 30
): Promise<MessagesPage> {
  const res = await http.get<ApiEnvelope<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`, {
    params: { before, size },
  });
  const data = res.data.data ?? [];
  const items = [...data].sort((a, b) => a.messageId - b.messageId);
  const meta = res.data.meta as (PageMeta & { hasMore?: boolean }) | undefined;
  const hasMore = meta?.hasMore ?? data.length >= size;
  return {
    items,
    hasMore,
    oldestId: items.length > 0 ? items[0].messageId : null,
  };
}

/** FN-CHAT-05 — DELETE /api/v1/chat/sessions/{id} */
export async function deleteChatSession(sessionId: number): Promise<void> {
  await http.delete(`/chat/sessions/${sessionId}`);
}

/** FN-CHAT-06 — POST /api/v1/surveys */
export async function createSurvey(body: SurveyForm): Promise<{ surveyId: number }> {
  const res = await http.post<ApiEnvelope<{ surveyId: number }>>('/surveys', {
    ...body,
    feedbackContent: body.feedbackContent || undefined,
  });
  return res.data.data;
}
