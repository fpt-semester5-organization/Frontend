import React, { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MEDICAL_DISCLAIMER, QUOTA } from '@/constants/quota';
import { formatDateTime } from '@/lib/format';
import { notifySuccess, notifyApiError, getErrorMessage } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { useUiStore } from '@/stores/ui.store';
import { AssistantBubble, UserBubble } from '../components/MessageBubble';
import { QuotaMeter } from '../components/QuotaMeter';
import {
  appendMessages,
  flattenMessages,
  useChatMessages,
  useChatQuota,
  useChatSessions,
  useCreateSession,
  useDeleteSession,
  useSendMessage,
} from '../hooks/useChat';
import { MESSAGE_MAX, messageSchema } from '../schemas/chat.schema';
import type { ChatMessage, ContextType } from '../types/chat.types';

const SHORTCUTS = [
  {
    label: 'Dị ứng & Kiêng cữ',
    desc: 'Cài đặt thực phẩm cần tránh',
    to: PATHS.ME.DIETARY_PREFERENCES,
    icon: 'no_food',
  },
  {
    label: 'Mục tiêu thể trạng',
    desc: 'Cập nhật cân nặng, calo mục tiêu',
    to: PATHS.ME.HEALTH,
    icon: 'monitor_heart',
  },
  {
    label: 'Món chay đã lưu',
    desc: 'Xem các công thức bạn đã lưu',
    to: PATHS.ME.RECIPES,
    icon: 'bookmark',
  },
];


interface BentoPrompt {
  id: string;
  category: string;
  icon: string;
  title: string;
  prompt: string;
  tagColor: string;
}

const BENTO_PROMPTS: BentoPrompt[] = [
  {
    id: 'protein',
    category: 'Đạm thực vật',
    icon: 'grain',
    title: 'Ăn chay kết hợp đạm thế nào?',
    prompt: 'Tôi ăn thuần chay thì nên phối hợp thực phẩm thế nào để đủ đạm và axit amin thiết yếu?',
    tagColor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    id: 'dinner',
    category: 'Thực đơn nhanh',
    icon: 'timer',
    title: 'Bữa tối 20 phút đủ chất',
    prompt: 'Gợi ý thực đơn tối thuần chay nấu dưới 30 phút với đậu phụ, nấm và rau xanh',
    tagColor: 'text-secondary bg-secondary/10 border-secondary/20',
  },
  {
    id: 'safety',
    category: 'Kiểm tra phụ gia',
    icon: 'fact_check',
    title: 'Phụ gia thực phẩm chay',
    prompt: 'Phụ gia E471 và E621 có phải nguồn gốc thuần chay không?',
    tagColor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    id: 'prep',
    category: 'Mẹo chế biến',
    icon: 'science',
    title: 'Cách nấu đậu không đầy bụng',
    prompt: 'Cách ngâm và luộc đậu gà để không bị đầy hơi và dễ tiêu hóa hơn?',
    tagColor: 'text-secondary bg-secondary/10 border-secondary/20',
  },
];

