import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

/**
 * Guard theo từng nút (MemberOnly, UI Spec): Khách bấm thao tác ghi thì mở SignupPromptModal
 * thay vì gọi API; Thành viên thì chạy hành động.
 */
export function useRequireMember() {
  const isMember = useAuthStore((state) => state.isAuthenticated);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);

  const requireMember = useCallback(
    (action: () => void) => {
      if (isMember) action();
      else openSignupPrompt();
    },
    [isMember, openSignupPrompt]
  );

  return { isMember, requireMember };
}
