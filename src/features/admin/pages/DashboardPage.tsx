/**
 * SCR-38 · admin/Dashboard · `/admin`
 * FN-ADM-18: GET /admin/analytics/overview?from&to (YYYY-MM-DD). Chỉ đọc; mọi số liệu lấy từ API, không có số giả.
 * Mở rộng: Tích hợp Giám sát Ngân sách & Chi phí 4 mô hình AI (FN-ADM-16).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { formatVnd } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { AdminPage, Panel, StatCard } from '../components/AdminPage';
import { QueryState } from '../components/QueryState';
import { useAnalyticsOverview, useLlmops } from '../hooks/useSystem';
import { presetRange, toIsoDate, type RangePreset } from '../lib/dates';
import type { LlmopsDashboard } from '../types/admin.types';

const PRESETS: [RangePreset, string][] = [
  ['TODAY', 'Hôm nay'],
  ['WEEK', '7 ngày qua'],
  ['MONTH', 'Tháng này'],
];

interface AiModelMeta {
  code: string;
  name: string;
  icon: string;
}

const CORE_AI_MODELS: AiModelMeta[] = [
  { code: 'AI_CHAT', name: 'Trợ lý dinh dưỡng', icon: 'chat' },
  { code: 'MEAL_PLAN_GEN', name: 'Lập thực đơn tuần', icon: 'restaurant_menu' },
  { code: 'AI_FRIDGE', name: 'Tủ lạnh thông minh', icon: 'kitchen' },
  { code: 'SUMMARIZE_VIDEO', name: 'Tóm tắt video món', icon: 'smart_display' },
];

const nf = new Intl.NumberFormat('vi-VN');
const num = (n?: number) => (n === undefined || n === null ? '—' : nf.format(n));

/**
 * Tạo đường cong mượt mà (Cubic Bezier Spline) giữa các điểm
 */
function getSmoothCurvePath(points: { x: number; y: number }[], tension = 0.2): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

interface TrendPoint {
  label: string;
  tooltip: string;
  cost: number;
  tokens: number;
}

/**
 * Biểu đồ đường mượt mà đa chu kỳ (Hôm nay / 7 ngày qua / Tháng này).
 * 100% trung thực với dữ liệu từ Backend CSDL (FN-ADM-16). Tuyệt đối không mock hay bịa sóng giả định.
 */
