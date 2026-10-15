import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';
export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  kind: ToastKind;
  message: string;
}

export type Toast = ToastItem;

export type SignupPromptReason = 'guest' | 'quota' | 'personalization';

interface UiState {
  toasts: ToastItem[];
  signupPrompt: { open: boolean; reason: SignupPromptReason; returnUrl: string };
  serviceBanner: string | null;
  pushToast: (variantOrKind: ToastVariant | ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
  openSignupPrompt: (arg?: SignupPromptReason | string) => void;
  closeSignupPrompt: () => void;
  setServiceBanner: (message: string | null) => void;
}

let seq = 0;

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  signupPrompt: { open: false, reason: 'guest', returnUrl: '/' },
  serviceBanner: null,
  pushToast: (variantOrKind, message) => {
    const id = ++seq;
    const variant: ToastVariant = variantOrKind === 'error' ? 'danger' : variantOrKind;
    const kind: ToastKind = variantOrKind === 'danger' ? 'error' : variantOrKind;
    set((s) => ({ toasts: [...s.toasts, { id, variant, kind, message }] }));
    window.setTimeout(() => get().dismissToast(id), 4500);
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
}));

/** Gọi được ngoài React (interceptor, v.v.). */
export const toast = {
  success: (m: string) => useUiStore.getState().pushToast('success', m),
  error: (m: string) => useUiStore.getState().pushToast('danger', m),
  warning: (m: string) => useUiStore.getState().pushToast('warning', m),
  info: (m: string) => useUiStore.getState().pushToast('info', m),
};
