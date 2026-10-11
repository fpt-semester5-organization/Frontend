import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export type SignupPromptReason = 'guest' | 'quota' | 'personalization';

interface UiState {
  toasts: Toast[];
  signupPrompt: { open: boolean; reason: SignupPromptReason; returnUrl: string };
  serviceBanner: string | null;
  pushToast: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
  openSignupPrompt: (reason?: SignupPromptReason) => void;
  closeSignupPrompt: () => void;
  setServiceBanner: (message: string | null) => void;
}

let seq = 0;

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  signupPrompt: { open: false, reason: 'guest', returnUrl: '/' },
  serviceBanner: null,
  pushToast: (kind, message) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    window.setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  // Lưu `returnUrl` để quay lại đúng trang sau khi đăng nhập/đăng ký (spec 13, mục 1.1)
  openSignupPrompt: (reason = 'guest') =>
    set({ signupPrompt: { open: true, reason, returnUrl: window.location.pathname + window.location.search } }),
  closeSignupPrompt: () => set((s) => ({ signupPrompt: { ...s.signupPrompt, open: false } })),
  setServiceBanner: (serviceBanner) => set({ serviceBanner }),
}));

/** Gọi được ngoài React (interceptor, v.v.). */
export const toast = {
  success: (m: string) => useUiStore.getState().pushToast('success', m),
  error: (m: string) => useUiStore.getState().pushToast('error', m),
  warning: (m: string) => useUiStore.getState().pushToast('warning', m),
  info: (m: string) => useUiStore.getState().pushToast('info', m),
};
