import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '../components/AdminUi';

export interface AiSubNavItem {
  label: string;
  to: string;
  icon: string;
  end?: boolean;
  description: string;
}

export const AI_SUB_NAV: AiSubNavItem[] = [
  {
    label: 'Tổng quan',
    to: PATHS.ADMIN.AI,
    icon: 'space_dashboard',
    end: true,
    description: 'Bảng chỉ số tóm tắt, sức khỏe hệ thống và điều hướng nhanh.',
  },
  {
    label: 'Phân tích Chi phí',
    to: PATHS.ADMIN.AI_ANALYTICS,
    icon: 'analytics',
    description: 'Biểu đồ chi phí token theo ngày, tính năng, phân rã Input/Output và Top Spenders.',
  },
  {
    label: 'Nhật ký cuộc gọi',
    to: PATHS.ADMIN.AI_LOGS,
    icon: 'receipt_long',
    description: 'Tra cứu toàn bộ lịch sử gọi AI, kiểm tra prompt, response, latency và mã lỗi.',
  },
  {
    label: 'Kho tri thức RAG',
    to: PATHS.ADMIN.AI_RAG,
    icon: 'database',
    description: 'Trạng thái Vector Database, số điểm tri thức theo nguồn và kích hoạt đồng bộ lại.',
  },
  {
    label: 'Chất lượng & SLA',
    to: PATHS.ADMIN.AI_QUALITY,
    icon: 'verified',
    description: 'Trạng thái ngắt mạch (Circuit Breaker), cảnh báo suy giảm độ chính xác và ma trận lỗi.',
  },
];

/**
 * Layout cha cho phân hệ Quản lý & Giám sát AI (SCR-41 · `/admin/ai/*`).
 * Cung cấp thanh điều hướng Sub-Nav Tabs đồng bộ URL và vùng hiển thị Outlet cho các trang con.
 */
export const AdminAiLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Quản lý & Giám sát AI"
      />

      {/* Thanh Sub-navigation Tabs */}
      <nav
        aria-label="Điều hướng phân hệ AI"
        className="flex items-center gap-1 overflow-x-auto border-b border-surface-container bg-surface-container-low px-2 pt-2 rounded-t-xl"
      >
        {AI_SUB_NAV.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.description}
              className={cn(
                'group relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 font-label-md text-label-md transition-all',
                isActive
                  ? 'bg-surface font-semibold text-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              )}
            >
              <Icon
                name={item.icon}
                className={cn(
                  'text-[20px] transition-colors',
                  isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Vùng hiển thị trang con */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminAiLayout;
