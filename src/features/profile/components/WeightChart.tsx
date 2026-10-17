import React from 'react';
import { formatNumber } from '@/lib/format';
import type { WeightEntry } from '../types/profile.types';

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeightKg: number | null;
}

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

const shortDate = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

/** Biểu đồ đường cân nặng theo ngày (SVG, không cần thư viện); đường gạch là cân nặng mục tiêu. */
export const WeightChart: React.FC<WeightChartProps> = ({ entries, targetWeightKg }) => {
  // Backend trả mới nhất trước; nhiều mốc cùng ngày thì logId lớn hơn là mốc ghi sau.
  const points = [...entries].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate) || a.logId - b.logId);
  if (points.length < 2) return null;

  const values = points.map((p) => p.weightKg).concat(targetWeightKg !== null ? [targetWeightKg] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((max - kg) / (max - min)) * (HEIGHT - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${HEIGHT - PAD.bottom} L${x(0).toFixed(1)},${HEIGHT - PAD.bottom} Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const change = Math.round((last.weightKg - first.weightKg) * 10) / 10;
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <figure className="flex flex-col gap-space-xs">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Cân nặng từ ${formatNumber(first.weightKg)} kg (${shortDate(first.loggedDate)}) đến ${formatNumber(last.weightKg)} kg (${shortDate(last.loggedDate)})`}
        className="h-auto w-full"
      >
        {[min, (min + max) / 2, max].map((kg) => (
          <g key={kg}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(kg)} y2={y(kg)} className="stroke-surface-container-highest" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(kg) + 4} textAnchor="end" className="fill-on-surface-variant text-[11px]">
              {formatNumber(Math.round(kg * 10) / 10)}
            </text>
          </g>
        ))}
        {targetWeightKg !== null && (
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(targetWeightKg)}
            y2={y(targetWeightKg)}
            className="stroke-secondary"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}
        <path d={area} className="fill-primary-fixed/40" />
        <path d={line} className="stroke-primary" fill="none" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.logId}>
            <circle cx={x(i)} cy={y(p.weightKg)} r={3.5} className="fill-primary" />
            {(i % labelEvery === 0 || i === points.length - 1) && (
              <text x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-on-surface-variant text-[11px]">
                {shortDate(p.loggedDate)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-space-md gap-y-1 font-label-sm text-label-sm text-on-surface-variant">
        <span>
          Thay đổi: <strong className="text-on-surface tabular-nums">{change > 0 ? '+' : ''}{formatNumber(change)} kg</strong>
        </span>
        {targetWeightKg !== null && (
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-0 w-4 border-t-2 border-dashed border-secondary" />
            Mục tiêu {formatNumber(targetWeightKg)} kg
          </span>
        )}
      </figcaption>
    </figure>
  );
};
