import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { AdminQueryError, CARD, StatusBadge } from '../../components/AdminUi';
import { TopSpendersCard } from '../../components/TopSpendersCard';
import { useAiMetrics, useKnowledgeStatus, useLlmopsDashboard } from '../../hooks/useAdminAi';
import { CIRCUIT_STATE } from '../../lib/labels';
import { budgetLevel, buildCostMatrix, formatTokens, formatUsd, vnDate } from '../../lib/llmops';

/**
 * Trang Tổng quan Giám sát AI (Executive Overview Hub · `/admin/ai`).
 * Tập trung các chỉ số KPI tài chính tổng quan, trạng thái sức khỏe hệ thống và phân bổ tiêu thụ theo Người dùng.
 */
export const AiOverviewPage: React.FC = () => {
  const today = vnDate();
  const from = vnDate(29); // Mặc định 30 ngày
  const to = today;

  const dashboard = useLlmopsDashboard({ from, to });
  const metrics = useAiMetrics({ from, to });
  const kb = useKnowledgeStatus();

  const data = dashboard.data;
  const matrix = useMemo(() => buildCostMatrix(data?.series ?? []), [data]);

  const level = budgetLevel(data?.usagePercent ?? 0);
  const meterColor = level === 'throttled' ? 'bg-error' : level === 'warning' ? 'bg-warning' : 'bg-primary';

  const circuitState = metrics.data?.circuit?.state;
  const circuitInfo = (circuitState && CIRCUIT_STATE[circuitState]) || {
    label: 'Bình thường',
    tone: 'success' as const,
    hint: 'Các tính năng AI đang hoạt động ổn định.',
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Số liệu vận hành mô hình AI và ngân sách thời gian thực</span>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-[12px] font-medium text-on-surface-variant ring-1 ring-surface-container">
          <Icon name="schedule" className="text-[15px] text-primary" />
          <span>Múi giờ: GMT+7 (Asia/Ho_Chi_Minh)</span>
        </div>
      </div>

      {/* Cảnh báo ngân sách nếu vượt ngưỡng */}
      {level !== 'ok' && (
        <FormAlert
          tone={level === 'throttled' ? 'error' : 'warning'}
          title={level === 'throttled' ? 'Đã chạm 100% ngân sách ngày' : 'Đã dùng từ 80% ngân sách ngày'}
        >
          {level === 'throttled'
            ? 'Hệ thống đang hạ tải: chuyển sang bộ nhớ đệm và mô hình nội bộ tiết kiệm cho tới hết ngày.'
            : 'Chi phí sắp chạm hạn mức; khi tới 100% hệ thống sẽ tự hạ tải.'}
        </FormAlert>
      )}

      {/* 1. Hàng Thẻ KPI tóm tắt toàn diện */}
      {dashboard.isPending ? (
        <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className={cn(CARD, 'h-32 animate-pulse')} />
          ))}
        </div>
      ) : !data ? (
        <AdminQueryError error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : (
        <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Chi phí hôm nay */}
          <div className={cn(CARD, 'flex flex-col justify-between p-space-md')}>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Chi phí hôm nay (GMT+7)</span>
              <Icon name="today" className="text-[20px] text-primary" />
            </div>
            <div className="my-1">
              <p className="font-headline-md text-headline-md text-on-surface">{formatUsd(data.todayCostUsd)}</p>
              <div
                role="meter"
                aria-label="Mức dùng ngân sách ngày"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(data.usagePercent)}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-fixed"
              >
                <div className={cn('h-full rounded-full', meterColor)} style={{ width: `${Math.min(100, Math.max(0, data.usagePercent))}%` }} />
              </div>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant">
              {formatNumber(data.usagePercent)}% của {formatUsd(data.dailyBudgetUsd)}/ngày
            </p>
          </div>

          {/* Card 2: Tổng chi phí trong kỳ (30 ngày) */}
          <div className={cn(CARD, 'flex flex-col justify-between p-space-md')}>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Chi phí 30 ngày qua</span>
              <Icon name="date_range" className="text-[20px] text-info" />
            </div>
            <div className="my-1">
              <p className="font-headline-md text-headline-md text-on-surface">{formatUsd(matrix.total.costUsd)}</p>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant">
              {matrix.dates.length} ngày phát sinh · Hạn mức {formatUsd(data.dailyBudgetUsd * 30)}/tháng
            </p>
          </div>

          {/* Card 3: Token tiêu thụ */}
          <div className={cn(CARD, 'flex flex-col justify-between p-space-md')}>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Token tiêu thụ</span>
              <Icon name="token" className="text-[20px] text-secondary" />
            </div>
            <div className="my-1">
              <p className="font-headline-md text-headline-md text-on-surface">
                {formatTokens(matrix.total.tokens)}
              </p>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant">
              Input: {formatTokens(data.totalPromptTokens ?? 0)} · Output: {formatTokens(data.totalCompletionTokens ?? 0)}
            </p>
          </div>

          {/* Card 4: Sức khỏe AI & Kho tri thức */}
          <div className={cn(CARD, 'flex flex-col justify-between p-space-md')}>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Sức khỏe hệ thống</span>
              <StatusBadge tone={circuitInfo.tone} icon={circuitInfo.tone === 'success' ? 'check_circle' : 'warning'}>
                {circuitInfo.label}
              </StatusBadge>
            </div>
            <div className="my-1">
              <p className="font-headline-md text-headline-md text-on-surface">
                {kb.data ? `${formatNumber(kb.data.totalPoints)}` : '–'}
                <span className="ml-1 text-label-md font-normal text-on-surface-variant">vector</span>
              </p>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant truncate">
              {kb.data?.lastIndexedAt ? `Đồng bộ: ${formatServerDateTime(kb.data.lastIndexedAt)}` : 'Chưa đồng bộ'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Tiêu thụ theo Người dùng */}
      {data && (
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Tiêu thụ theo Người dùng</h3>
            <Link to={PATHS.ADMIN.AI_ANALYTICS} className="font-label-md text-label-md text-primary hover:underline">
              Xem toàn bộ phân tích chi phí &rarr;
            </Link>
          </div>
          <TopSpendersCard
            tierDistribution={data.userTierDistribution}
            topSpenders={data.topSpenders}
          />
        </div>
      )}
    </div>
  );
};

export default AiOverviewPage;
