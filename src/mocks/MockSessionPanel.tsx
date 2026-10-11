import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { login, logout } from '@/features/auth/api/auth.api';
import { cn } from '@/lib/cn';
import { notifyApiError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth.store';
import { MOCK_PASSWORD, users } from './db';

const ROLE_LABEL = { MEMBER: 'Thành viên', VIP: 'VIP', ADMIN: 'Admin' } as const;

/** Bảng đổi vai trò khi chạy dữ liệu giả: gọi /auth/login, /auth/logout thật (MSW trả lời). */
const MockSessionPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const switchTo = async (userId: number | null) => {
    setBusy(true);
    try {
      if (userId === null) {
        await logout();
        useAuthStore.getState().logout();
      } else {
        const target = users.find((item) => item.userId === userId)!;
        const res = await login({ email: target.email, password: MOCK_PASSWORD });
        const { accessToken, user: account } = res.data;
        useAuthStore.getState().setAuth(
          {
            userId: account.userId,
            fullName: account.fullName,
            email: account.email,
            role: account.role,
            isVip: account.isVip,
          },
          accessToken
        );
      }
      await queryClient.invalidateQueries();
    } catch (error) {
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { id: null, label: 'Khách (chưa đăng nhập)' },
    ...users.slice(0, 2).map((item) => ({ id: item.userId, label: `${item.fullName} (${ROLE_LABEL[item.role]})` })),
  ];

  return (
    <div className="fixed bottom-4 left-4 z-[1080] w-64 rounded-lg bg-white text-sm shadow-lg ring-1 ring-amber-300">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left font-semibold text-amber-900"
      >
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">MSW: {user ? user.fullName : 'Khách'}</span>
      </button>
      {open && (
        <div className="space-y-1 p-2">
          {options.map((option) => {
            const active = (user?.userId ?? null) === option.id;
            return (
              <button
                key={option.label}
                type="button"
                disabled={busy || active}
                onClick={() => switchTo(option.id)}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left disabled:cursor-default',
                  active ? 'bg-brand-50 font-medium text-brand-800' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {option.label}
              </button>
            );
          })}
          <p className="px-2 pt-1 text-xs text-gray-500">Tải lại trang sẽ đưa dữ liệu giả về ban đầu.</p>
        </div>
      )}
    </div>
  );
};

export default MockSessionPanel;
