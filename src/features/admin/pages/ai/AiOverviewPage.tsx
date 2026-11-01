import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { AdminQueryError, CARD, StatusBadge } from '../../components/AdminUi';
import { TopSpendersCard } from '../../components/TopSpendersCard';
import { useAiMetrics, useKnowledgeStatus, useLlmopsDashboard } from '../../hooks/useAdminAi';
import { CIRCUIT_STATE } from '../../lib/labels';
import { budgetLevel, formatTokens, formatUsd, vnDate } from '../../lib/llmops';

export const AiOverviewPage: React.FC = () => {
  const today = vnDate();
  const from = vnDate(29); // Mặc định 30 ngày
  const to = today;

  const dashboard = useLlmopsDashboard({ from, to });
  const metrics = useAiMetrics({ from, to });
  const kb = useKnowledgeStatus();

  const data = dashboard.data;
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
      ) : dashboard.isError && !dashboard.data ? (
        <AdminQueryError error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : (
        <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Chi phí hôm nay */}
          <div className={cn(CARD, 'flex flex-col justify-between p-space-md')}>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Chi phí hôm nay</span>
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
              <p className="font-headline-md text-headline-md text-on-surface">{formatUsd(data.totalCostUsd)}</p>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant">
              Định mức: {formatUsd(data.dailyBudgetUsd * 30)}/tháng
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
                {formatTokens(data.totalTokens)}
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
              <p className="font-label-sm text-label-sm text-on-surface-variant">Kho tri thức Qdrant:</p>
              <p className="font-headline-sm text-headline-sm text-on-surface">
                {kb.data ? `${formatNumber(kb.data.totalPoints)} điểm` : 'Đang tải...'}
              </p>
            </div>
            <p className="font-body-xs text-body-xs text-on-surface-variant truncate">
              {kb.data?.lastIndexedAt ? `Đồng bộ: ${formatServerDateTime(kb.data.lastIndexedAt)}` : 'Chưa đồng bộ'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Lối tắt Điều hướng Nhanh (Navigation Bento Grid) */}
      <div className="flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Phân hệ Quản lý Chi tiết</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Truy cập nhanh vào các tính năng giám sát, phân tích và cấu hình AI chuyên sâu:
        </p>

        <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-4 mt-2">
          {/* Bento 1: Phân tích Chi phí */}
          <Link
            to={PATHS.ADMIN.AI_ANALYTICS}
            className={cn(
              CARD,
              'group flex flex-col justify-between p-space-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline border border-outline-variant hover:border-primary'
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                <Icon name="analytics" className="text-[26px]" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
                Phân tích Chi phí & Token
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Biểu đồ chi phí theo ngày và tính năng, phân rã Input/Output, phân bổ theo Hạng hội viên.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 font-label-md text-label-md font-semibold text-primary">
              Xem biểu đồ chi tiết
              <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Bento 2: Nhật ký cuộc gọi */}
          <Link
            to={PATHS.ADMIN.AI_LOGS}
            className={cn(
              CARD,
              'group flex flex-col justify-between p-space-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline border border-outline-variant hover:border-primary'
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-on-secondary">
                <Icon name="receipt_long" className="text-[26px]" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
                Nhật ký cuộc gọi (Logs)
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Toàn văn lịch sử gọi AI, tra cứu prompt, response, latency (ms), token và trace ID.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 font-label-md text-label-md font-semibold text-primary">
              Tra cứu bảng logs
              <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Bento 3: Kho tri thức RAG */}
          <Link
            to={PATHS.ADMIN.AI_RAG}
            className={cn(
              CARD,
              'group flex flex-col justify-between p-space-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline border border-outline-variant hover:border-primary'
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high text-on-surface">
                <Icon name="database" className="text-[26px]" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
                Kho tri thức RAG (Qdrant)
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Giám sát số lượng vector điểm theo 4 nguồn tri thức và kích hoạt đồng bộ lại Qdrant.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 font-label-md text-label-md font-semibold text-primary">
              Quản trị vector DB
              <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Bento 4: Chất lượng AI & SLA */}
          <Link
            to={PATHS.ADMIN.AI_QUALITY}
            className={cn(
              CARD,
              'group flex flex-col justify-between p-space-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline border border-outline-variant hover:border-primary'
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <Icon name="verified" className="text-[26px]" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
                Chất lượng AI & SLA
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Trạng thái ngắt mạch tự động, cảnh báo suy giảm độ chính xác và ma trận đánh giá lỗi.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 font-label-md text-label-md font-semibold text-primary">
              Kiểm tra SLA & độ trễ
              <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Phân bổ Hạng & Top Tài khoản tiêu thụ nổi bật */}
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
