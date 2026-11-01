import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { AdminQueryError, CARD, CONTROL } from '../../components/AdminUi';
import { CostLegend, CostTable, DailyCostChart, FeatureCostBars } from '../../components/CostChart';
import { TopSpendersCard } from '../../components/TopSpendersCard';
import { useLlmopsDashboard } from '../../hooks/useAdminAi';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { AI_MODULE_LABEL } from '../../lib/labels';
import { budgetLevel, buildCostMatrix, formatTokens, formatUsd, vnDate } from '../../lib/llmops';
import type { AiModule } from '../../types/admin.types';

const PRESETS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const AiAnalyticsPage: React.FC = () => {
  const { get, set } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;
  const module = (Object.keys(AI_MODULE_LABEL) as string[]).includes(get('module')) ? (get('module') as AiModule) : undefined;
  const rangeError = from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : to > today ? 'Ngày kết thúc không được sau hôm nay.' : null;
  const preset = PRESETS.find((days) => from === vnDate(days - 1) && to === today);

  const dashboard = useLlmopsDashboard({ from, to });
  const [view, setView] = useState<'day' | 'feature'>('day');
  const [showTable, setShowTable] = useState(false);
  const matrix = useMemo(() => buildCostMatrix(dashboard.data?.series ?? []), [dashboard.data]);

  const data = dashboard.data;
  const level = budgetLevel(data?.usagePercent ?? 0);
  const meterColor = level === 'throttled' ? 'bg-error' : level === 'warning' ? 'bg-warning' : 'bg-primary';

  const promptTokens = data?.totalPromptTokens ?? 0;
  const completionTokens = data?.totalCompletionTokens ?? 0;
  const hasTokenBreakdown = promptTokens + completionTokens > 0;
  const promptPercent = hasTokenBreakdown ? (promptTokens / (promptTokens + completionTokens)) * 100 : 0;
  const completionPercent = hasTokenBreakdown ? (completionTokens / (promptTokens + completionTokens)) * 100 : 0;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Thanh bộ lọc ngày & tính năng */}
      <div className={cn(CARD, 'flex flex-wrap items-end gap-space-sm p-space-md')}>
        <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={preset === days}
              onClick={() => set({ from: vnDate(days - 1), to: today })}
              className={cn(
                'h-10 rounded-lg border px-3 font-label-md text-label-md transition-colors',
                preset === days ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'
              )}
            >
              {days} ngày
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Từ ngày
          <input type="date" value={from} max={today} onChange={(e) => set({ from: e.target.value })} className={cn(CONTROL, 'w-[160px]')} />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Đến ngày
          <input type="date" value={to} max={today} onChange={(e) => set({ to: e.target.value })} className={cn(CONTROL, 'w-[160px]')} />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Tính năng
          <select value={module ?? ''} onChange={(e) => set({ module: e.target.value })} className={cn(CONTROL, 'w-[200px]')}>
            <option value="">Mọi tính năng</option>
            {(Object.keys(AI_MODULE_LABEL) as AiModule[]).map((value) => (
              <option key={value} value={value}>
                {AI_MODULE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rangeError && <FormAlert tone="warning">{rangeError}</FormAlert>}

      {dashboard.isPending ? (
        <section aria-busy="true" aria-label="Đang tải chi phí AI" className="flex flex-col gap-space-md">
          <div className="grid gap-space-md sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className={cn(CARD, 'h-28 animate-pulse')} />
            ))}
          </div>
          <div className={cn(CARD, 'h-80 animate-pulse')} />
        </section>
      ) : dashboard.isError && !dashboard.data ? (
        <AdminQueryError error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : (
        data && (
          <div className={cn('flex flex-col gap-space-md', dashboard.isPlaceholderData && 'opacity-60 transition-opacity')}>
            {/* 3 Thẻ thống kê chính */}
            <div className="grid gap-space-md sm:grid-cols-3">
              {/* Thẻ 1: Chi phí hôm nay */}
              <div className={cn(CARD, 'flex flex-col gap-2 p-space-md')}>
                <p className="font-label-md text-label-md text-on-surface-variant">Chi phí hôm nay</p>
                <p className="font-headline-md text-headline-md text-on-surface">{formatUsd(data.todayCostUsd)}</p>
                <div
                  role="meter"
                  aria-label="Mức dùng ngân sách ngày"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(data.usagePercent)}
                  aria-valuetext={`${formatNumber(data.usagePercent)}% của ${formatUsd(data.dailyBudgetUsd)}`}
                  className="h-2 w-full overflow-hidden rounded-full bg-primary-fixed"
                >
                  <div className={cn('h-full rounded-full', meterColor)} style={{ width: `${Math.min(100, Math.max(0, data.usagePercent))}%` }} />
                </div>
                <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name={level === 'ok' ? 'check_circle' : 'warning'} className={cn('text-[16px]', level === 'ok' ? 'text-success' : level === 'warning' ? 'text-warning' : 'text-error')} />
                  {formatNumber(data.usagePercent)}% của ngân sách {formatUsd(data.dailyBudgetUsd)}/ngày
                </p>
              </div>

              {/* Thẻ 2: Tổng chi phí trong kỳ */}
              <div className={cn(CARD, 'flex flex-col gap-1 p-space-md')}>
                <p className="font-label-md text-label-md text-on-surface-variant">Tổng chi phí trong kỳ</p>
                <p className="font-headline-md text-headline-md text-on-surface">{formatUsd(matrix.total.costUsd)}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{matrix.dates.length} ngày có dữ liệu</p>
              </div>

              {/* Thẻ 3: Token trong kỳ (kèm phân rã Input vs Output) */}
              <div className={cn(CARD, 'flex flex-col gap-1 p-space-md')}>
                <p className="font-label-md text-label-md text-on-surface-variant">Token trong kỳ</p>
                <p className="font-headline-md text-headline-md text-on-surface">{formatTokens(matrix.total.tokens)}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{formatNumber(matrix.total.tokens)} token</p>
                {hasTokenBreakdown && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-surface-container pt-2">
                    <div
                      role="progressbar"
                      aria-label="Tỷ lệ Input vs Output"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={100}
                      className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container"
                    >
                      <div
                        title={`Input: ${promptPercent.toFixed(1)}%`}
                        style={{ width: `${promptPercent}%` }}
                        className="h-full bg-info transition-all"
                      />
                      <div
                        title={`Output: ${completionPercent.toFixed(1)}%`}
                        style={{ width: `${completionPercent}%` }}
                        className="h-full bg-secondary transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between font-body-xs text-body-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-info" />
                        Input: {formatTokens(promptTokens)} ({formatUsd(data.promptCostUsd ?? 0)})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        Output: {formatTokens(completionTokens)} ({formatUsd(data.completionCostUsd ?? 0)})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Khối Biểu đồ chi phí */}
            <div className={cn(CARD, 'flex flex-col gap-space-md p-space-md sm:p-space-lg')}>
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <h3 className="font-label-lg text-label-lg text-on-surface">
                  {view === 'day' ? 'Chi phí theo ngày (USD)' : 'Chi phí theo tính năng (USD, cả kỳ)'}
                </h3>
                <div role="group" aria-label="Cách xem" className="flex rounded-lg bg-surface-container p-0.5">
                  {(['day', 'feature'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={view === option}
                      onClick={() => setView(option)}
                      className={cn(
                        'rounded-md px-3 py-1.5 font-label-md text-label-md transition-colors',
                        view === option ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      {option === 'day' ? 'Theo ngày' : 'Theo tính năng'}
                    </button>
                  ))}
                </div>
              </div>

              {data.series.length === 0 ? (
                <EmptyState
                  icon="query_stats"
                  title="Chưa có dữ liệu chi phí"
                  description="Không có lượt gọi AI nào trong khoảng thời gian đã chọn. Thử chọn khoảng dài hơn."
                />
              ) : view === 'day' ? (
                <>
                  <CostLegend features={matrix.features} />
                  <DailyCostChart matrix={matrix} dailyBudgetUsd={data.dailyBudgetUsd} />
                </>
              ) : (
                <FeatureCostBars matrix={matrix} />
              )}

              {data.series.length > 0 && (
                <div className="flex flex-col gap-space-sm">
                  <button
                    type="button"
                    aria-expanded={showTable}
                    onClick={() => setShowTable((value) => !value)}
                    className="inline-flex items-center gap-1 self-start font-label-md text-label-md text-primary"
                  >
                    <Icon name={showTable ? 'expand_less' : 'table_view'} className="text-[18px]" />
                    {showTable ? 'Ẩn bảng số liệu' : 'Xem bảng số liệu'}
                  </button>
                  {showTable && <CostTable matrix={matrix} />}
                </div>
              )}
            </div>

            {/* Khối Phân bổ Hạng & Top Spenders */}
            <TopSpendersCard
              tierDistribution={data.userTierDistribution}
              topSpenders={data.topSpenders}
            />
          </div>
        )
      )}
    </div>
  );
};

export default AiAnalyticsPage;
