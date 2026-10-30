import { create } from 'zustand';
import { cleanUserMessage } from '@/lib/userMessage';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';
export type ToastKind = 'success' | 'error' | 'warning' | 'info';

/** Nút dẫn trang kèm toast, ví dụ "Xem kết quả" khi bóc tách video xong. */
export interface ToastAction {
  label: string;
  to: string;
}

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

export type Toast = ToastItem;

/** browse: Khách lướt tới mục thứ N của bảng tin (BR-GUEST-01), không phải bị chặn thao tác. */
export type SignupPromptReason = 'guest' | 'quota' | 'personalization' | 'browse';

interface UiState {
  toasts: ToastItem[];
  signupPrompt: { open: boolean; reason: SignupPromptReason; returnUrl: string };
  serviceBanner: string | null;
  bannedModal: { open: boolean; message: string };
  pushToast: (variantOrKind: ToastVariant | ToastKind, message: string, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
  openSignupPrompt: (arg?: SignupPromptReason | string) => void;
  closeSignupPrompt: () => void;
  setServiceBanner: (message: string | null) => void;
  openBannedModal: (message?: string) => void;
  closeBannedModal: () => void;
}

let seq = 0;

/** Thời gian hiển thị: toast có nút dẫn trang giữ lâu hơn để người dùng kịp bấm. */
const toastDuration = (variant: ToastVariant, action?: ToastAction) => (action ? 10000 : variant === 'danger' ? 7000 : 4500);

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  signupPrompt: { open: false, reason: 'guest', returnUrl: '/' },
  serviceBanner: null,
  bannedModal: { open: false, message: '' },
  pushToast: (variantOrKind, message, action) => {
    const id = ++seq;
    const variant: ToastVariant = variantOrKind === 'error' ? 'danger' : variantOrKind;
    const kind: ToastKind = variantOrKind === 'danger' ? 'error' : variantOrKind;
    // Lớp chặn cuối (UI-4): bỏ mã tham chiếu trong câu server; câu kỹ thuật thô thì thay bằng câu chung.
    const text = cleanUserMessage(message) || (variant === 'danger' || variant === 'warning' ? 'Đã có lỗi xảy ra, vui lòng thử lại.' : message);
    // Nhiều request lỗi cùng lúc (kể cả lần tự thử lại của React Query) không chồng nhiều toast giống hệt nhau.
    if (get().toasts.some((t) => t.variant === variant && t.message === text)) return;
    set((s) => ({ toasts: [...s.toasts, { id, variant, kind, message: text, action }] }));
    window.setTimeout(() => get().dismissToast(id), toastDuration(variant, action));
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openSignupPrompt: (arg) => {
    const isUrl = typeof arg === 'string' && (arg.startsWith('/') || arg.startsWith('http'));
    const returnUrl = isUrl ? arg : window.location.pathname + window.location.search;
    const reason: SignupPromptReason = !isUrl && arg ? (arg as SignupPromptReason) : 'guest';
    set({ signupPrompt: { open: true, reason, returnUrl } });
  },
  closeSignupPrompt: () => set((s) => ({ signupPrompt: { ...s.signupPrompt, open: false } })),
  setServiceBanner: (serviceBanner) => set({ serviceBanner }),
  openBannedModal: (message = 'Tài khoản của bạn đã bị khóa bởi Quản trị viên') =>
    set({ bannedModal: { open: true, message } }),
  closeBannedModal: () => set((s) => ({ bannedModal: { ...s.bannedModal, open: false } })),
}));

/** Gọi được ngoài React (interceptor, v.v.). */
export const toast = {
  success: (m: string) => useUiStore.getState().pushToast('success', m),
  error: (m: string) => useUiStore.getState().pushToast('danger', m),
  warning: (m: string) => useUiStore.getState().pushToast('warning', m),
  info: (m: string) => useUiStore.getState().pushToast('info', m),
};
