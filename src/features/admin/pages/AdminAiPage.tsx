import React, { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { notifySuccess } from '@/lib/notify';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, ServerMessageDialog, StatRow, StatusBadge, TD, TH, TableShell } from '../components/AdminUi';
import { CostLegend, CostTable, DailyCostChart, FeatureCostBars } from '../components/CostChart';
import { TopSpendersCard } from '../components/TopSpendersCard';
import { LlmopsLogTable } from '../components/LlmopsLogTable';
import { useAiMetrics, useKnowledgeStatus, useLlmopsDashboard, useReindexKnowledge } from '../hooks/useAdminAi';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { AI_MODULE_LABEL, CIRCUIT_STATE, KNOWLEDGE_SCOPE_LABEL, KNOWLEDGE_SOURCE_LABEL, aiModuleLabel } from '../lib/labels';
import { budgetLevel, buildCostMatrix, formatTokens, formatUsd, vnDate } from '../lib/llmops';
import { formatServerDateTime } from '@/lib/serverDate';
import { handleWriteError } from '../lib/writeError';
import type { AiModule, AiModuleMetric, KnowledgeScope, KnowledgeSource } from '../types/admin.types';

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

/**
 * SCR-41 admin/LlmOps + AiQuality + KnowledgeBase · `/admin/ai`
 * FN-ADM-16 chi phí token (GET /admin/llmops/dashboard), FN-ADM-15 chất lượng (GET /admin/ai/metrics),
 * FN-CHAT-07 kho tri thức Qdrant (GET /admin/knowledge/status, POST /admin/knowledge/reindex).
 * Bộ lọc ngày nằm trên cùng và áp cho mọi phần bên dưới.
 */
const AdminAiPage: React.FC = () => {
  const { get, set } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;
  const module = (Object.keys(AI_MODULE_LABEL) as string[]).includes(get('module')) ? (get('module') as AiModule) : undefined;
  const rangeError = from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : to > today ? 'Ngày kết thúc không được sau hôm nay.' : null;
  const preset = PRESETS.find((days) => from === vnDate(days - 1) && to === today);

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader title="Giám sát AI" description="Chi phí token, chất lượng câu trả lời và kho tri thức của chatbot RAG." />

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
          Tính năng (chất lượng)
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

      {rangeError ? (
        <FormAlert tone="warning">{rangeError}</FormAlert>
      ) : (
        <>
          <CostSection from={from} to={to} />
          <QualitySection from={from} to={to} module={module} />
        </>
      )}
      <KnowledgeSection />
    </div>
  );
};

const CostSection: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const dashboard = useLlmopsDashboard({ from, to });
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  const [view, setView] = useState<'day' | 'feature'>('day');
  const [showTable, setShowTable] = useState(false);
  const matrix = useMemo(() => buildCostMatrix(dashboard.data?.series ?? []), [dashboard.data]);

  if (dashboard.isPending) {
    return (
      <section aria-busy="true" aria-label="Đang tải chi phí AI" className="flex flex-col gap-space-md">
        <div className="grid gap-space-md sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className={cn(CARD, 'h-28 animate-pulse')} />
          ))}
        </div>
        <div className={cn(CARD, 'h-80 animate-pulse')} />
      </section>
    );
  }
  if (dashboard.isError && !dashboard.data) {
    return (
      <section aria-labelledby="cost-title" className="flex flex-col gap-space-sm">
        <h2 id="cost-title" className="font-headline-sm text-headline-sm text-on-surface">Chi phí AI</h2>
        <AdminQueryError error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      </section>
    );
  }

  const data = dashboard.data;
  const level = budgetLevel(data.usagePercent);
  const meterColor = level === 'throttled' ? 'bg-error' : level === 'warning' ? 'bg-warning' : 'bg-primary';

  const promptTokens = data.totalPromptTokens ?? 0;
  const completionTokens = data.totalCompletionTokens ?? 0;
  const hasTokenBreakdown = promptTokens + completionTokens > 0;
  const promptPercent = hasTokenBreakdown ? (promptTokens / (promptTokens + completionTokens)) * 100 : 0;
  const completionPercent = hasTokenBreakdown ? (completionTokens / (promptTokens + completionTokens)) * 100 : 0;

  return (
    <section aria-labelledby="cost-title" className={cn('flex flex-col gap-space-md', dashboard.isPlaceholderData && 'opacity-60 transition-opacity')}>
      <h2 id="cost-title" className="font-headline-sm text-headline-sm text-on-surface">
        Chi phí AI
      </h2>

      {level !== 'ok' && (
        <FormAlert tone={level === 'throttled' ? 'error' : 'warning'} title={level === 'throttled' ? 'Đã chạm 100% ngân sách ngày' : 'Đã dùng từ 80% ngân sách ngày'}>
          {level === 'throttled'
            ? 'Hệ thống đang hạ tải: chuyển sang bộ nhớ đệm và mô hình nội bộ tiết kiệm cho tới hết ngày.'
            : 'Chi phí sắp chạm hạn mức; khi tới 100% hệ thống sẽ tự hạ tải.'}
        </FormAlert>
      )}

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

      {/* Tabs chuyển đổi giữa Tổng quan & Biểu đồ và Nhật ký cuộc gọi */}
      <div className="flex border-b border-surface-container gap-6">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={cn(
            'flex items-center gap-2 pb-3 font-label-lg text-label-lg transition-colors border-b-2 -mb-px',
            activeTab === 'overview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          )}
        >
          <Icon name="monitoring" className="text-[20px]" />
          Tổng quan & Biểu đồ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'logs'}
          onClick={() => setActiveTab('logs')}
          className={cn(
            'flex items-center gap-2 pb-3 font-label-lg text-label-lg transition-colors border-b-2 -mb-px',
            activeTab === 'logs'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          )}
        >
          <Icon name="receipt_long" className="text-[20px]" />
          Nhật ký cuộc gọi (Logs)
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
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
        </>
      ) : (
        /* Khối Nhật ký cuộc gọi AI */
        <LlmopsLogTable from={from} to={to} />
      )}
    </section>
  );
};

