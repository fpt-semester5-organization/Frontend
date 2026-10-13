import type { ReactNode } from 'react';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/**
 * Guard theo từng nút (spec 13: "Khách xem được; thao tác ghi cần Thành viên").
 * Khách bấm vào bất kỳ phần tử con nào → chặn thao tác và mở SignupPromptModal.
 */
export function MemberOnly({ children, reason = 'guest' }: { children: ReactNode; reason?: 'guest' | 'quota' | 'personalization' }) {
  const authed = useAuthStore(selectIsAuthenticated);
  const open = useUiStore((s) => s.openSignupPrompt);
  if (authed) return <>{children}</>;
  return (
    <span
      className="contents"
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(reason);
      }}
    >
      {children}
    </span>
  );
}
