import React from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FormAlert } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell } from '../../components/AdminUi';
import { useAiMetrics } from '../../hooks/useAdminAi';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { AI_MODULE_LABEL, CIRCUIT_STATE, aiModuleLabel } from '../../lib/labels';
import { vnDate } from '../../lib/llmops';
import type { AiModule, AiModuleMetric } from '../../types/admin.types';

const PRESETS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ngưỡng cờ chất lượng: tiêu cực > 20% (BR-ADM-AI-004), lỗi > 50% hoặc chậm quá 10 giây (BR-ADM-AI-002). */
function qualityFlags(metric: AiModuleMetric): string[] {
  const flags: string[] = [];
  if (metric.negativeRate > 0.2) flags.push('Đánh giá tiêu cực vượt 20%');
  if (metric.errorRate > 0.5) flags.push('Lỗi vượt 50%');
  if (metric.avgLatencyMs > 10000) flags.push('Phản hồi quá 10 giây');
  return flags;
}

const percent = (value: number) => `${formatNumber(Math.round(value * 1000) / 10)}%`;

const CircuitBadge: React.FC<{ state?: string }> = ({ state }) => {
  const info = (state && CIRCUIT_STATE[state]) || {
    label: 'Không rõ',
    tone: 'neutral' as const,
    hint: 'Máy chủ chưa trả trạng thái ngắt mạch.',
  };

  return (
    <div className={cn(CARD, 'flex min-w-[260px] flex-col gap-1 px-4 py-3')}>
      <p className="font-label-sm text-label-sm text-on-surface-variant">Cơ chế Ngắt mạch AI (Circuit Breaker)</p>
      <StatusBadge tone={info.tone} icon={info.tone === 'success' ? 'check_circle' : 'power_off'} className="self-start">
        {info.label}
      </StatusBadge>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{info.hint}</p>
    </div>
  );
};

/**
 * Trang Giám sát Chất lượng AI & SLA (SCR-41 · `/admin/ai/quality`).
 * Theo dõi tỷ lệ đánh giá tiêu cực, tỷ lệ lỗi, độ trễ và cảnh báo Model Drift.
 */
export const AiQualityPage: React.FC = () => {
  const { get, set } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;
  const module = (Object.keys(AI_MODULE_LABEL) as string[]).includes(get('module')) ? (get('module') as AiModule) : undefined;
  const rangeError = from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : to > today ? 'Ngày kết thúc không được sau hôm nay.' : null;
  const preset = PRESETS.find((days) => from === vnDate(days - 1) && to === today);

  const metrics = useAiMetrics({ from, to, module });

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Bộ lọc ngày và tính năng */}
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

      {metrics.isPending ? (
        <div aria-busy="true" aria-label="Đang tải chất lượng AI" className={cn(CARD, 'h-64 animate-pulse')} />
      ) : metrics.isError && !metrics.data ? (
        <AdminQueryError error={metrics.error} onRetry={() => void metrics.refetch()} retrying={metrics.isRefetching} />
      ) : (
        <div className={cn('flex flex-col gap-space-md', metrics.isPlaceholderData && 'opacity-60 transition-opacity')}>
          <div className="flex flex-wrap gap-space-md">
            <CircuitBadge state={metrics.data.circuit?.state} />
            {metrics.data.modelDriftAlert ? (
              <FormAlert tone="error" title="Cảnh báo suy giảm độ chính xác (Model Drift)" className="min-w-0 flex-1">
                Đánh giá tiêu cực vượt 20% trong 07 ngày liên tiếp: cần rà soát lại prompt và cấu hình mô hình AI.
              </FormAlert>
            ) : (
              <FormAlert tone="success" className="min-w-0 flex-1">
                Không có cảnh báo suy giảm độ chính xác (Model Drift) trong chu kỳ kiểm tra.
              </FormAlert>
            )}
          </div>

          {metrics.data.modules.length === 0 ? (
            <div className={CARD}>
              <EmptyState icon="monitoring" title="Chưa có dữ liệu chất lượng" description="Chưa có lượt gọi AI hoặc đánh giá nào trong khoảng thời gian đã chọn." />
            </div>
          ) : (
            <TableShell label="Chất lượng theo tính năng AI">
              <thead>
                <tr>
                  <th scope="col" className={TH}>Tính năng</th>
                  <th scope="col" className={`${TH} text-right`}>Đánh giá tiêu cực</th>
                  <th scope="col" className={`${TH} text-right`}>Tỷ lệ lỗi</th>
                  <th scope="col" className={`${TH} text-right`}>Độ trễ TB</th>
                  <th scope="col" className={TH}>Cờ chất lượng & SLA</th>
                </tr>
              </thead>
              <tbody>
                {metrics.data.modules.map((metric) => {
                  const flags = qualityFlags(metric);
                  return (
                    <tr key={metric.module}>
                      <td className={`${TD} font-label-md text-label-md`}>{aiModuleLabel(metric.module)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{percent(metric.negativeRate)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{percent(metric.errorRate)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatNumber(metric.avgLatencyMs)} ms</td>
                      <td className={TD}>
                        {flags.length === 0 ? (
                          <StatusBadge tone="success" icon="check">Ổn định</StatusBadge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {flags.map((flag) => (
                              <StatusBadge key={flag} tone="error" icon="flag">
                                {flag}
                              </StatusBadge>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          )}
        </div>
      )}
    </div>
  );
};

export default AiQualityPage;
