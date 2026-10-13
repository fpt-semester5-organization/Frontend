import { useAuthStore, selectIsAuthenticated } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { QUOTA } from '@/constants/quota';

/** Hiển thị lượt AI dùng thử còn lại của Khách (BR-GUEST-02: 03 lượt/phiên). Ẩn khi đã đăng nhập. */
export function GuestQuotaBadge({ className = '' }: { className?: string }) {
  const authed = useAuthStore(selectIsAuthenticated);
  const remaining = useGuestStore((s) => s.quota?.ai.remaining);
  if (authed) return null;
  const left = remaining ?? QUOTA.guest.ai;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 font-label-sm text-label-sm text-on-secondary-fixed ${className}`} title="Lượt AI dùng thử còn lại (Khách)">
      <span className="material-symbols-outlined text-[14px]">bolt</span>
      {left}/{QUOTA.guest.ai} lượt AI
    </span>
  );
}
