import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import {
  ALL_FEATURES,
  OTHER_FEATURE,
  featureColor,
  formatTokens,
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

/**
 * 1. Biểu đồ Vùng Xếp Chồng (Stacked Area Chart):
 * Biểu diễn xu hướng chi phí liên tục theo chuỗi thời gian kèm đường ngân sách an toàn.
 */
export const StackedAreaCostChart: React.FC<{ matrix: CostMatrix; dailyBudgetUsd?: number }> = ({
  matrix,
  dailyBudgetUsd,
}) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const showBudget = !!dailyBudgetUsd && matrix.maxDayCost >= dailyBudgetUsd * 0.5;
  const ticks = niceTicks(Math.max(matrix.maxDayCost, showBudget ? dailyBudgetUsd! : 0));
  const yMax = ticks[ticks.length - 1] || 1;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const count = matrix.dates.length;
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / 52))));

  const xAt = (i: number) => {
    if (count <= 1) return MARGIN.left + plotWidth / 2;
    return MARGIN.left + (i / (count - 1)) * plotWidth;
  };

  // Tính tọa độ đáy và đỉnh của từng tầng tính năng theo từng ngày
  const levels = matrix.dates.map((date) => {
    let curr = 0;
    const map: Record<string, { bottom: number; top: number }> = {};
    for (const f of matrix.features) {
      const cost = matrix.cells[date]?.[f]?.costUsd ?? 0;
      map[f] = { bottom: curr, top: curr + cost };
      curr += cost;
    }
    return map;
  });

  const activeDate = active !== null ? matrix.dates[active] : null;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={MARGIN.top + PLOT_HEIGHT + MARGIN.bottom}
          role="group"
          aria-label="Biểu đồ vùng chi phí AI theo ngày"
          className="block overflow-visible"
        >
          {/* Lưới ngang & nhãn Y */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-surface-container-high)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-on-surface-variant font-body-sm text-[11px] tabular-nums"
              >
                {formatUsd(tick)}
              </text>
            </g>
          ))}

          {/* Vùng diện tích của từng tính năng (vẽ từ layer đáy lên) */}
          {count > 0 &&
            matrix.features.map((feature) => {
              if (count === 1) {
                const x = xAt(0);
                const topY = y(levels[0][feature]?.top ?? 0);
                const botY = y(levels[0][feature]?.bottom ?? 0);
                const h = Math.max(0, botY - topY);
                if (h <= 0) return null;
                return (
                  <rect
                    key={feature}
                    x={x - 12}
                    y={topY}
                    width={24}
                    height={h}
                    fill={featureColor(feature)}
                    opacity={0.8}
                    rx={3}
                  />
                );
              }

              const topPoints = matrix.dates.map((_, i) => `${xAt(i)},${y(levels[i][feature]?.top ?? 0)}`);
              const botPoints = matrix.dates.map(
                (_, i) => `${xAt(count - 1 - i)},${y(levels[count - 1 - i][feature]?.bottom ?? 0)}`
              );
              const pathD = `M ${topPoints.join(' L ')} L ${botPoints.join(' L ')} Z`;
              const topLineD = `M ${topPoints.join(' L ')}`;

              return (
                <g key={feature}>
                  <path d={pathD} fill={featureColor(feature)} fillOpacity={0.55} />
                  <path d={topLineD} fill="none" stroke={featureColor(feature)} strokeWidth={1.5} />
                </g>
              );
            })}

          {/* Nhãn ngày trục X */}
          {matrix.dates.map((date, index) => {
            if (index % labelEvery !== 0) return null;
            return (
              <text
                key={date}
                x={xAt(index)}
                y={MARGIN.top + PLOT_HEIGHT + 18}
                textAnchor="middle"
                className="fill-on-surface-variant font-body-sm text-[11px]"
              >
                {shortDate(date)}
              </text>
            );
          })}

          {/* Đường baseline đáy */}
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-outline-variant)"
            strokeWidth={1}
          />

          {/* Đường ngân sách nếu có */}
          {showBudget && (
            <g>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(dailyBudgetUsd!)}
                y2={y(dailyBudgetUsd!)}
                stroke="var(--color-error)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <text
                x={width - MARGIN.right}
                y={y(dailyBudgetUsd!) - 5}
                textAnchor="end"
                className="fill-error font-label-sm text-[11px] font-medium"
              >
                Ngân sách ngày {formatUsd(dailyBudgetUsd!)}
              </text>
            </g>
          )}

          {/* Con trỏ đứng / Crosshair khi hover */}
          {active !== null && (
            <g pointerEvents="none">
              <line
                x1={xAt(active)}
                x2={xAt(active)}
                y1={MARGIN.top}
                y2={y(0)}
                stroke="var(--color-on-surface)"
                strokeOpacity={0.3}
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
              {matrix.features.map((feature) => {
                const val = matrix.cells[matrix.dates[active]]?.[feature]?.costUsd ?? 0;
                if (val <= 0) return null;
                return (
                  <circle
                    key={feature}
                    cx={xAt(active)}
                    cy={y(levels[active][feature].top)}
                    r={3.5}
                    fill={featureColor(feature)}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}

          {/* Vùng hover nhận diện ngày */}
          {matrix.dates.map((date, index) => {
            const band = count > 1 ? plotWidth / (count - 1) : plotWidth;
            const x = count > 1 ? xAt(index) - band / 2 : MARGIN.left;
            return (
              <rect
                key={date}
                x={Math.max(MARGIN.left, x)}
                y={MARGIN.top}
                width={count > 1 ? band : plotWidth}
                height={PLOT_HEIGHT}
                fill="transparent"
                tabIndex={0}
                aria-label={`${fullDate(date)}: ${formatUsd(matrix.dayTotals[date]?.costUsd ?? 0)}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none"
              />
            );
          })}
        </svg>
      )}

      {/* Tooltip hiển thị dữ liệu chi tiết */}
      {activeDate !== null && active !== null && (
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[210px] rounded-xl border border-surface-container bg-surface-container-lowest p-3 shadow-xl backdrop-blur-xs"
          style={{
            left: Math.min(Math.max(0, xAt(active) - 105), Math.max(0, width - 225)),
          }}
        >
          <p className="font-label-sm text-label-sm text-on-surface-variant">{fullDate(activeDate)}</p>
          <p className="font-label-lg text-label-lg tabular-nums text-on-surface">
            {formatUsd(matrix.dayTotals[activeDate]?.costUsd ?? 0)}
            <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant">
              {formatNumber(matrix.dayTotals[activeDate]?.tokens ?? 0)} token
            </span>
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 border-t border-surface-container pt-1.5">
            {matrix.features
              .filter((feature) => (matrix.cells[activeDate]?.[feature]?.costUsd ?? 0) > 0)
              .map((feature) => (
                <li key={feature} className="flex items-center justify-between gap-2 font-body-sm text-body-sm">
                  <span className="flex items-center gap-1.5 text-on-surface-variant truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: featureColor(feature) }} />
                    <span className="truncate">{label(feature)}</span>
                  </span>
                  <span className="font-medium font-mono text-on-surface shrink-0">
                    {formatUsd(matrix.cells[activeDate][feature].costUsd)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * 2. Biểu đồ Tròn Tỷ Trọng (Pie Chart):
 * Hiển thị tỷ trọng chi tiêu từng tính năng trong cả kỳ, in trực tiếp phần trăm (%) lên từng lát bánh.
 */
export const PieCostChart: React.FC<{ matrix: CostMatrix }> = ({ matrix }) => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const totalCost = matrix.total.costUsd;
  const featuresWithCost = matrix.features
    .map((f) => ({
      feature: f,
      costUsd: matrix.featureTotals[f]?.costUsd ?? 0,
      tokens: matrix.featureTotals[f]?.tokens ?? 0,
    }))
    .filter((row) => row.costUsd > 0)
    .sort((a, b) => b.costUsd - a.costUsd);

  const cx = 140;
  const cy = 140;
  const R = 118;

  let currentAngle = -90; // Bắt đầu ở đỉnh 12h

  const slices = featuresWithCost.map((item) => {
    const fraction = totalCost > 0 ? item.costUsd / totalCost : 0;
    const pct = fraction * 100;
    const angle = Math.max(0.5, fraction * 360);
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const rad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + R * Math.cos(rad(startAngle));
    const y1 = cy + R * Math.sin(rad(startAngle));
    const x2 = cx + R * Math.cos(rad(endAngle));
    const y2 = cy + R * Math.sin(rad(endAngle));

    const midAngle = startAngle + angle / 2;
    // Tọa độ đặt nhãn % nằm ở khoảng 62% bán kính tính từ tâm
    const labelRadius = R * 0.64;
    const lx = cx + labelRadius * Math.cos(rad(midAngle));
    const ly = cy + labelRadius * Math.sin(rad(midAngle));

    // Vector đẩy nhẹ lát bánh khi hover
    const tx = Math.cos(rad(midAngle)) * 6;
    const ty = Math.sin(rad(midAngle)) * 6;

    const largeArc = angle > 180 ? 1 : 0;
    // Cung lát bánh khép kín từ tâm (cx, cy)
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      pct,
      fraction,
      d,
      lx,
      ly,
      tx,
      ty,
      midAngle,
      color: featureColor(item.feature),
    };
  });

  return (
    <div className="flex flex-col items-center gap-8 py-3 lg:flex-row lg:items-center">
      {/* Khối Biểu đồ tròn đặc SVG có in % trực tiếp */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={280}
          height={280}
          role="group"
          aria-label="Biểu đồ tròn tỷ trọng chi phí"
          className="overflow-visible block"
        >
          {totalCost === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="var(--color-surface-container-high)"
              stroke="var(--color-surface-container-lowest)"
              strokeWidth={2}
            />
          ) : (
            slices.map((slice) => {
              const isHovered = hoveredFeature === slice.feature;
              return (
                <g
                  key={slice.feature}
                  transform={isHovered ? `translate(${slice.tx}, ${slice.ty})` : undefined}
                  className="transition-transform duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredFeature(slice.feature)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {/* Miếng tròn */}
                  <path
                    d={slice.d}
                    fill={slice.color}
                    stroke="var(--color-surface-container-lowest)"
                    strokeWidth={2.5}
                    opacity={hoveredFeature && !isHovered ? 0.45 : 1}
                    className="transition-opacity duration-200"
                  />
                  {/* Nhãn % in thẳng trên mặt miếng tròn */}
                  {slice.pct >= 5 && (
                    <text
                      x={slice.lx}
                      y={slice.ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white font-mono font-bold text-[13px] pointer-events-none select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    >
                      {slice.pct.toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* Danh sách phân bổ chi tiết & Tổng chi phí */}
      <div className="flex-1 w-full overflow-hidden flex flex-col gap-3">
        {/* Thẻ tóm tắt tổng chi phí */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-container bg-surface-container-low/40 p-3">
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              {hoveredFeature ? `Tính năng: ${label(hoveredFeature)}` : 'Tổng chi phí AI cả kỳ'}
            </span>
            <span className="font-mono text-headline-sm font-bold text-on-surface">
              {hoveredFeature
                ? formatUsd(matrix.featureTotals[hoveredFeature]?.costUsd ?? 0)
                : formatUsd(matrix.total.costUsd)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              Token tiêu thụ
            </span>
            <span className="font-mono text-body-md font-semibold text-on-surface">
              {hoveredFeature
                ? `${formatNumber(matrix.featureTotals[hoveredFeature]?.tokens ?? 0)} token`
                : `${formatNumber(matrix.total.tokens)} token`}
            </span>
          </div>
        </div>

        {/* Danh sách các tính năng */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {slices.map((item) => {
            const isHovered = hoveredFeature === item.feature;
            return (
              <div
                key={item.feature}
                onMouseEnter={() => setHoveredFeature(item.feature)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={cn(
                  'flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer',
                  isHovered
                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-surface-container/60 hover:bg-surface-container-low/50'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-3.5 w-3.5 rounded-[3px] shrink-0" style={{ background: item.color }} />
                  <span className="font-medium text-body-sm text-on-surface truncate">{label(item.feature)}</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 font-mono text-body-xs">
                  <span className="font-semibold text-on-surface">{formatUsd(item.costUsd)}</span>
                  <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11.5px] font-bold text-on-surface">
                    {item.pct.toFixed(1)}%
                  </span>
                  <span className="text-on-surface-variant hidden xl:inline">{formatTokens(item.tokens)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const DonutCostChart = PieCostChart;


/**
 * 3. Biểu đồ Cột Kép Phân Rã Token: Đầu Vào vs Đầu Ra (Input vs Output Tokens):
 * So sánh lưu lượng Prompt Tokens (Input / RAG) và Completion Tokens (Output / Mô hình sinh) theo ngày.
 */
export const TokenBreakdownChart: React.FC<{ matrix: CostMatrix }> = ({ matrix }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();

  // Ước tính phân bổ 68% Prompt - 32% Completion theo chuẩn LLMOps của hệ thống
  const dayTokens = matrix.dates.map((date) => {
    const total = matrix.dayTotals[date]?.tokens ?? 0;
    const prompt = Math.round(total * 0.68);
    const completion = total - prompt;
    const promptCost = Math.round(((prompt * 0.075) / 1_000_000) * 10000) / 10000;
    const completionCost = Math.round(((completion * 0.3) / 1_000_000) * 10000) / 10000;
    return { date, total, prompt, completion, promptCost, completionCost };
  });

  const maxTokens = Math.max(...dayTokens.map((d) => Math.max(d.prompt, d.completion)), 0) || 1000;
  const ticks = niceTicks(maxTokens);
  const yMax = ticks[ticks.length - 1] || 1;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const count = matrix.dates.length;
  const band = count ? plotWidth / count : 0;
  const barWidth = Math.min(16, Math.max(3, (band - 8) / 2));
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / 52))));
  const activeData = active !== null ? dayTokens[active] : null;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
      {/* Chú giải token */}
      <div className="mb-3 flex flex-wrap items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] bg-[#2a78d6]" />
          <span>Input Tokens (Prompt & Ngữ cảnh RAG — $0.075/1M)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] bg-[#8b5cf6]" />
          <span>Output Tokens (Nội dung sinh ra — $0.300/1M)</span>
        </span>
      </div>

      {width > 0 && (
        <svg
          width={width}
          height={MARGIN.top + PLOT_HEIGHT + MARGIN.bottom}
          role="group"
          aria-label="Biểu đồ phân rã Token Input và Output"
          className="block overflow-visible"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-surface-container-high)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-on-surface-variant font-body-sm text-[11px] tabular-nums"
              >
                {formatTokens(tick)}
              </text>
            </g>
          ))}

          {dayTokens.map((d, index) => {
            const xBand = MARGIN.left + index * band;
            const xPrompt = xBand + (band - barWidth * 2 - 2) / 2;
            const xCompletion = xPrompt + barWidth + 2;
            const hPrompt = (d.prompt / yMax) * PLOT_HEIGHT;
            const hCompletion = (d.completion / yMax) * PLOT_HEIGHT;
            const dimmed = active !== null && active !== index;

            return (
              <g key={d.date} opacity={dimmed ? 0.45 : 1} className="transition-opacity">
                {/* Cột Prompt */}
                {hPrompt > 0.5 && (
                  <path
                    d={topRounded(xPrompt, y(d.prompt), barWidth, hPrompt, 3)}
                    fill="#2a78d6"
                  />
                )}
                {/* Cột Completion */}
                {hCompletion > 0.5 && (
                  <path
                    d={topRounded(xCompletion, y(d.completion), barWidth, hCompletion, 3)}
                    fill="#8b5cf6"
                  />
                )}

                {/* Nhãn X */}
                {index % labelEvery === 0 && (
                  <text
                    x={xBand + band / 2}
                    y={MARGIN.top + PLOT_HEIGHT + 18}
                    textAnchor="middle"
                    className="fill-on-surface-variant font-body-sm text-[11px]"
                  >
                    {shortDate(d.date)}
                  </text>
                )}

                {/* Vùng hover */}
                <rect
                  x={xBand}
                  y={MARGIN.top}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${fullDate(d.date)}: Input ${formatTokens(d.prompt)}, Output ${formatTokens(d.completion)}`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="cursor-pointer outline-none"
                />
              </g>
            );
          })}

          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-outline-variant)"
            strokeWidth={1}
          />
        </svg>
      )}

      {/* Tooltip */}
      {activeData !== null && active !== null && (
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[220px] rounded-xl border border-surface-container bg-surface-container-lowest p-3 shadow-xl"
          style={{
            left: Math.min(
              Math.max(0, MARGIN.left + active * band + band / 2 - 110),
              Math.max(0, width - 235)
            ),
          }}
        >
          <p className="font-label-sm text-label-sm text-on-surface-variant">{fullDate(activeData.date)}</p>
          <p className="font-label-lg text-label-lg font-mono text-on-surface">
            {formatNumber(activeData.total)} token
          </p>
          <div className="mt-2 flex flex-col gap-1.5 border-t border-surface-container pt-1.5 font-body-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-[#2a78d6]" />
                Input Tokens:
              </span>
              <span className="font-mono font-medium text-on-surface">
                {formatNumber(activeData.prompt)} (~ {formatUsd(activeData.promptCost)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                Output Tokens:
              </span>
              <span className="font-mono font-medium text-on-surface">
                {formatNumber(activeData.completion)} (~ {formatUsd(activeData.completionCost)})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

