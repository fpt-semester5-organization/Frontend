import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import {
  ALL_FEATURES,
  OTHER_FEATURE,
  featureColor,
  formatUsd,
  formatUsdExact,
  fullDate,
  niceTicks,
  shortDate,
  type CostMatrix,
} from '../lib/llmops';
import { featureLabel } from '../lib/labels';

const label = (feature: string) => (feature === OTHER_FEATURE ? 'Tính năng khác' : feature === ALL_FEATURES ? 'Tất cả tính năng' : featureLabel(feature));

/** Bề rộng thật của khung để vẽ SVG theo px (chữ không bị co giãn như viewBox). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Chú giải: luôn có khi ≥ 2 tính năng; ô vuông giống dạng cột. */
export const CostLegend: React.FC<{ features: string[] }> = ({ features }) =>
  features.length < 2 ? null : (
    <ul aria-label="Chú giải" className="flex flex-wrap gap-x-4 gap-y-1.5 font-body-sm text-body-sm text-on-surface-variant">
      {features.map((feature) => (
        <li key={feature} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: featureColor(feature) }} />
          {label(feature)}
        </li>
      ))}
    </ul>
  );

/** Góc trên bo 4px, đáy vuông (đầu dữ liệu bo, chân cột bám trục). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
}

const PLOT_HEIGHT = 240;
const MARGIN = { top: 16, right: 12, bottom: 28, left: 52 };
const GAP = 2;

/**
 * Cột chồng chi phí USD theo ngày, mỗi lớp là một tính năng (FN-ADM-16). Một trục y duy nhất (USD).
 * Đường ngân sách ngày chỉ vẽ khi cột cao nhất ≥ 50% ngân sách, để cột nhỏ không bị nén sát trục.
 */
