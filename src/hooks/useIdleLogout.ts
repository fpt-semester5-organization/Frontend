import { useEffect } from 'react';

/** BR-ADM-SYS-003, SEC-13, UI-9: Admin tự đăng xuất sau 30 phút không thao tác. */
export function useIdleLogout(onTimeout: () => void, minutes = 30) {
  useEffect(() => {
    let timer = window.setTimeout(onTimeout, minutes * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onTimeout, minutes * 60_000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [onTimeout, minutes]);
}
