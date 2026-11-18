import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { AdminQueryError, CARD } from './AdminUi';
import {
  CostLegend,
  CostTable,
  DailyCostChart,
  DonutCostChart,
  FeatureCostBars,
  StackedAreaCostChart,
  TokenBreakdownChart,
} from './CostChart';
import { FeatureCostCards } from './FeatureCostCards';
import { useLlmopsDashboard } from '../hooks/useAdminAi';
import { budgetLevel, buildCostMatrix, formatTokens, formatUsd, formatVnd } from '../lib/llmops';

export type ChartViewMode = 'day' | 'area' | 'donut' | 'token-split' | 'feature';

const CHART_VIEWS: { id: ChartViewMode; label: string; icon: string }[] = [
  { id: 'day', label: 'Cột chồng', icon: 'bar_chart' },
  { id: 'area', label: 'Vùng xu hướng', icon: 'area_chart' },
  { id: 'donut', label: 'Biểu đồ tròn %', icon: 'pie_chart' },
  { id: 'token-split', label: 'Phân rã Token', icon: 'compare_arrows' },
  { id: 'feature', label: 'Theo tính năng', icon: 'reorder' },
];

/**
 * Phần Phân tích Chi phí AI (đặt trong trang Chi phí & Nhật ký API AI · `/admin/ai/logs#cost`):
 * thẻ chi phí/token, chi phí theo tính năng, biểu đồ đổi kiểu xem và bảng số liệu.
 * Top 5 tài khoản tiêu thụ chỉ hiển thị ở tab Tổng quan.
 */
