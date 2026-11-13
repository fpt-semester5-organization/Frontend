import React from 'react';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { CARD, CONTROL } from './AdminUi';
import { AI_DATE_PRESETS as PRESETS, useAiDateRange } from '../hooks/useAiDateRange';
import { vnDate } from '../lib/llmops';

type Patch = Record<string, string | number | boolean | null | undefined>;

interface AiDateRangeFilterProps {
  /** Giá trị URL cần đặt lại kèm khi đổi khoảng ngày (vd. `{ surveyPage: 1 }`). */
  resetOnChange?: Patch;
  children?: React.ReactNode;
}

/** Thanh lọc khoảng ngày (7/30/90 ngày, Từ ngày, Đến ngày) và nhãn múi giờ GMT+7. */
export const AiDateRangeFilter: React.FC<AiDateRangeFilterProps> = ({
  resetOnChange,
  children,
}) => {
  const { from, to, today, rangeError, preset, set } = useAiDateRange();
  const update = (patch: Patch) => set({ ...patch, ...resetOnChange });

  return (
    <>
      <div className={cn(CARD, 'flex flex-wrap items-end gap-space-sm p-space-md')}>
        <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={preset === days}
              onClick={() => update({ from: vnDate(days - 1), to: today })}
              className={cn(
                'h-10 rounded-lg border px-3 font-label-md text-label-md transition-colors',
                preset === days
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface hover:bg-surface-container'
              )}
            >
              {days} ngày
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Từ ngày
          <input
            type="date"
            value={from}
            max={today}
            onChange={(e) => update({ from: e.target.value })}
            className={cn(CONTROL, 'w-[160px]')}
          />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Đến ngày
          <input
            type="date"
            value={to}
            max={today}
            onChange={(e) => update({ to: e.target.value })}
            className={cn(CONTROL, 'w-[160px]')}
          />
        </label>
        {children}
        <div className="ml-auto flex items-center gap-1.5 self-center rounded-lg bg-surface-container-low px-2.5 py-1 text-[12px] font-medium text-on-surface-variant ring-1 ring-surface-container">
          <Icon name="schedule" className="text-[15px] text-primary" />
          <span>Múi giờ: GMT+7 (Asia/Ho_Chi_Minh)</span>
        </div>
      </div>
      {rangeError && <FormAlert tone="warning">{rangeError}</FormAlert>}
    </>
  );
};

/** Nút nhảy nhanh tới từng phần trong một trang gộp. */
export const AiSectionJumpNav: React.FC<{
  items: { id: string; label: string; icon: string }[];
}> = ({ items }) => (
  <nav aria-label="Các phần trong trang" className="flex flex-wrap gap-2">
    {items.map((item) => (
      <a
        key={item.id}
        href={`#${item.id}`}
        onClick={(e) => {
          const target = document.getElementById(item.id);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.replaceState(
              window.history.state,
              '',
              `${window.location.pathname}${window.location.search}#${item.id}`
            );
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-container"
      >
        <Icon name={item.icon} className="text-[18px] text-primary" />
        {item.label}
      </a>
    ))}
  </nav>
);
