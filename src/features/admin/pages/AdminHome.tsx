import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_NAV } from '@/config/adminNav';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth.store';
import { AdminPageHeader, CARD } from '../components/AdminUi';

/**
 * Trang `/admin` tạm thời: lối vào các khu quản trị. SCR-38 admin/Dashboard (số liệu tổng quan, FN-ADM-18) do Leader làm sẽ thay trang này.
 */
const AdminHome: React.FC = () => {
  const name = useAuthStore((state) => state.user?.fullName);
  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader title={name ? `Xin chào, ${name}` : 'Quản trị VeggieLife'} description="Chọn khu vực cần quản lý." />
      <ul className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={cn(CARD, 'flex h-full items-start gap-space-md p-space-md no-underline transition-colors hover:border-primary/40 hover:bg-surface-container-low')}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
                <Icon name={item.icon} className="text-[22px]" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-label-lg text-label-lg text-on-surface">{item.label}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{item.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminHome;