export const DailyCostChart: React.FC<{ matrix: CostMatrix; dailyBudgetUsd?: number }> = ({ matrix, dailyBudgetUsd }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const showBudget = !!dailyBudgetUsd && matrix.maxDayCost >= dailyBudgetUsd * 0.5;
  const ticks = niceTicks(Math.max(matrix.maxDayCost, showBudget ? dailyBudgetUsd! : 0));
  const yMax = ticks[ticks.length - 1] || 1;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const count = matrix.dates.length;
  const band = count ? plotWidth / count : 0;
  const barWidth = Math.min(24, Math.max(4, band * 0.6));
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / 52))));
  const peakIndex = matrix.dates.reduce(
    (best, date, index) => (matrix.dayTotals[date].costUsd > matrix.dayTotals[matrix.dates[best]].costUsd ? index : best),
    0
  );
  const activeDate = active !== null ? matrix.dates[active] : null;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={MARGIN.top + PLOT_HEIGHT + MARGIN.bottom} role="group" aria-label="Biểu đồ chi phí AI theo ngày" className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-surface-container-high)" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-on-surface-variant font-body-sm text-[11px] tabular-nums">
                {formatUsd(tick)}
              </text>
            </g>
          ))}

          {matrix.dates.map((date, index) => {
            const x = MARGIN.left + index * band + (band - barWidth) / 2;
            const features = matrix.features.filter((feature) => (matrix.cells[date]?.[feature]?.costUsd ?? 0) > 0);
            let cursor = y(0);
            const dimmed = active !== null && active !== index;
            return (
              <g key={date || 'all'} opacity={dimmed ? 0.45 : 1} className="transition-opacity">
                {features.map((feature, layer) => {
                  const height = (matrix.cells[date][feature].costUsd / yMax) * PLOT_HEIGHT;
                  const top = cursor - height;
                  const bottomGap = layer === 0 ? 0 : GAP;
                  cursor = top;
                  const drawn = height - bottomGap;
                  if (drawn <= 0.5) return null;
                  return layer === features.length - 1 ? (
                    <path key={feature} d={topRounded(x, top, barWidth, drawn, 4)} fill={featureColor(feature)} />
                  ) : (
                    <rect key={feature} x={x} y={top} width={barWidth} height={drawn} fill={featureColor(feature)} />
                  );
                })}
                {index === peakIndex && matrix.dayTotals[date].costUsd > 0 && (
                  <text x={x + barWidth / 2} y={y(matrix.dayTotals[date].costUsd) - 6} textAnchor="middle" className="fill-on-surface font-label-sm text-[11px] tabular-nums">
                    {formatUsd(matrix.dayTotals[date].costUsd)}
                  </text>
                )}
                {index % labelEvery === 0 && (
                  <text x={MARGIN.left + index * band + band / 2} y={MARGIN.top + PLOT_HEIGHT + 18} textAnchor="middle" className="fill-on-surface-variant font-body-sm text-[11px]">
                    {shortDate(date)}
                  </text>
                )}
                {/* Vùng bấm/hover cả dải ngày, lớn hơn cột (UI hover + bàn phím). */}
                <rect
                  x={MARGIN.left + index * band}
                  y={MARGIN.top}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${fullDate(date)}: ${formatUsd(matrix.dayTotals[date].costUsd)}`}
                  aria-describedby={active === index ? tooltipId : undefined}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="cursor-default outline-none focus-visible:stroke-primary"
                />
              </g>
            );
          })}

          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(0)} y2={y(0)} stroke="var(--color-outline-variant)" strokeWidth={1} />

          {showBudget && (
            <g>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(dailyBudgetUsd!)} y2={y(dailyBudgetUsd!)} stroke="var(--color-error)" strokeWidth={1} />
              <text x={width - MARGIN.right} y={y(dailyBudgetUsd!) - 5} textAnchor="end" className="fill-on-surface font-label-sm text-[11px]">
                Ngân sách ngày {formatUsd(dailyBudgetUsd!)}
              </text>
            </g>
          )}
        </svg>
      )}

      {activeDate !== null && active !== null && (
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[200px] rounded-xl border border-surface-container bg-surface-container-lowest p-3 shadow-xl"
          style={{
            left: Math.min(Math.max(0, MARGIN.left + active * band + band / 2 - 100), Math.max(0, width - 210)),
          }}
        >
          <p className="font-label-sm text-label-sm text-on-surface-variant">{fullDate(activeDate)}</p>
          <p className="font-label-lg text-label-lg tabular-nums text-on-surface">
            {formatUsd(matrix.dayTotals[activeDate].costUsd)}
            <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant">{formatNumber(matrix.dayTotals[activeDate].tokens)} token</span>
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {matrix.features
              .filter((feature) => matrix.cells[activeDate]?.[feature])
              .map((feature) => (
                <li key={feature} className="flex items-center gap-2 font-body-sm text-body-sm">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: featureColor(feature) }} />
                  <span className="font-medium tabular-nums text-on-surface">{formatUsd(matrix.cells[activeDate][feature].costUsd)}</span>
                  <span className="text-on-surface-variant">{label(feature)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Tổng chi phí trong kỳ theo tính năng: thanh ngang, giá trị ở đầu thanh, xếp giảm dần. */
export const FeatureCostBars: React.FC<{ matrix: CostMatrix }> = ({ matrix }) => {
  const rows = matrix.features
    .map((feature) => ({ feature, ...matrix.featureTotals[feature] }))
    .sort((a, b) => b.costUsd - a.costUsd);
  const max = Math.max(...rows.map((row) => row.costUsd), 0) || 1;

  return (
    <ul className="flex flex-col gap-3" aria-label="Chi phí AI theo tính năng">
      {rows.map((row) => (
        <li key={row.feature} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <span className="truncate font-body-sm text-body-sm text-on-surface">{label(row.feature)}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="h-5 rounded-r-[4px]"
              style={{ width: `max(2px, ${(row.costUsd / max) * 75}%)`, background: featureColor(row.feature) }}
            />
            <span className={cn('whitespace-nowrap font-label-md text-label-md tabular-nums text-on-surface')}>
              {formatUsd(row.costUsd)}
              <span className="ml-1.5 font-body-sm text-body-sm text-on-surface-variant">{formatNumber(row.tokens)} token</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

/** Bảng số liệu: đúng từng ô Backend trả (ngày × tính năng) — để đối chiếu biểu đồ, và cho người không xem được màu. */
export const CostTable: React.FC<{ matrix: CostMatrix }> = ({ matrix }) => (
  <div className="relative overflow-x-auto rounded-xl border border-surface-container" role="region" aria-label="Bảng số liệu chi phí AI" tabIndex={0}>
    <table className="w-full min-w-[480px] border-collapse text-left font-body-sm text-body-sm">
      <thead>
        <tr className="bg-surface-container-low">
          <th scope="col" className="px-3 py-2 font-label-md text-label-md text-on-surface-variant">Ngày</th>
          <th scope="col" className="px-3 py-2 font-label-md text-label-md text-on-surface-variant">Tính năng</th>
          <th scope="col" className="px-3 py-2 text-right font-label-md text-label-md text-on-surface-variant">Token</th>
          <th scope="col" className="px-3 py-2 text-right font-label-md text-label-md text-on-surface-variant">Chi phí</th>
        </tr>
      </thead>
      <tbody>
        {matrix.dates.flatMap((date) =>
          matrix.features
            .filter((feature) => matrix.cells[date]?.[feature])
            .map((feature, index) => (
              <tr key={`${date}-${feature}`} className="border-t border-surface-container">
                <td className="px-3 py-1.5 text-on-surface-variant">{index === 0 ? fullDate(date) : ''}</td>
                <td className="px-3 py-1.5 text-on-surface">{label(feature)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(matrix.cells[date][feature].tokens)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatUsdExact(matrix.cells[date][feature].costUsd)}</td>
              </tr>
            ))
        )}
        <tr className="border-t-2 border-outline-variant font-label-md text-label-md">
          <td className="px-3 py-2" colSpan={2}>
            Tổng cả kỳ
          </td>
          <td className="px-3 py-2 text-right tabular-nums">{formatNumber(matrix.total.tokens)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{formatUsdExact(matrix.total.costUsd)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);
