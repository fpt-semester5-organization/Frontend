import React from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatDayMonth } from '../lib/dates';
import { DAY_LABEL } from '../lib/labels';
import type { DayOfWeek } from '../types/mealPlan.types';

interface DayColumnProps {
  day: DayOfWeek;
  date: string;
  isToday: boolean;
  /** Tổng calo của ngày (mọi thành viên); null khi đang tải. */
  kcal: number | null;
  /** Chênh lệch so với mục tiêu (VIP); null với Free. */
  deltaKcal: number | null;
  targetKcal: number | null;
  children: React.ReactNode;
}

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(value)))}`;

/** Một ngày trong lưới 7 ngày × 3 bữa: tiêu đề ngày, tổng calo, 3 bữa. */
export const DayColumn: React.FC<DayColumnProps> = ({ day, date, isToday, kcal, deltaKcal, targetKcal, children }) => {
  // Lệch quá ±10% mục tiêu thì tô màu cảnh báo (BR-USR-07).
  const offTarget = deltaKcal !== null && targetKcal ? Math.abs(deltaKcal) > targetKcal * 0.1 : false;

  return (
    <section
      aria-label={`${DAY_LABEL[day]} ${formatDayMonth(date)}`}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl p-2',
        isToday ? 'bg-primary-fixed/50 ring-1 ring-primary-container' : 'bg-surface-container-low'
      )}
    >
      <header className="flex items-start justify-between gap-1 px-1 lg:flex-col lg:items-stretch">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <h3 className="whitespace-nowrap font-label-lg text-label-lg text-on-surface">{DAY_LABEL[day]}</h3>
          <span className="whitespace-nowrap font-label-sm text-label-sm text-on-surface-variant">{formatDayMonth(date)}</span>
          {isToday && (
            <span className="whitespace-nowrap rounded-full bg-primary px-1.5 py-px font-label-sm text-[11px] text-on-primary">
              Hôm nay
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-right lg:text-left">
          <span className="font-label-md text-label-md text-on-surface tabular-nums">
            {kcal === null ? '… kcal' : `${formatNumber(Math.round(kcal))} kcal`}
          </span>
          {deltaKcal !== null && (
            <span
              className={cn(
                'rounded px-1 font-label-sm text-label-sm tabular-nums',
                offTarget ? 'bg-warning-container text-warning' : 'bg-success-container text-success'
              )}
              title="So với calo mục tiêu mỗi ngày"
            >
              {signed(deltaKcal)}
            </span>
          )}
        </div>
      </header>
      {children}
    </section>
  );
};
