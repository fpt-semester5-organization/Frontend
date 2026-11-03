import React from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber } from '@/lib/format';
import { AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../../components/AdminUi';
import { SearchBox } from '../../components/SearchBox';
import { useAiMetrics, useAiSurveys } from '../../hooks/useAdminAi';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { vnDate } from '../../lib/llmops';
import type { AdminSurvey, AdminSurveyFilters, AiModuleMetric } from '../../types/admin.types';

const PRESETS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SURVEY_PAGE_SIZE = 10;

const RATING_FILTER_OPTIONS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: '5', label: '5 ★' },
  { key: '4', label: '4 ★' },
  { key: '3', label: '3 ★' },
  { key: 'NEGATIVE', label: '1-2 ★' },
] as const;

const percent = (value: number) => `${formatNumber(Math.round(value * 1000) / 10)}%`;

const RatingBadge: React.FC<{ score: number }> = ({ score }) => {
  const tone = score >= 4 ? 'success' : score === 3 ? 'neutral' : 'error';
  return (
    <StatusBadge tone={tone} icon="star" className="font-semibold">
      {score} sao
    </StatusBadge>
  );
};

/**
 * Trang Quản lý & Giám sát Chất lượng Chatbot AI (SCR-41 · `/admin/ai/quality`).
 * Thiết kế tinh giản chuẩn shadcn-admin: chỉ hiển thị 4 KPI cốt lõi và Bảng khảo sát người dùng.
 */