export const AiCostSection: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const dashboard = useLlmopsDashboard({ from, to });
  const [view, setView] = useState<ChartViewMode>('day');
  const [showTable, setShowTable] = useState(false);
  const matrix = useMemo(() => buildCostMatrix(dashboard.data?.series ?? []), [dashboard.data]);

  const data = dashboard.data;
  const level = budgetLevel(data?.usagePercent ?? 0);
  const meterColor =
    level === 'throttled' ? 'bg-error' : level === 'warning' ? 'bg-warning' : 'bg-primary';

  const promptTokens = data?.totalPromptTokens ?? 0;
  const completionTokens = data?.totalCompletionTokens ?? 0;
  const hasTokenBreakdown = promptTokens + completionTokens > 0;
  const promptPercent = hasTokenBreakdown
    ? (promptTokens / (promptTokens + completionTokens)) * 100
    : 0;
  const completionPercent = hasTokenBreakdown
    ? (completionTokens / (promptTokens + completionTokens)) * 100
    : 0;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      id="cost"
      aria-labelledby="ai-cost-heading"
      className="flex scroll-mt-24 flex-col gap-space-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 id="ai-cost-heading" className="font-headline-sm text-headline-sm text-on-surface">
          Phân tích Chi phí
        </h2>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls="ai-cost-body"
          onClick={() => setCollapsed((value) => !value)}
          className="inline-flex items-center gap-1 font-label-md text-label-md text-primary"
        >
          <Icon name={collapsed ? 'expand_more' : 'expand_less'} className="text-[18px]" />
          {collapsed ? 'Hiện phân tích chi phí' : 'Thu gọn'}
        </button>
      </div>

      {!collapsed && (
        <div id="ai-cost-body" className="flex flex-col gap-space-md">
          {dashboard.isPending ? (
            <section
              aria-busy="true"
              aria-label="Đang tải chi phí AI"
              className="flex flex-col gap-space-md"
            >
              <div className="grid gap-space-md sm:grid-cols-3">
                {[0, 1, 2].map((key) => (
                  <div key={key} className={cn(CARD, 'h-28 animate-pulse')} />
                ))}
              </div>
              <div className={cn(CARD, 'h-80 animate-pulse')} />
            </section>
          ) : dashboard.isError && !dashboard.data ? (
            <AdminQueryError
              error={dashboard.error}
              onRetry={() => void dashboard.refetch()}
              retrying={dashboard.isRefetching}
            />
          ) : (
            data && (
              <div
                className={cn(
                  'flex flex-col gap-space-md',
                  dashboard.isPlaceholderData && 'opacity-60 transition-opacity'
                )}
              >
                {/* 3 Thẻ thống kê chính */}
                <div className="grid gap-space-md sm:grid-cols-3">
                  {/* Thẻ 1: Chi phí hôm nay */}
                  <div className={cn(CARD, 'flex flex-col gap-2 p-space-md')}>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      Chi phí hôm nay (GMT+7)
                    </p>
                    <p className="font-headline-md text-headline-md text-on-surface">
                      {formatUsd(data.todayCostUsd)}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatVnd(data.todayCostUsd)}
                    </p>
                    <div
                      role="meter"
                      aria-label="Mức dùng ngân sách ngày"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(data.usagePercent)}
                      aria-valuetext={`${formatNumber(data.usagePercent)}% của ${formatUsd(data.dailyBudgetUsd)}`}
                      className="h-2 w-full overflow-hidden rounded-full bg-primary-fixed"
                    >
                      <div
                        className={cn('h-full rounded-full', meterColor)}
                        style={{ width: `${Math.min(100, Math.max(0, data.usagePercent))}%` }}
                      />
                    </div>
                    <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                      <Icon
                        name={level === 'ok' ? 'check_circle' : 'warning'}
                        className={cn(
                          'text-[16px]',
                          level === 'ok'
                            ? 'text-success'
                            : level === 'warning'
                              ? 'text-warning'
                              : 'text-error'
                        )}
                      />
                      {formatNumber(data.usagePercent)}% của ngân sách{' '}
                      {formatUsd(data.dailyBudgetUsd)}/ngày
                    </p>
                  </div>

                  {/* Thẻ 2: Tổng chi phí trong kỳ */}
                  <div className={cn(CARD, 'flex flex-col gap-1 p-space-md')}>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      Tổng chi phí trong kỳ
                    </p>
                    <p className="font-headline-md text-headline-md text-on-surface">
                      {formatUsd(matrix.total.costUsd)}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatVnd(matrix.total.costUsd)}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {matrix.dates.length} ngày có dữ liệu
                    </p>
                  </div>

                  {/* Thẻ 3: Token trong kỳ (kèm phân rã Input vs Output) */}
                  <div className={cn(CARD, 'flex flex-col gap-1 p-space-md')}>
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      Token trong kỳ
                    </p>
                    <p className="font-headline-md text-headline-md text-on-surface">
                      {formatTokens(matrix.total.tokens)}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatNumber(matrix.total.tokens)} token
                    </p>
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
                            Input: {formatTokens(promptTokens)} (
                            {formatUsd(data.promptCostUsd ?? 0)})
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-secondary" />
                            Output: {formatTokens(completionTokens)} (
                            {formatUsd(data.completionCostUsd ?? 0)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chi phí ước tính và token theo từng tính năng AI chính */}
                <FeatureCostCards matrix={matrix} />

                {/* Khối Biểu đồ chi phí */}
                <div className={cn(CARD, 'flex flex-col gap-space-md p-space-md sm:p-space-lg')}>
                  <div className="flex flex-wrap items-center justify-between gap-space-sm">
                    <h3 className="font-label-lg text-label-lg text-on-surface">
                      {view === 'day'
                        ? 'Chi phí theo ngày (Cột chồng, USD)'
                        : view === 'area'
                          ? 'Xu hướng chi phí theo ngày (Vùng miền, USD)'
                          : view === 'donut'
                            ? 'Cơ cấu tỷ trọng chi phí theo tính năng (%)'
                            : view === 'token-split'
                              ? 'Phân rã Token theo ngày (Input vs Output)'
                              : 'Chi phí theo tính năng (Thanh ngang, cả kỳ)'}
                    </h3>
                    {/* Bộ nút chuyển đổi loại biểu đồ */}
                    <div
                      role="group"
                      aria-label="Cách xem"
                      className="flex flex-wrap rounded-lg bg-surface-container p-1 gap-1"
                    >
                      {CHART_VIEWS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={view === option.id}
                          onClick={() => setView(option.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-label-sm text-label-sm transition-all',
                            view === option.id
                              ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                          )}
                        >
                          <Icon name={option.icon} className="text-[16px]" />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {data.series.length === 0 ? (
                    <EmptyState
                      icon="query_stats"
                      title="Chưa có dữ liệu chi phí"
                      description="Không có lượt truy vấn API AI nào trong khoảng thời gian đã chọn. Thử chọn khoảng dài hơn."
                    />
                  ) : view === 'day' ? (
                    <>
                      <CostLegend features={matrix.features} />
                      <DailyCostChart matrix={matrix} dailyBudgetUsd={data.dailyBudgetUsd} />
                    </>
                  ) : view === 'area' ? (
                    <>
                      <CostLegend features={matrix.features} />
                      <StackedAreaCostChart matrix={matrix} dailyBudgetUsd={data.dailyBudgetUsd} />
                    </>
                  ) : view === 'donut' ? (
                    <DonutCostChart matrix={matrix} />
                  ) : view === 'token-split' ? (
                    <TokenBreakdownChart matrix={matrix} />
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
                        <Icon
                          name={showTable ? 'expand_less' : 'table_view'}
                          className="text-[18px]"
                        />
                        {showTable ? 'Ẩn bảng số liệu' : 'Xem bảng số liệu'}
                      </button>
                      {showTable && <CostTable matrix={matrix} />}
                    </div>
                  )}
                </div>

              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};
