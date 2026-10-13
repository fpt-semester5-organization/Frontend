import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { ROLES, type Role } from '@/constants/roles';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { IS_MOCK } from '@/lib/env';

const MOCK_USERS: Record<Exclude<Role, 'GUEST'>, AuthUser> = {
  MEMBER: { userId: 1001, fullName: 'Nguyễn Văn An', email: 'vanan@veggielife.vn', role: 'MEMBER', isVip: false },
  VIP: { userId: 1002, fullName: 'Nguyễn Văn An', email: 'vanan@veggielife.vn', role: 'VIP', isVip: true },
  ADMIN: { userId: 1, fullName: 'Lê Hoàng', email: 'admin@veggielife.vn', role: 'ADMIN', isVip: false },
};

/** CHỈ DEV (VITE_MOCK_AUTH=true): đổi nhanh vai trò để xem đủ 45 màn khi chưa có backend. Không có trong bản build production. */
export function RoleSwitcher() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!IS_MOCK) return null;
  const current: Role = user?.role ?? ROLES.GUEST;
  // Đổi vai trò xong phải chuyển trang: Admin -> /admin; rời Admin hoặc trang cần đăng nhập -> trang chủ
  const pick = (role: Role) => {
    if (role === 'GUEST') logout();
    else setSession(MOCK_USERS[role], `mock-${role.toLowerCase()}-token`);
    if (role === 'ADMIN') navigate(PATHS.ADMIN.ROOT);
    else if (pathname.startsWith('/admin') || role === 'GUEST') navigate(PATHS.HOME);
  };
  return (
    <div className={`fixed left-3 z-[1080] font-label-sm text-label-sm ${pathname.startsWith('/chat') ? 'bottom-28' : 'bottom-3'}`}>
      {open ? (
        <div className="flex items-center gap-1 rounded-full bg-inverse-surface p-1 pl-3 text-inverse-on-surface shadow-xl">
          <span className="mr-1 opacity-70">Vai trò (dev):</span>
          {(['GUEST', 'MEMBER', 'VIP', 'ADMIN'] as Role[]).map((r) => (
            <button key={r} type="button" onClick={() => pick(r)} className={`rounded-full px-2.5 py-1 ${current === r ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-white/10'}`}>
              {r}
            </button>
          ))}
          <button type="button" aria-label="Thu gọn" onClick={() => setOpen(false)} className="rounded-full px-1.5 hover:bg-white/10">×</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-inverse-surface px-3 py-1.5 text-inverse-on-surface shadow-xl">Vai trò: {current}</button>
      )}
    </div>
  );
}