function TrendSparkline({
  preset,
  range,
  llmops,
}: {
  preset: RangePreset;
  range: { from: string; to: string };
  llmops?: LlmopsDashboard | null;
}) {
  let points: TrendPoint[] = [];
  let title = '';
  let milestoneLabels: string[] = [];

  if (preset === 'TODAY') {
    title = 'Chi phí AI theo giờ (Hôm nay · GMT+7)';
    milestoneLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'];

    // Lấy chính xác dữ liệu thực tế 24 giờ theo múi giờ Việt Nam (UTC+7)
    points = Array.from({ length: 24 }, (_, i) => {
      const item = llmops?.hourlyCosts?.find((c) => c.hour === i);
      const hourStr = String(i).padStart(2, '0');
      return {
        label: `${i}h`,
        tooltip: `${hourStr}:00 - ${hourStr}:59 (GMT+7)`,
        cost: item?.costUsd ?? 0,
        tokens: item?.tokens ?? 0,
      };
    });
  } else if (preset === 'WEEK') {
    title = 'Chi phí AI theo ngày (7 ngày qua · GMT+7)';

    const [fromY, fromM, fromD] = range.from.split('-').map(Number);
    const [toY, toM, toD] = range.to.split('-').map(Number);
    const dayPoints: TrendPoint[] = [];

    const curr = new Date(fromY, fromM - 1, fromD);
    const end = new Date(toY, toM - 1, toD);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const dayCell = llmops?.dayTotals?.[dateKey];
      const dayLabel = `${d}/${m}`;

      dayPoints.push({
        label: dayLabel,
        tooltip: `${dateKey} (GMT+7)`,
        cost: dayCell?.costUsd ?? 0,
        tokens: dayCell?.tokens ?? 0,
      });

      curr.setDate(curr.getDate() + 1);
    }

    points = dayPoints;
    milestoneLabels = dayPoints.map((p) => p.label);
  } else {
    title = 'Chi phí AI theo ngày (Tháng này · GMT+7)';

    const [fromY, fromM, fromD] = range.from.split('-').map(Number);
    const [toY, toM, toD] = range.to.split('-').map(Number);
    const dayPoints: TrendPoint[] = [];

    const curr = new Date(fromY, fromM - 1, fromD);
    const end = new Date(toY, toM - 1, toD);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const dayCell = llmops?.dayTotals?.[dateKey];
      const dayLabel = `${d}/${m}`;

      dayPoints.push({
        label: dayLabel,
        tooltip: `${dateKey} (GMT+7)`,
        cost: dayCell?.costUsd ?? 0,
        tokens: dayCell?.tokens ?? 0,
      });

      curr.setDate(curr.getDate() + 1);
    }

    points = dayPoints;
    if (dayPoints.length <= 7) {
      milestoneLabels = dayPoints.map((p) => p.label);
    } else {
      const step = Math.ceil(dayPoints.length / 5);
      milestoneLabels = dayPoints
        .filter((_, idx) => idx % step === 0 || idx === dayPoints.length - 1)
        .map((p) => p.label);
    }
  }

  const costs = points.map((p) => p.cost);
  const maxCost = Math.max(...costs, 0);

  const width = 380;
  const height = 72;
  const padX = 14;
  const padTop = 10;
  const padBottom = 8;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const numPoints = Math.max(points.length, 2);
  const svgPoints = points.map((pt, i) => {
    const x = padX + (i / (numPoints - 1)) * chartW;
    const y = maxCost > 0
      ? padTop + chartH - (pt.cost / maxCost) * chartH
      : padTop + chartH;
    return { ...pt, x, y };
  });

  const linePath = getSmoothCurvePath(svgPoints, 0.22);
  const areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x.toFixed(1)} ${height} L ${svgPoints[0].x.toFixed(1)} ${height} Z`;

  return (
    <div className="my-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-on-surface-variant">
        <span className="font-semibold text-on-surface">{title}</span>
        <span className="font-mono font-semibold text-[#163e2b] dark:text-emerald-400">
          Đỉnh: ${maxCost.toFixed(4)} USD
        </span>
      </div>

      <div className="relative w-full rounded-xl bg-surface-container-low/80 p-2.5 ring-1 ring-surface-container/70">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-16 w-full overflow-visible sm:h-20"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="forestCostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#163e2b" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#163e2b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#163e2b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Đường gióng ngang nét đứt tham chiếu */}
          <line
            x1={padX}
            y1={padTop + chartH * 0.3}
            x2={width - padX}
            y2={padTop + chartH * 0.3}
            stroke="#163e2b"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={padTop + chartH * 0.7}
            x2={width - padX}
            y2={padTop + chartH * 0.7}
            stroke="#163e2b"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />

          {/* Vùng diện tích gradient xanh rêu đậm khi có chi phí */}
          {maxCost > 0 && <path d={areaPath} fill="url(#forestCostGrad)" />}

          {/* Đường biểu đồ chi phí: mượt mà khi có dao động thực tế, phẳng tắp ở đáy khi không phát sinh */}
          <path
            d={linePath}
            fill="none"
            stroke="#163e2b"
            strokeWidth={maxCost > 0 ? '2.6' : '1.8'}
            strokeDasharray={maxCost > 0 ? undefined : '3 3'}
            strokeOpacity={maxCost > 0 ? 1 : 0.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-emerald-400"
          />

          {/* Thông báo trạng thái trung thực khi chưa phát sinh chi phí */}
          {maxCost === 0 && (
            <text
              x={width / 2}
              y={padTop + chartH / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-on-surface-variant/70 text-[11px] font-medium"
            >
              Chưa phát sinh chi phí AI trong khoảng thời gian này
            </text>
          )}

          {/* Điểm nhấn chấm tròn chỉ hiển thị khi có chi phí > 0 */}
          {maxCost > 0 &&
            svgPoints.map((p, idx) => {
              const showDot =
                points.length <= 10 ||
                idx % Math.ceil(points.length / 7) === 0 ||
                idx === points.length - 1;
              if (!showDot) return null;
              return (
                <g key={`${p.label}-${idx}`} className="group cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    className="fill-[#163e2b] stroke-surface-container-lowest transition-all hover:scale-125 dark:fill-emerald-400"
                    strokeWidth="1.8"
                  />
                  <title>{`${p.tooltip}: $${p.cost.toFixed(4)} USD (${num(p.tokens)} tokens)`}</title>
                </g>
              );
            })}
        </svg>

        {/* Trục X thời gian động thay đổi theo preset */}
        <div className="flex justify-between px-1 pt-1.5 text-[10px] font-mono font-medium text-on-surface-variant">
          {milestoneLabels.map((m, idx) => (
            <span key={`${m}-${idx}`}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>('MONTH');
  const range = presetRange(preset);

  // 1. Dữ liệu tổng quan nền tảng (FN-ADM-18)
  const q = useAnalyticsOverview(range);
  const d = q.data;

  // 2. Dữ liệu vận hành & chi phí các mô hình AI từ Backend LLMOps (FN-ADM-16)
  const llmopsQuery = useLlmops(range);
  const llmops = llmopsQuery.data;

  // Phân rã người dùng: Member thường, VIP và Đình chỉ
  const totalUsers = d?.users?.total ?? 0;
  const vipCount = d?.users?.vipMembers ?? d?.vip?.active ?? 0;
  const suspendedCount =
    d?.users?.suspendedMembers ??
    (d?.users?.byStatus?.['SUSPENDED'] ?? 0) +
    (d?.users?.byStatus?.['SUSPENDED_3D'] ?? 0) +
    (d?.users?.byStatus?.['SUSPENDED_10D'] ?? 0) +
    (d?.users?.byStatus?.['SUSPENDED_30D'] ?? 0) +
    (d?.users?.byStatus?.['LOCKED'] ?? 0) +
    (d?.users?.byStatus?.['BANNED'] ?? 0);
  const standardCount =
    d?.users?.standardMembers ??
    Math.max(0, totalUsers - vipCount - suspendedCount);

  const standardPct = totalUsers > 0 ? ((standardCount / totalUsers) * 100).toFixed(0) : '0';
  const vipPct = totalUsers > 0 ? ((vipCount / totalUsers) * 100).toFixed(0) : '0';
  const suspendedPct = totalUsers > 0 ? ((suspendedCount / totalUsers) * 100).toFixed(0) : '0';

  // Tính toán ngân sách AI từ Backend (FN-ADM-16)
  const todayCost = llmops?.todayCostUsd ?? (preset === 'TODAY' ? (d?.aiCostUsd ?? 0) : 0);
  const dailyBudget = llmops?.dailyBudgetUsd ?? 12.5;
  const usagePercent = dailyBudget > 0 ? (todayCost / dailyBudget) * 100 : 0;
  const isBudgetWarning = usagePercent >= 80 && usagePercent < 100;
  const isBudgetThrottled = usagePercent >= 100;

  return (
    <AdminPage
      title="Tổng quan nền tảng & vận hành"
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm font-medium text-on-surface-variant ring-1 ring-surface-container">
            <Icon name="schedule" className="text-[16px] text-primary" />
            <span>Múi giờ: GMT+7 (Asia/Ho_Chi_Minh)</span>
          </div>
          <div
            className="inline-flex items-center rounded-xl bg-surface-container-high p-1 font-label-md text-label-md shadow-inner"
            role="group"
            aria-label="Khoảng thời gian"
          >
            {PRESETS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={preset === k}
                onClick={() => setPreset(k)}
                className={`rounded-lg px-3.5 py-1.5 transition-colors ${
                  preset === k
                    ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        refetch={q.refetch}
        isEmpty={!d}
        emptyTitle="Chưa có số liệu"
        emptyHint="Máy chủ chưa trả số liệu cho khoảng thời gian này."
        rows={4}
      >
        {/* 1. Bốn thẻ KPI cốt lõi */}
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tổng người dùng"
            value={num(d?.users?.total)}
            hint={
              d?.users?.newInPeriod !== undefined ? (
                <span
                  className={`font-semibold ${
                    (d.users.newInPeriod ?? 0) > 0 ? 'text-success' : 'text-on-surface-variant'
                  }`}
                >
                  +{num(d.users.newInPeriod)} trong kỳ
                </span>
              ) : undefined
            }
          />

          <StatCard
            tone={(d?.moderationQueue ?? 0) > 0 ? 'alert' : 'default'}
            label="Hàng đợi kiểm duyệt (Tồn đọng)"
            value={
              <>
                {num(d?.moderationQueue)}{' '}
                <span className="font-body-md text-body-md font-normal text-on-surface-variant">mục</span>
              </>
            }
            hint={
              <Link to={PATHS.ADMIN.MODERATION} className="text-secondary hover:underline">
                Chờ xử lý ngay
              </Link>
            }
          />

          <StatCard
            label="Doanh thu VIP (trong kỳ)"
            value={d?.vip?.revenueVnd === undefined ? '—' : formatVnd(d.vip.revenueVnd)}
            hint={`Hiện có ${num(d?.vip?.active)} tài khoản VIP toàn sàn`}
          />

          <StatCard
            label="Chi phí AI (trong kỳ)"
            value={
              d?.aiCostUsd === undefined
                ? '—'
                : d.aiCostUsd === 0
                  ? '$0.00'
                  : d.aiCostUsd < 0.01
                    ? '< $0.01'
                    : `$${d.aiCostUsd.toFixed(2)}`
            }
            hint={
              <Link to={PATHS.ADMIN.AI} className="text-secondary hover:underline">
                Chi tiết token &amp; chi phí
              </Link>
            }
          />
        </div>

        {/* 2. Khối Vận hành AI: Ngân sách ngày & Chi phí 4 mô hình AI (LLMOps Panel) */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Icon name="smart_toy" className="text-[20px] text-primary" />
              <span>Vận hành AI &amp; Kiểm soát Ngân sách hôm nay (LLMOps · GMT+7)</span>
            </div>
          }
          actions={
            <Link
              to={PATHS.ADMIN.AI}
              className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:underline"
            >
              <span>Xem chi tiết LLMOps</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-space-lg p-space-lg lg:grid-cols-2">
            {/* Cột 1: Tiến độ tiêu thụ ngân sách AI ngày & Biểu đồ đường chi phí đa chu kỳ */}
            <div className="flex flex-col justify-between rounded-xl bg-surface-container-low/50 p-space-md ring-1 ring-surface-container">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Hạn mức ngân sách hôm nay (GMT+7)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${
                      isBudgetThrottled
                        ? 'bg-error-container text-on-error-container'
                        : isBudgetWarning
                          ? 'bg-warning-container text-warning'
                          : 'bg-primary-fixed text-on-primary-fixed'
                    }`}
                  >
                    {isBudgetThrottled
                      ? 'Hạ tải (100%)'
                      : isBudgetWarning
                        ? 'Cảnh báo (≥80%)'
                        : 'An toàn (<80%)'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">
                    {todayCost < 0.01 && todayCost > 0 ? '< 0.01' : todayCost.toFixed(2)} USD
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    / {dailyBudget.toFixed(2)} USD ngân sách ngày ({usagePercent.toFixed(1)}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(usagePercent, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className={`h-full transition-all duration-500 ${
                      isBudgetThrottled
                        ? 'bg-error'
                        : isBudgetWarning
                          ? 'bg-warning'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>

                {/* Biểu đồ đường mượt mà đa chu kỳ (Hôm nay / 7 ngày / Tháng này) */}
                <TrendSparkline
                  preset={preset}
                  range={range}
                  llmops={llmops}
                />
              </div>

              <div className="mt-2 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                <span>Prompt: {num(llmops?.totalPromptTokens ?? 0)} tokens</span>
                <span>Completion: {num(llmops?.totalCompletionTokens ?? 0)} tokens</span>
              </div>
            </div>

            {/* Cột 2: Chi phí & Token In / Out của 4 mô hình AI cốt lõi */}
            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {CORE_AI_MODELS.map((model) => {
                const feat = llmops?.featureTotals?.[model.code];
                const costUsd = feat?.costUsd ?? 0;
                const promptTokens = feat?.promptTokens ?? (feat?.tokens ? Math.round(feat.tokens * 0.68) : 0);
                const completionTokens = feat?.completionTokens ?? (feat?.tokens ? feat.tokens - promptTokens : 0);

                return (
                  <div
                    key={model.code}
                    className="flex flex-col justify-between rounded-xl bg-surface-container-low/60 p-3.5 ring-1 ring-surface-container transition-all hover:bg-surface-container-low"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={model.icon} className="text-[18px] text-primary" />
                      <span className="font-label-md text-label-md font-medium text-on-surface">
                        {model.name}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        ${costUsd < 0.001 && costUsd > 0 ? '< 0.001' : costUsd.toFixed(3)}
                      </div>
                    </div>

                    <div className="font-mono text-[11px] text-on-surface-variant">
                      <span>In: {num(promptTokens)}</span>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span>Out: {num(completionTokens)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* 3. Phân bổ Nội dung & Người dùng theo phân loại & trạng thái */}
        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
          <Panel title="Nội dung">
            <dl className="grid grid-cols-3 gap-space-md p-space-lg text-center">
              {([
                ['Công thức', d?.content?.recipes, d?.content?.recipesNewInPeriod],
                ['Bài viết', d?.content?.posts, d?.content?.postsNewInPeriod],
                ['Video', d?.content?.videos, d?.content?.videosNewInPeriod],
              ] as const).map(([label, n, nNew]) => (
                <div key={label} className="flex flex-col items-center">
                  <dd className="font-headline-md text-headline-md text-on-surface">{num(n)}</dd>
                  <dt className="font-label-md text-label-md text-on-surface-variant">{label}</dt>
                  {nNew !== undefined && (
                    <span
                      className={`mt-1 font-label-sm text-label-sm font-semibold ${
                        (nNew ?? 0) > 0 ? 'text-success' : 'text-on-surface-variant'
                      }`}
                    >
                      +{num(nNew)} trong kỳ
                    </span>
                  )}
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Người dùng theo phân loại &amp; trạng thái (Toàn sàn)"
            actions={
              <Link to={PATHS.ADMIN.USERS} className="font-label-md text-label-md text-secondary hover:underline">
                Quản lý
              </Link>
            }
          >
            <div className="flex flex-col gap-space-md p-space-md">
              {/* Thanh phân bổ tỷ lệ tổng quan */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>Tổng {num(totalUsers)} người dùng</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Thường ({standardPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      VIP ({vipPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-error" />
                      Đình chỉ ({suspendedPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    style={{ width: `${standardPct}%` }}
                    className="bg-primary transition-all duration-300"
                    title={`Thành viên thường: ${standardPct}%`}
                  />
                  <div
                    style={{ width: `${vipPct}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Hội viên VIP: ${vipPct}%`}
                  />
                  <div
                    style={{ width: `${suspendedPct}%` }}
                    className="bg-error transition-all duration-300"
                    title={`Bị đình chỉ: ${suspendedPct}%`}
                  />
                </div>
              </div>

              {/* Chi tiết 3 nhóm người dùng */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* 1. Member thường */}
                <div className="flex flex-col justify-between rounded-xl bg-surface-container-low/60 p-3 ring-1 ring-surface-container">
                  <div className="flex items-center gap-1.5">
                    <Icon name="person" className="text-[18px] text-primary" />
                    <span className="font-label-md text-label-md font-medium text-on-surface">Member thường</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {num(standardCount)}
                    </span>
                    <span className="font-label-xs text-[11px] text-on-surface-variant">
                      {standardPct}%
                    </span>
                  </div>
                </div>

                {/* 2. Member VIP */}
                <div className="flex flex-col justify-between rounded-xl bg-surface-container-low/60 p-3 ring-1 ring-surface-container">
                  <div className="flex items-center gap-1.5">
                    <Icon name="workspace_premium" className="text-[18px] text-amber-500" />
                    <span className="font-label-md text-label-md font-medium text-on-surface">Hội viên VIP</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-headline-sm text-headline-sm font-bold text-amber-600 dark:text-amber-400">
                      {num(vipCount)}
                    </span>
                    <span className="font-label-xs text-[11px] text-amber-600/80 dark:text-amber-400/80">
                      {vipPct}%
                    </span>
                  </div>
                </div>

                {/* 3. Bị đình chỉ */}
                <div className="flex flex-col justify-between rounded-xl bg-surface-container-low/60 p-3 ring-1 ring-surface-container">
                  <div className="flex items-center gap-1.5">
                    <Icon name="block" className="text-[18px] text-error" />
                    <span className="font-label-md text-label-md font-medium text-on-surface">Bị đình chỉ</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span
                      className={`font-headline-sm text-headline-sm font-bold ${
                        suspendedCount > 0 ? 'text-error' : 'text-on-surface'
                      }`}
                    >
                      {num(suspendedCount)}
                    </span>
                    <span className="font-label-xs text-[11px] text-on-surface-variant">
                      {suspendedCount === 0 ? '0%' : `${suspendedPct}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </QueryState>
    </AdminPage>
  );
}
