import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { login, logout } from '@/features/auth/api/auth.api';
import { cn } from '@/lib/cn';
import { notifyApiError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth.store';
import { MOCK_PASSWORD, users } from './db';
import { mockForeignIp } from './handlers/venues.handlers';

const ROLE_LABEL = { MEMBER: 'Thành viên', VIP: 'VIP', ADMIN: 'Admin' } as const;

/** Bảng đổi vai trò khi chạy dữ liệu giả: gọi /auth/login, /auth/logout thật (MSW trả lời). */
const MockSessionPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [foreignIp, setForeignIp] = useState(mockForeignIp.get);

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
    <div className="fixed bottom-3 left-3 z-[1080] font-label-sm text-label-sm">
      {open ? (
        <div className="w-64 rounded-xl bg-inverse-surface p-2 text-inverse-on-surface shadow-xl">
          <div className="flex items-center justify-between gap-2 px-2 pb-1">
            <span className="flex items-center gap-1.5 opacity-80">
              <Icon name="science" className="text-[16px]" />
              Dữ liệu giả (MSW)
            </span>
            <button
              type="button"
              aria-label="Thu gọn"
              onClick={() => setOpen(false)}
              className="flex rounded-full p-0.5 hover:bg-white/10"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
          {options.map((option) => {
            const active = (user?.userId ?? null) === option.id;
            return (
              <button
                key={option.label}
                type="button"
                disabled={busy || active}
                onClick={() => switchTo(option.id)}
                className={cn(
                  'w-full rounded-lg px-2 py-1.5 text-left disabled:cursor-default',
                  active ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-white/10'
                )}
              >
                {option.label}
              </button>
            );
          })}
          <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10">
            <input
              type="checkbox"
              checked={foreignIp}
              onChange={(event) => {
                mockForeignIp.set(event.target.checked);
                setForeignIp(event.target.checked);
              }}
              className="accent-secondary-container"
            />
            Giả lập truy cập từ nước ngoài
          </label>
          <p className="px-2 pt-1 font-body-sm text-body-sm opacity-70">Tải lại trang sẽ đưa dữ liệu giả về ban đầu.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full bg-inverse-surface px-3 py-1.5 text-inverse-on-surface shadow-xl"
        >
          <Icon name="science" className="text-[16px]" />
          MSW: {user ? user.fullName : 'Khách'}
        </button>
      )}
    </div>
  );
};

export default MockSessionPanel;