export const AiQualityPage: React.FC = () => {
  const { get, set } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;
  const rangeError = from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : to > today ? 'Ngày kết thúc không được sau hôm nay.' : null;
  const preset = PRESETS.find((days) => from === vnDate(days - 1) && to === today);

  const surveyRating = get('surveyRating') || 'ALL';
  const surveySearch = get('surveySearch') || '';
  const surveyPage = Math.max(1, Number(get('surveyPage')) || 1);

  const surveyFilters: AdminSurveyFilters = {
    rating: surveyRating === '5' ? 5 : surveyRating === '4' ? 4 : surveyRating === '3' ? 3 : undefined,
    isNegative: surveyRating === 'NEGATIVE' ? true : undefined,
    search: surveySearch || undefined,
    from,
    to,
    page: surveyPage,
    pageSize: SURVEY_PAGE_SIZE,
  };

  const metrics = useAiMetrics({ from, to, module: 'CHATBOT' });
  const surveys = useAiSurveys(surveyFilters);

  const chatbotMetric: AiModuleMetric | undefined = metrics.data?.modules?.[0];
  const totalCalls = (chatbotMetric as { totalRequests?: number })?.totalRequests ?? 0;
  const avgLatency = chatbotMetric?.avgLatencyMs ?? 0;

  const summary = surveys.data?.summary ?? {
    totalSurveys: 0,
    averageRating: 0,
    positiveCount: 0,
    positiveRate: 0,
    negativeCount: 0,
    negativeRate: 0,
    neutralCount: 0,
  };

  const surveyItems: AdminSurvey[] = surveys.data?.surveys.items ?? [];
  const totalSurveyItems = surveys.data?.surveys.totalItems ?? 0;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* 1. Bộ lọc khoảng thời gian */}
      <div className={cn(CARD, 'flex flex-wrap items-end gap-space-sm p-space-md')}>
        <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={preset === days}
              onClick={() => set({ from: vnDate(days - 1), to: today, surveyPage: 1 })}
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
          <input
            type="date"
            value={from}
            max={today}
            onChange={(e) => set({ from: e.target.value, surveyPage: 1 })}
            className={cn(CONTROL, 'w-[160px]')}
          />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
          Đến ngày
          <input
            type="date"
            value={to}
            max={today}
            onChange={(e) => set({ to: e.target.value, surveyPage: 1 })}
            className={cn(CONTROL, 'w-[160px]')}
          />
        </label>
      </div>

      {rangeError && <FormAlert tone="warning">{rangeError}</FormAlert>}

      {/* Chỉ hiển thị cảnh báo khi thực sự có sự cố (Circuit Breaker OPEN hoặc Model Drift) */}
      {metrics.data?.circuit?.state === 'OPEN' && (
        <FormAlert tone="error" title="Cơ chế Ngắt mạch đang kích hoạt (Circuit Breaker OPEN)">
          Hệ thống Chatbot đang tạm dừng phục vụ để ngăn chặn lỗi diện rộng.
        </FormAlert>
      )}
      {metrics.data?.modelDriftAlert && (
        <FormAlert tone="error" title="Cảnh báo suy giảm độ chính xác (Model Drift)">
          Tỷ lệ đánh giá tiêu cực của Chatbot vượt 20% trong 07 ngày liên tiếp.
        </FormAlert>
      )}

      {/* 2. Hàng 4 Thẻ KPI Cốt Lõi (Tinh giản, không có text dư thừa) */}
      <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className={cn(CARD, 'flex flex-col gap-1 p-4')}>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm">Tổng lượt trò chuyện</span>
            <Icon name="chat" className="text-[20px] text-primary" />
          </div>
          <div className="font-headline-md text-headline-md font-bold text-on-surface">
            {formatNumber(totalCalls)}
          </div>
        </div>

        <div className={cn(CARD, 'flex flex-col gap-1 p-4')}>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm">Độ trễ TB</span>
            <Icon name="timer" className={cn('text-[20px]', avgLatency > 10000 ? 'text-rose-600' : 'text-amber-500')} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {avgLatency > 0 ? formatNumber(avgLatency) : 0}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">ms</span>
          </div>
        </div>

        <div className={cn(CARD, 'flex flex-col gap-1 p-4')}>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm">Điểm đánh giá TB</span>
            <Icon name="star" className="text-[20px] text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">/ 5.0</span>
          </div>
        </div>

        <div className={cn(CARD, 'flex flex-col gap-1 p-4')}>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm">Đánh giá hài lòng</span>
            <Icon name="thumb_up" className="text-[20px] text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-md text-headline-md font-bold text-emerald-600">
              {percent(summary.positiveRate)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              ({formatNumber(summary.positiveCount)}/{formatNumber(summary.totalSurveys)})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bảng Khảo sát Phản hồi Người dùng */}
      <section className="flex flex-col gap-space-sm" aria-labelledby="surveys-table-heading">
        <h2 id="surveys-table-heading" className="sr-only">
          Danh sách Khảo sát Chatbot AI
        </h2>

        {/* Thanh lọc theo sao & ô tìm kiếm */}
        <div className={cn(CARD, 'flex flex-wrap items-center justify-between gap-space-sm p-space-md')}>
          <div role="group" aria-label="Lọc theo sao" className="flex flex-wrap items-center gap-2">
            {RATING_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={surveyRating === opt.key}
                onClick={() => set({ surveyRating: opt.key, surveyPage: 1 })}
                className={cn(
                  'h-9 rounded-lg border px-3 font-label-sm text-label-sm transition-colors',
                  surveyRating === opt.key
                    ? 'border-primary bg-primary text-on-primary font-medium'
                    : 'border-outline-variant text-on-surface hover:bg-surface-container'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <SearchBox
            value={surveySearch}
            onSearch={(keyword) => set({ surveySearch: keyword, surveyPage: 1 })}
            label="Tìm kiếm khảo sát"
            placeholder="Tìm theo câu hỏi, nhận xét, người dùng..."
            maxLength={100}
            className="w-full sm:w-[320px]"
          />
        </div>

        {/* Bảng dữ liệu 5 cột cốt lõi */}
        {surveys.isPending ? (
          <TableSkeleton rows={5} label="Đang tải danh sách khảo sát" />
        ) : surveys.isError && !surveys.data ? (
          <AdminQueryError error={surveys.error} onRetry={() => void surveys.refetch()} retrying={surveys.isRefetching} />
        ) : surveyItems.length === 0 ? (
          <div className={CARD}>
            <EmptyState
              icon="rate_review"
              title="Không có khảo sát nào"
              description="Không tìm thấy đánh giá nào phù hợp với bộ lọc hiện tại."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-space-sm">
            <TableShell label="Danh sách khảo sát người dùng">
              <thead>
                <tr>
                  <th scope="col" className={TH}>Người dùng</th>
                  <th scope="col" className={TH}>Đánh giá</th>
                  <th scope="col" className={TH}>Câu hỏi ngữ cảnh</th>
                  <th scope="col" className={TH}>Nội dung nhận xét</th>
                  <th scope="col" className={`${TH} text-right`}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {surveyItems.map((item) => (
                  <tr key={item.surveyId}>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        {item.userAvatarUrl ? (
                          <img
                            src={item.userAvatarUrl}
                            alt={item.userFullName}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-outline-variant"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container font-label-sm font-semibold">
                            {item.userFullName ? item.userFullName.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-label-md text-label-md font-medium text-on-surface">
                            {item.userFullName || 'Ẩn danh'}
                          </span>
                          <span className="truncate font-body-xs text-body-xs text-on-surface-variant">
                            {item.userEmail}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <RatingBadge score={item.ratingScore} />
                    </td>
                    <td className={TD}>
                      <p className="max-w-xs font-body-sm text-body-sm text-on-surface" title={item.contextQuestion}>
                        {item.contextQuestion}
                      </p>
                    </td>
                    <td className={TD}>
                      {item.feedbackContent ? (
                        <p className="max-w-md font-body-sm text-body-sm text-on-surface" title={item.feedbackContent}>
                          {item.feedbackContent}
                        </p>
                      ) : (
                        <span className="font-body-xs text-body-xs italic text-on-surface-variant">
                          Không có nhận xét
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap tabular-nums font-body-sm text-body-sm text-on-surface-variant`}>
                      {formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>

            <Pagination
              page={surveyPage}
              size={SURVEY_PAGE_SIZE}
              total={totalSurveyItems}
              onPageChange={(next) => set({ surveyPage: next })}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default AiQualityPage;
