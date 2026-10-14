import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

/** Nút dẫn trang kèm toast, ví dụ "Xem kết quả" khi bóc tách video xong. */
export interface ToastAction {
  label: string;
  to: string;
}

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
}

interface UiState {
  /** SignupPromptModal: mời Khách đăng ký/đăng nhập và quay lại returnUrl (BR-GUEST-AUTH-01). */
  signupPrompt: { open: boolean; returnUrl: string };
  toasts: ToastItem[];
  openSignupPrompt: (returnUrl?: string) => void;
  closeSignupPrompt: () => void;
  pushToast: (variant: ToastVariant, message: string, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
}

let nextToastId = 1;

const currentUrl = () => `${window.location.pathname}${window.location.search}`;

export const useUiStore = create<UiState>((set) => ({
  signupPrompt: { open: false, returnUrl: '/' },
  toasts: [],
  openSignupPrompt: (returnUrl) =>
    set({ signupPrompt: { open: true, returnUrl: returnUrl ?? currentUrl() } }),
  closeSignupPrompt: () =>
    set((state) => ({ signupPrompt: { ...state.signupPrompt, open: false } })),
  pushToast: (variant, message, action) =>
    set((state) => ({ toasts: [...state.toasts, { id: nextToastId++, variant, message, action }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