function IconBtn({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessionId } = useParams();
  const routeId =
    sessionId && Number.isInteger(Number(sessionId)) && Number(sessionId) > 0
      ? Number(sessionId)
      : null;

  const user = useAuthStore((s) => s.user);
  const authed = useAuthStore((s) => s.isAuthenticated);
  const isVip = !!user?.isVip;
  const guestAi = useGuestStore((s) => s.quota?.ai);
  const memberQuota = useChatQuota();
  const openSignupPrompt = useUiStore((s) => s.openSignupPrompt);

  const sessions = useChatSessions();
  const messagesQ = useChatMessages(routeId);
  const createSession = useCreateSession();
  const sendMsg = useSendMessage();
  const del = useDeleteSession();

  const [histOpen, setHistOpen] = useState(true);
  const [profOpen, setProfOpen] = useState(true);

  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const contextType: ContextType = 'NUTRITION_CONSULTATION';
  const [draftId, setDraftId] = useState<number | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [lastSentText, setLastSentText] = useState<string>('');
  const [sendError, setSendError] = useState<{
    message: string;
    retryable: boolean;
    unsafe: boolean;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeId = routeId ?? draftId;
  const messages = useMemo(() => flattenMessages(messagesQ.data), [messagesQ.data]);
  const sending = createSession.isPending || sendMsg.isPending;

  useEffect(() => {
    setSendError(null);
    setInputError(null);
    if (routeId) setDraftId(null);
  }, [routeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pendingText, sendError]);

  const limit = !authed
    ? (guestAi?.limit ?? QUOTA.guest.ai)
    : (memberQuota.data?.limit ?? (isVip ? QUOTA.chatPerDay.vip : QUOTA.chatPerDay.free));
  const used = !authed ? (guestAi?.used ?? 0) : (memberQuota.data?.used ?? 0);
  const unit = authed ? 'câu' : 'lượt';
  const quotaLabel = authed ? 'Lượt hỏi hôm nay' : 'Lượt dùng thử miễn phí';

  const send = async (raw?: string) => {
    if (sending) return;
    const textCandidate = raw ?? (input.trim() || lastSentText);
    const parsed = messageSchema.safeParse({ message: textCandidate });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message || 'Câu hỏi không hợp lệ.');
      return;
    }

    const text = parsed.data.message;
    setLastSentText(text);
    setInputError(null);
    setSendError(null);
    setPendingText(text);

    let sid = routeId ?? draftId;
    try {
      if (!sid) {
        const s = await createSession.mutateAsync({
          title: text.slice(0, 100),
          contextType,
        });
        sid = s.sessionId;
        setDraftId(sid);
      }

      const res = await sendMsg.mutateAsync({ sessionId: sid, message: text });
      const now = new Date().toISOString();
      const userMsg: ChatMessage = {
        messageId: -Date.now(),
        senderType: 'USER',
        content: text,
        createdAt: now,
      };

      appendMessages(qc, sid, [userMsg, res.message]);
      setDraftId(null);
      setInput('');
      if (!routeId) {
        navigate(PATHS.CHAT.SESSION(sid), { replace: true });
      }
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        errorCode?: string;
        message?: string;
      };
      const code = errorObj.errorCode || '';
      const message = errorObj.message || getErrorMessage(err);

      if (errorObj.status === 403 && (code.startsWith('ERR_GUEST_') || code === 'ERR_QUOTA_AI_EXCEEDED')) {
        if (!authed) {
          openSignupPrompt();
          return;
        }
      }

      if (code === 'ERR_CHAT_SESSION_NOT_FOUND') {
        setDraftId(null);
      }

      const retryable =
        errorObj.status === 503 ||
        code === 'ERR_AI_CIRCUIT_OPEN' ||
        code === 'ERR_EXT_QDRANT_UNAVAILABLE' ||
        errorObj.status === 0;

      setSendError({
        message,
        unsafe: code === 'ERR_CHAT_UNSAFE_CONTENT',
        retryable,
      });
    } finally {
      setPendingText(null);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleNewChat = () => {
    setDraftId(null);
    setInput('');
    setSendError(null);
    navigate(PATHS.CHAT.ROOT);
  };

  const handleDeleteSession = () => {
    if (!routeId) return;
    del.mutate(routeId, {
      onSuccess: () => {
        setConfirmDelete(false);
        qc.removeQueries({ queryKey: ['chat', 'messages', routeId] });
        notifySuccess('Đã xóa phiên hội thoại thành công.');
        navigate(PATHS.CHAT.ROOT);
      },
      onError: (err) => {
        setConfirmDelete(false);
        notifyApiError(err);
      },
    });
  };

  return (
    <div className="relative flex h-[calc(100dvh-72px)] w-full overflow-hidden bg-surface">
      {/* 1. Panel Trái: Lịch sử hội thoại & Hạn mức AI */}
      <aside
        aria-label="Lịch sử chat"
        className={`flex shrink-0 flex-col bg-surface-container-low transition-[width] duration-300 max-lg:absolute max-lg:inset-y-0 max-lg:z-20 max-lg:shadow-xl ${
          histOpen ? 'w-72' : 'w-14 max-lg:hidden'
        }`}
      >
        {histOpen ? (
          <>
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
              <span className="font-headline-sm text-headline-sm text-on-surface">Lịch sử</span>
              <IconBtn icon="left_panel_close" label="Thu gọn lịch sử" onClick={() => setHistOpen(false)} />
            </div>

            <div className="p-3">
              <button
                type="button"
                id="btn-new-session"
                onClick={handleNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-label-md text-label-md text-on-primary transition hover:opacity-90 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Cuộc trò chuyện mới
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1" aria-label="Các phiên tư vấn">
              {!authed ? (
                <div className="p-3 text-center">
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Đăng nhập để lưu lại các câu trả lời và xem lại bất cứ lúc nào.
                  </p>
                  <button
                    type="button"
                    onClick={() => openSignupPrompt()}
                    className="mt-2 font-label-sm text-xs font-semibold text-primary hover:underline"
                  >
                    Đăng nhập ngay
                  </button>
                </div>
              ) : sessions.isPending ? (
                <div className="flex flex-col gap-2 p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-container" />
                  ))}
                </div>
              ) : sessions.isError ? (
                <div className="p-3 text-center text-xs text-error">
                  Không thể tải lịch sử.
                  <button
                    type="button"
                    onClick={() => void sessions.refetch()}
                    className="ml-1 underline font-medium"
                  >
                    Thử lại
                  </button>
                </div>
              ) : sessions.data?.items.length === 0 ? (
                <p className="p-3 text-center font-body-sm text-xs text-on-surface-variant">
                  Chưa có cuộc trò chuyện nào. Hãy chọn một câu hỏi gợi ý bên cạnh nhé!
                </p>
              ) : (
                sessions.data?.items.map((s) => (
                  <Link
                    key={s.sessionId}
                    to={PATHS.CHAT.SESSION(s.sessionId)}
                    title={s.lastMessagePreview ?? s.title}
                    className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 font-body-sm text-xs transition-all ${
                      s.sessionId === routeId
                        ? 'border-l-2 border-primary bg-primary/10 font-semibold text-primary shadow-2xs'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px] shrink-0 text-primary/80">
                      chat_bubble_outline
                    </span>
                    <span className="truncate flex-1">{s.title || 'Phiên tư vấn'}</span>
                  </Link>
                ))
              )}
            </nav>

            <div className="p-3">
              <QuotaMeter
                label={quotaLabel}
                used={used}
                limit={limit}
                unit={unit}
                isVip={isVip}
                isAuthenticated={authed}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <IconBtn icon="left_panel_open" label="Mở lịch sử" onClick={() => setHistOpen(true)} />
            <IconBtn icon="add" label="Phiên tư vấn mới" onClick={handleNewChat} />
          </div>
        )}
      </aside>

      {/* 2. Khung Chat Trung Tâm */}
      <section aria-label="Khung chat" className="flex min-w-0 flex-1 flex-col p-2 lg:p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          {/* Header trung tâm */}
          <header className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-2">
              <IconBtn
                icon="history"
                label="Lịch sử chat"
                onClick={() => setHistOpen(!histOpen)}
                className="lg:hidden"
              />
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
                </div>
                <div>
                  <h1 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">Cố vấn Dinh dưỡng Chay</h1>
                  <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-primary font-medium">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    Tham vấn dinh dưỡng chuẩn y khoa
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {routeId && authed && (
                <IconBtn
                  icon="delete"
                  label="Xóa phiên"
                  onClick={() => setConfirmDelete(true)}
                  className="hover:!text-error"
                />
              )}
              <IconBtn
                icon="badge"
                label="Hồ sơ & Lối tắt"
                onClick={() => setProfOpen(!profOpen)}
                className="lg:hidden"
              />
            </div>
          </header>

          {/* Vùng tin nhắn */}
          <div
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6"
            aria-live="polite"
          >
            {routeId && messagesQ.isPending ? (
              <div className="flex flex-col gap-4">
                <div className="h-12 w-2/3 self-end rounded-2xl bg-surface-container animate-pulse" />
                <div className="h-32 w-5/6 rounded-2xl bg-surface-container animate-pulse" />
              </div>
            ) : messages.length === 0 && !pendingText ? (
              <div className="m-auto flex w-full max-w-3xl flex-col gap-6 py-4">
                {/* Header dẫn nhập */}
                <div className="flex flex-col items-start text-left">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-label-sm text-xs font-semibold text-primary">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    Trợ lý Dinh dưỡng VeggieLife
                  </div>
                  <h2 className="mt-3 font-headline-sm text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    Bạn muốn tìm hiểu gì về dinh dưỡng hôm nay?
                  </h2>
                  <p className="mt-2 max-w-[58ch] font-body-md text-sm leading-relaxed text-on-surface-variant">
                    Giải đáp thắc mắc về chế độ ăn thuần chay, gợi ý món ăn đủ chất và cách chế biến khoa học.
                  </p>
                </div>

                {/* Bento Prompt Matrix: 4 khối tri thức thực dưỡng */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {BENTO_PROMPTS.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-label-sm text-[11px] font-semibold ${item.tagColor}`}
                          >
                            <span className="material-symbols-outlined text-[13px]">{item.icon}</span>
                            {item.category}
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-outline-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                            north_east
                          </span>
                        </div>
                        <h3 className="mt-2.5 font-headline-sm text-sm font-bold text-on-surface">
                          {item.title}
                        </h3>
                        <p className="mt-1 font-body-sm text-xs leading-relaxed text-on-surface-variant">
                          {item.prompt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                        <button
                          type="button"
                          onClick={() => setInput(item.prompt)}
                          className="font-label-sm text-[11px] text-on-surface-variant hover:text-primary transition"
                        >
                          Điền câu hỏi
                        </button>
                        <button
                          type="button"
                          onClick={() => void send(item.prompt)}
                          disabled={sending}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary px-2.5 py-1 font-label-sm text-xs font-semibold text-primary hover:text-on-primary transition active:scale-[0.98] disabled:opacity-40"
                        >
                          <span>Hỏi ngay</span>
                          <span className="material-symbols-outlined text-[13px]">send</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messagesQ.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => void messagesQ.fetchNextPage()}
                    disabled={messagesQ.isFetchingNextPage}
                    className="self-center rounded-full bg-surface-container px-3.5 py-1 font-label-sm text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                  >
                    {messagesQ.isFetchingNextPage ? 'Đang tải…' : 'Tải tin cũ hơn'}
                  </button>
                )}

                {messages.map((m, i) =>
                  m.senderType === 'USER' ? (
                    <UserBubble key={m.messageId} m={m} />
                  ) : (
                    <AssistantBubble
                      key={m.messageId}
                      m={m}
                      sessionId={activeId ?? 0}
                      question={
                        [...messages.slice(0, i)].reverse().find((x) => x.senderType === 'USER')
                          ?.content ?? ''
                      }
                    />
                  )
                )}

                {pendingText && (
                  <>
                    <div className="flex max-w-[90%] items-start justify-end gap-3 self-end sm:max-w-[80%]">
                      <div className="rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-on-primary opacity-80 shadow-xs">
                        <p className="whitespace-pre-wrap break-words font-body-md text-body-md leading-relaxed">
                          {pendingText}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 self-start rounded-2xl rounded-tl-none bg-surface-container-low px-4 py-3 font-body-sm text-xs text-on-surface-variant"
                      role="status"
                    >
                      <span className="material-symbols-outlined animate-spin text-[16px] text-primary">
                        progress_activity
                      </span>
                      Trợ lý đang tìm kiếm thông tin và chuẩn bị câu trả lời cho bạn…
                    </div>
                  </>
                )}

                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Banner thông báo lỗi gửi tin — Luôn hiển thị độc lập với danh sách tin nhắn */}
          {sendError && (
            <div
              className={`mx-3 mb-2 rounded-xl border p-3 shadow-xs sm:mx-4 ${
                sendError.unsafe
                  ? 'border-warning/30 bg-warning-container text-on-warning-container'
                  : 'border-error/30 bg-error-container text-on-error-container'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-label-md text-xs font-semibold sm:text-sm">
                  <span className="material-symbols-outlined text-[18px]">
                    {sendError.unsafe ? 'gpp_maybe' : 'error'}
                  </span>
                  {sendError.unsafe
                    ? 'Nội dung không phù hợp quy chuẩn'
                    : sendError.retryable
                    ? 'Dịch vụ AI tạm gián đoạn'
                    : 'Không thể gửi câu hỏi'}
                </span>
                <div className="flex items-center gap-2">
                  {sendError.retryable && (
                    <button
                      type="button"
                      onClick={() => void send(lastSentText)}
                      className="rounded-lg bg-surface-container-lowest px-2.5 py-1 font-label-sm text-xs font-bold text-on-surface shadow-xs transition hover:bg-surface-container active:scale-95"
                    >
                      Gửi lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    aria-label="Đóng thông báo lỗi"
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
              <p className="mt-1 font-body-sm text-xs opacity-90">{sendError.message}</p>
            </div>
          )}

          {/* Chân trang nhập tin */}
          <footer className="border-t border-outline-variant/30 bg-surface-container-low p-3 sm:p-4">
            <div
              className={`flex items-end rounded-2xl border bg-surface-container-lowest p-2 shadow-xs transition-all ${
                inputError
                  ? 'border-error ring-1 ring-error'
                  : 'border-outline-variant/30 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
              }`}
            >
              <textarea
                id="chat-textarea"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                onKeyDown={onKey}
                disabled={sending}
                aria-label="Câu hỏi cho trợ lý"
                aria-invalid={!!inputError}
                rows={1}
                maxLength={MESSAGE_MAX + 100}
                placeholder="Nhập câu hỏi của bạn về dinh dưỡng, món chay, cách nấu..."
                className="max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-1.5 font-body-md text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                id="btn-send"
                onClick={() => void send()}
                disabled={sending || input.trim().length === 0}
                aria-label="Gửi câu hỏi"
                className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xs transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {sending ? 'hourglass_top' : 'send'}
                </span>
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
              <p className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[13px] text-outline">info</span>
                {MEDICAL_DISCLAIMER}
              </p>
              <span
                className={`font-label-sm text-[11px] tabular-nums ${
                  input.length > MESSAGE_MAX ? 'text-error font-bold' : 'text-on-surface-variant'
                }`}
              >
                {input.length}/{MESSAGE_MAX}
              </span>
            </div>
            {inputError && (
              <p role="alert" className="mt-1 px-1 font-label-sm text-xs text-error">
                {inputError}
              </p>
            )}
          </footer>
        </div>
      </section>

      {/* 3. Panel Phải: Hồ sơ sức khỏe & Lối tắt điều hướng */}
      <aside
        aria-label="Hồ sơ và lối tắt"
        className={`flex shrink-0 flex-col bg-surface-container-low transition-[width] duration-300 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-xl ${
          profOpen ? 'w-80' : 'w-14 max-lg:hidden'
        }`}
      >
        {profOpen ? (
          <>
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
              <span className="font-headline-sm text-headline-sm text-on-surface">Hồ sơ & Lối tắt</span>
              <IconBtn icon="right_panel_close" label="Thu gọn hồ sơ" onClick={() => setProfOpen(false)} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
              {/* Thẻ Hồ sơ sức khỏe */}
              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 shadow-xs">
                {!authed ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[17px]">vital_signs</span>
                      </div>
                      <span className="font-label-md text-sm font-bold text-on-surface">
                        Hồ sơ Dinh dưỡng Cá nhân
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                      Đăng nhập để nhận lời khuyên dinh dưỡng phù hợp với thể trạng và mục tiêu sức khỏe của bạn.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-surface-container-low/70 p-2 border border-outline-variant/20">
                        <span className="text-on-surface-variant block text-[11px]">Kcalo mục tiêu</span>
                        <span className="font-mono font-bold text-primary">---- kcal</span>
                      </div>
                      <div className="rounded-lg bg-surface-container-low/70 p-2 border border-outline-variant/20">
                        <span className="text-on-surface-variant block text-[11px]">Mục tiêu</span>
                        <span className="font-semibold text-on-surface">Cân bằng</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openSignupPrompt()}
                      className="w-full rounded-xl bg-primary px-3 py-2 font-label-sm text-xs font-semibold text-on-primary shadow-xs transition hover:opacity-90 active:scale-[0.98]"
                    >
                      Đăng nhập thiết lập hồ sơ
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-sm font-bold text-on-primary shadow-xs">
                        {(user?.fullName || 'User')
                          .split(' ')
                          .slice(-2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-label-md text-sm font-semibold text-on-surface">
                            {user?.fullName}
                          </span>
                          {isVip && (
                            <span className="rounded bg-secondary/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-secondary">
                              VIP
                            </span>
                          )}
                        </div>
                        <span className="font-label-sm text-xs text-on-surface-variant">
                          Thành viên thực dưỡng VeggieLife
                        </span>
                      </div>
                      <Link
                        to={PATHS.ME.HEALTH}
                        className="font-label-sm text-xs font-semibold text-primary hover:underline"
                      >
                        Sửa
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-surface-container-low p-2">
                        <span className="text-on-surface-variant block text-[11px]">Mục tiêu</span>
                        <span className="font-semibold text-on-surface">Tăng cơ & Cân bằng</span>
                      </div>
                      <div className="rounded-lg bg-surface-container-low p-2">
                        <span className="text-on-surface-variant block text-[11px]">Kcalo mục tiêu</span>
                        <span className="font-mono font-bold text-primary">1850 kcal/ngày</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lối tắt thao tác nhanh */}
              <div className="flex flex-col gap-1.5">
                <span className="px-1 font-label-sm text-xs font-semibold text-on-surface-variant">
                  Tính năng hữu ích
                </span>
                {SHORTCUTS.map((s) => (
                  <Link
                    key={s.label}
                    to={s.to}
                    onClick={(e) => {
                      if (!authed) {
                        e.preventDefault();
                        openSignupPrompt();
                      }
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 !no-underline transition hover:border-primary/40 hover:bg-surface-container-lowest hover:shadow-xs"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-on-primary">
                      <span className="material-symbols-outlined text-[19px] !no-underline">{s.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1 !no-underline">
                      <span className="block font-label-md text-sm font-semibold text-on-surface !no-underline">
                        {s.label}
                      </span>
                      <span className="block font-body-sm text-[11px] text-on-surface-variant truncate !no-underline">
                        {s.desc}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline-variant transition-transform group-hover:translate-x-1 group-hover:text-primary !no-underline">
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <IconBtn icon="right_panel_open" label="Mở hồ sơ" onClick={() => setProfOpen(true)} />
            {SHORTCUTS.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                title={s.label}
                onClick={(e) => {
                  if (!authed) {
                    e.preventDefault();
                    openSignupPrompt();
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container !no-underline"
              >
                <span className="material-symbols-outlined text-[20px] !no-underline">{s.icon}</span>
              </Link>
            ))}
          </div>
        )}
      </aside>

      {/* Hộp xác nhận xóa phiên */}
      <ConfirmDialog
        show={confirmDelete}
        title="Xóa phiên hội thoại?"
        message="Phiên hội thoại và toàn bộ tin nhắn liên quan sẽ bị xóa vĩnh viễn. Các đánh giá câu trả lời đã gửi vẫn được lưu lại."
        confirmLabel={del.isPending ? 'Đang xóa…' : 'Xóa phiên'}
        danger
        loading={del.isPending}
        onConfirm={handleDeleteSession}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};

export default ChatPage;
