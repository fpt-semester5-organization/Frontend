import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/** Khách lướt tới mục thứ 5 của danh sách thì hiện lời mời đăng ký (BR-GUEST-01, UI-5). */
export const SIGNUP_PROMPT_AT_ITEM = 5;

/**
 * Gắn ref trả về vào mục thứ SIGNUP_PROMPT_AT_ITEM; khi mục đó hiện trên màn hình và người xem là
 * Khách thì mở SignupPromptModal, mỗi lần vào trang chỉ mở một lần.
 */
export function useSignupPromptAtItem<T extends Element>() {
  const ref = useRef<T | null>(null);
  const shownRef = useRef(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionReady = useAuthStore((state) => state.sessionStatus === 'ready');

  useEffect(() => {
    const node = ref.current;
    if (!node || isAuthenticated || !sessionReady || shownRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !shownRef.current) {
          shownRef.current = true;
          useUiStore.getState().openSignupPrompt();
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  });

  return ref;
}
