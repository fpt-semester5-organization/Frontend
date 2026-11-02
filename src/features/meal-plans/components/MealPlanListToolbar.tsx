import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { MealPlanSortOption, MealPlanStatusFilter } from '../types/mealPlan.types';

export interface MealPlanListToolbarProps {
  status: MealPlanStatusFilter;
  keyword: string;
  sort: MealPlanSortOption;
  counts: Record<MealPlanStatusFilter, number>;
  onStatusChange: (status: MealPlanStatusFilter) => void;
  onKeywordChange: (keyword: string) => void;
  onSortChange: (sort: MealPlanSortOption) => void;
  onReset: () => void;
}

const STATUS_TABS: { value: MealPlanStatusFilter; label: string; icon: string }[] = [
  { value: 'ALL', label: 'Tất cả', icon: 'list_alt' },
  { value: 'ACTIVE', label: 'Đang áp dụng', icon: 'check_circle' },
  { value: 'DRAFT', label: 'Bản nháp', icon: 'edit_note' },
  { value: 'CANCELLED', label: 'Đã hủy', icon: 'cancel' },
  { value: 'ARCHIVED', label: 'Đã lưu trữ', icon: 'archive' },
];

const SORT_OPTIONS: { value: MealPlanSortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'startDateDesc', label: 'Ngày bắt đầu: Gần nhất' },
  { value: 'startDateAsc', label: 'Ngày bắt đầu: Xa nhất' },
];

export const MealPlanListToolbar: React.FC<MealPlanListToolbarProps> = ({
  status,
  keyword,
  sort,
  counts,
  onStatusChange,
  onKeywordChange,
  onSortChange,
  onReset,
}) => {
  const isFiltered = status !== 'ALL' || keyword.trim() !== '' || sort !== 'newest';

  return (
    <div className="flex flex-col gap-space-sm rounded-2xl border border-surface-container bg-surface-container-lowest p-space-sm sm:p-space-md shadow-card">
      {/* Tầng 1: Tabs trạng thái dạng Pill buttons có badge số lượng */}
      <div
        role="tablist"
        aria-label="Lọc thực đơn theo trạng thái"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value;
          const count = counts[tab.value] ?? 0;

          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-label-md text-label-md transition-all',
                isActive
                  ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              )}
            >
              <Icon name={tab.icon} className="text-[18px]" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[11px] font-bold leading-tight',
                  isActive
                    ? 'bg-white/20 text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tầng 2: Tìm kiếm theo từ khóa + Sắp xếp + Đặt lại */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1">
          <label htmlFor="meal-plan-search" className="sr-only">
            Tìm thực đơn
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            id="meal-plan-search"
            type="search"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Tìm theo tên thực đơn hoặc ngày bắt đầu (VD: 01/11)..."
            className="w-full rounded-xl bg-surface-container-low py-2 pr-9 pl-9 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          {keyword && (
            <button
              type="button"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => onKeywordChange('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          )}
        </div>

        {/* Cụm điều khiển: Sắp xếp & Nút Đặt lại */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-outline">
              <Icon name="swap_vert" className="text-[18px]" />
            </span>
            <select
              aria-label="Sắp xếp danh sách thực đơn"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as MealPlanSortOption)}
              className="rounded-xl border-none bg-surface-container-low py-2 pr-8 pl-8 font-label-md text-label-md text-on-surface outline-none transition-colors hover:bg-surface-container focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 font-label-sm text-label-sm text-error transition-colors hover:bg-error-container/20"
              title="Khôi phục bộ lọc mặc định"
            >
              <Icon name="restart_alt" className="text-[16px]" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
