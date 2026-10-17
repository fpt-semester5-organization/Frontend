import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/** Mặc định của BR-GUEST-01 khi server chưa trả meta.signUpPromptAtItem. */
export const DEFAULT_PROMPT_AT = 5;
/** Đã mời rồi thì 24 giờ không mời lại (Main-flow 01, bước 13a). */
export const PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000;
const SNOOZE_KEY = 'vl_browse_prompt_until';

function isSnoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY)) > Date.now();
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + PROMPT_SNOOZE_MS));
  } catch {
    /* trình duyệt chặn lưu trữ: vẫn chỉ mời một lần trong lần mở trang này */
  }
}

/**
 * BR-GUEST-01: Khách lướt tới mục thứ N của danh sách GET /recipes (trang chủ, kho công thức; N = meta.signUpPromptAtItem,
 * mặc định 5) thì mở hộp mời đăng ký.
 * Trả về vị trí (0-based) của mục cần theo dõi và ref gắn vào mục đó; Thành viên nhận -1.
 */
export function useBrowsePrompt(promptAt: number | undefined) {
  const isGuest = useAuthStore((state) => !state.user);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);
  const observer = useRef<IntersectionObserver | null>(null);
  const shown = useRef(false);

  const ref = useCallback(
    (node: Element | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node || !isGuest || shown.current || isSnoozed() || typeof IntersectionObserver === 'undefined') return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.current?.disconnect();
          if (shown.current || isSnoozed()) return;
          shown.current = true;
          snooze();
          openSignupPrompt('browse');
        },
        { threshold: 0.5 }
      );
      observer.current.observe(node);
    },
    [isGuest, openSignupPrompt]
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  const at = promptAt && promptAt > 0 ? promptAt : DEFAULT_PROMPT_AT;
  return { promptIndex: isGuest ? at - 1 : -1, promptRef: ref };
}
