import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { useAuthStore } from '@/stores/auth.store';
import {
  createChatSession,
  createSurvey,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  sendChatMessage,
} from '../api/chat.api';
import type {
  ChatMessage,
  ChatQuota,
  ContextType,
  MessagesPage,
} from '../types/chat.types';
import type { SurveyForm } from '../schemas/chat.schema';

export const chatKeys = {
  sessions: ['chat', 'sessions'] as const,
  messages: (id: number) => ['chat', 'messages', id] as const,
  quota: ['chat', 'quota'] as const,
};

type MessagesData = InfiniteData<MessagesPage, unknown>;

/** Danh sách phiên — chỉ Thành viên (Khách gọi sẽ nhận 403 và mở popup). */
export function useChatSessions() {
  const authed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.sessions,
    queryFn: () => listChatSessions(1, 50),
    enabled: authed,
  });
}

/** Lịch sử tin nhắn: trang đầu là mới nhất; fetchNextPage tải tin cũ hơn bằng before. */
export function useChatMessages(sessionId: number | null) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(sessionId ?? 0),
    queryFn: ({ pageParam }) => listChatMessages(sessionId!, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last?.hasMore && last.oldestId ? last.oldestId : undefined),
    enabled: !!sessionId,
    retry: false,
  });
}

/** Gộp các trang thành mảng tin nhắn theo thứ tự thời gian (cũ -> mới). */
export function flattenMessages(data: MessagesData | undefined): ChatMessage[] {
  if (!data) return [];
  const all = [...data.pages].reverse().flatMap((p) => p.items);
  const seen = new Set<number>();
  return all.filter((m) => (seen.has(m.messageId) ? false : (seen.add(m.messageId), true)));
}

/** Hạn mức của Thành viên: lấy từ quota của lần gửi gần nhất. */
export function useChatQuota() {
  return useQuery<ChatQuota | null>({
    queryKey: chatKeys.quota,
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { title?: string; contextType?: ContextType | string }) => createChatSession(v),
    retry: false,
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.sessions }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { sessionId: number; message: string }) =>
      sendChatMessage(v.sessionId, v.message),
    retry: false,
    onSuccess: (res) => {
      const isGuest = !useAuthStore.getState().isAuthenticated;
      if (res.quota) {
        if (isGuest) {
          mergeGuestQuota({ ai: res.quota }, true);
        } else {
          qc.setQueryData(chatKeys.quota, res.quota);
        }
      }
      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

/** Thêm tin (người dùng + trợ lý) vào cache của phiên. */
export function appendMessages(
  qc: ReturnType<typeof useQueryClient>,
  sessionId: number,
  msgs: ChatMessage[]
) {
  qc.setQueryData<MessagesData>(chatKeys.messages(sessionId), (prev) => {
    if (!prev) {
      return {
        pages: [{ items: msgs, hasMore: false, oldestId: msgs[0]?.messageId ?? null }],
        pageParams: [undefined],
      };
    }
    const [first, ...rest] = prev.pages;
    return {
      ...prev,
      pages: [{ ...first, items: [...first.items, ...msgs] }, ...rest],
    };
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteChatSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.sessions }),
  });
}

export function useCreateSurvey() {
  return useMutation({
    mutationFn: (v: SurveyForm) => createSurvey(v),
    retry: false,
  });
}