const QualitySection: React.FC<{ from: string; to: string; module?: AiModule }> = ({ from, to, module }) => {
  const metrics = useAiMetrics({ from, to, module });

  return (
    <section aria-labelledby="quality-title" className="flex flex-col gap-space-md">
      <h2 id="quality-title" className="font-headline-sm text-headline-sm text-on-surface">
        Chất lượng AI
      </h2>
      {metrics.isPending ? (
        <div aria-busy="true" aria-label="Đang tải chất lượng AI" className={cn(CARD, 'h-48 animate-pulse')} />
      ) : metrics.isError && !metrics.data ? (
        <AdminQueryError error={metrics.error} onRetry={() => void metrics.refetch()} retrying={metrics.isRefetching} />
      ) : (
        <div className={cn('flex flex-col gap-space-md', metrics.isPlaceholderData && 'opacity-60 transition-opacity')}>
          <div className="flex flex-wrap gap-space-md">
            <CircuitBadge state={metrics.data.circuit?.state} />
            {metrics.data.modelDriftAlert ? (
              <FormAlert tone="error" title="Cảnh báo suy giảm độ chính xác (Model Drift)" className="min-w-0 flex-1">
                Đánh giá tiêu cực vượt 20% trong 07 ngày liên tiếp: cần rà soát lại prompt và cấu hình AI.
              </FormAlert>
            ) : (
              <FormAlert tone="success" className="min-w-0 flex-1">
                Không có cảnh báo suy giảm độ chính xác.
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
                  <th scope="col" className={TH}>Cờ chất lượng</th>
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
    </section>
  );
};

const CircuitBadge: React.FC<{ state?: string }> = ({ state }) => {
  const info = (state && CIRCUIT_STATE[state]) || { label: 'Không rõ', tone: 'neutral' as const, hint: 'Máy chủ chưa trả trạng thái ngắt mạch.' };
  return (
    <div className={cn(CARD, 'flex min-w-[240px] flex-col gap-1 px-4 py-3')}>
      <p className="font-label-sm text-label-sm text-on-surface-variant">Ngắt mạch AI</p>
      <StatusBadge tone={info.tone} icon={info.tone === 'success' ? 'check_circle' : 'power_off'} className="self-start">
        {info.label}
      </StatusBadge>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{info.hint}</p>
    </div>
  );
};

const KnowledgeSection: React.FC = () => {
  const status = useKnowledgeStatus();
  const reindex = useReindexKnowledge();
  const [scope, setScope] = useState<KnowledgeScope>('ALL');
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const run = () =>
    reindex.mutate(scope, {
      onSuccess: (res) => {
        notifySuccess(res.message || 'Đã xếp job đồng bộ kho tri thức.');
        setJobId(res.data?.jobId ?? null);
        setConfirming(false);
      },
      onError: (error) => {
        setConfirming(false);
        handleWriteError(error, { onConflict: setConflict });
      },
    });

  const sources = Object.entries(status.data?.bySource ?? {}) as [KnowledgeSource, number][];

  return (
    <section aria-labelledby="kb-title" className="flex flex-col gap-space-md">
      <h2 id="kb-title" className="font-headline-sm text-headline-sm text-on-surface">
        Kho tri thức chatbot (Qdrant)
      </h2>
      <div className={cn(CARD, 'grid gap-space-lg p-space-md sm:p-space-lg lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
        <div className="min-w-0">
          {status.isPending ? (
            <div aria-busy="true" aria-label="Đang tải trạng thái kho tri thức" className="h-48 animate-pulse rounded-xl bg-surface-container" />
          ) : status.isError && !status.data ? (
            <AdminQueryError error={status.error} onRetry={() => void status.refetch()} retrying={status.isRefetching} />
          ) : (
            <div className="flex flex-col gap-space-md">
              <dl className="grid gap-x-space-lg font-body-sm text-body-sm sm:grid-cols-2">
                <StatRow label="Bộ sưu tập">{status.data.collection || '–'}</StatRow>
                <StatRow label="Tổng số điểm">{formatNumber(status.data.totalPoints)}</StatRow>
                <StatRow label="Đồng bộ gần nhất">{formatServerDateTime(status.data.lastIndexedAt) || 'Chưa đồng bộ'}</StatRow>
                <StatRow label="Đang chờ / lỗi">
                  <span className={cn(status.data.failed > 0 && 'text-error')}>
                    {formatNumber(status.data.pending)} / {formatNumber(status.data.failed)}
                  </span>
                </StatRow>
              </dl>
              {status.data.failed > 0 && (
                <FormAlert tone="warning">{formatNumber(status.data.failed)} mục đồng bộ lỗi: thử "Đồng bộ lại" đúng nguồn bị lỗi.</FormAlert>
              )}
              {sources.length === 0 ? (
                <EmptyState icon="database" title="Kho tri thức đang trống" description="Chạy đồng bộ toàn bộ để nạp công thức, bài viết, video và từ điển vào chatbot." />
              ) : (
                <ul className="grid gap-x-space-lg gap-y-1 font-body-sm text-body-sm sm:grid-cols-2" aria-label="Số điểm theo nguồn">
                  {sources.map(([source, count]) => (
                    <li key={source} className="flex justify-between gap-2 border-b border-surface-container py-1.5">
                      <span className="text-on-surface-variant">{KNOWLEDGE_SOURCE_LABEL[source] ?? 'Nguồn khác'}</span>
                      <span className="font-medium tabular-nums text-on-surface">{formatNumber(count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <h3 className="font-label-lg text-label-lg text-on-surface">Đồng bộ lại</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Nạp lại nội dung đã duyệt vào Qdrant. Hệ thống vẫn tự cập nhật khi nội dung đổi trạng thái; chỉ cần chạy tay khi kho lệch hoặc có mục lỗi.
          </p>
          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface">
            Phạm vi
            <select value={scope} onChange={(e) => setScope(e.target.value as KnowledgeScope)} className={CONTROL}>
              {(Object.keys(KNOWLEDGE_SCOPE_LABEL) as KnowledgeScope[]).map((value) => (
                <option key={value} value={value}>
                  {KNOWLEDGE_SCOPE_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => setConfirming(true)} loading={reindex.isPending}>
            <Icon name="sync" className="text-[18px]" />
            Đồng bộ lại
          </Button>
          {jobId && (
            <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">
              Đã xếp job <span className="font-label-md text-label-md text-on-surface">{jobId}</span>; trạng thái tự làm mới khi còn mục đang chờ.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        show={confirming}
        title="Đồng bộ lại kho tri thức?"
        message={
          <>
            Phạm vi: <strong>{KNOWLEDGE_SCOPE_LABEL[scope]}</strong>. Job chạy nền, tạo lại embedding nên tốn token (tính vào chi phí AI của ngày hôm nay).
            Trong lúc chạy, chatbot vẫn trả lời bằng dữ liệu hiện có.
          </>
        }
        confirmLabel="Bắt đầu đồng bộ"
        loading={reindex.isPending}
        onConfirm={run}
        onCancel={() => !reindex.isPending && setConfirming(false)}
      />
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </section>
  );
};

export default AdminAiPage;
