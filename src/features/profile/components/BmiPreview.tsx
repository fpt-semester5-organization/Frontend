import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import {
  BMI_CATEGORY_META,
  HEIGHT_MAX,
  HEIGHT_MIN,
  MIN_AGE,
  WEIGHT_MAX,
  WEIGHT_MIN,
  ageFrom,
  bmiCategory,
  calcBmi,
  estimateEnergy,
  parseDecimal,
} from '../lib/healthMetrics';
import type { Gender, HealthGoal } from '../types/profile.types';

interface BmiPreviewProps {
  height: string;
  weight: string;
  gender: Gender | '';
  dateOfBirth: string;
  goal: HealthGoal | '';
}

/** Thang BMI hiển thị 15–30; vạch chia theo BR-USR-02. */
const SCALE_MIN = 15;
const SCALE_MAX = 30;
const SEGMENTS = [
  { to: 18.5, className: 'bg-info' },
  { to: 23, className: 'bg-success' },
  { to: 25, className: 'bg-warning' },
  { to: SCALE_MAX, className: 'bg-error' },
];
const percentOf = (value: number) => ((Math.min(Math.max(value, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

/**
 * Xem trước BMI ngay khi nhập chiều cao/cân nặng (SCR-08), kèm calo mục tiêu ước tính khi đủ giới tính, ngày sinh, mục tiêu.
 * Số chính thức do server tính khi lưu.
 */
export const BmiPreview: React.FC<BmiPreviewProps> = ({ height, weight, gender, dateOfBirth, goal }) => {
  const heightCm = parseDecimal(height);
  const weightKg = parseDecimal(weight);
  const bmi = calcBmi(heightCm, weightKg);
  const category = bmi !== null ? bmiCategory(bmi) : null;
  const age = dateOfBirth ? ageFrom(dateOfBirth) : null;
  const energy =
    bmi !== null && gender && goal && age !== null && age >= MIN_AGE
      ? estimateEnergy({ gender, goal, age, heightCm: heightCm as number, weightKg: weightKg as number })
      : null;

  let hint = 'Nhập chiều cao và cân nặng để xem chỉ số BMI.';
  if (height && heightCm === null) hint = 'Chiều cao chưa đúng định dạng số.';
  else if (heightCm !== null && (heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX)) hint = `Chiều cao cần từ ${HEIGHT_MIN} đến ${HEIGHT_MAX} cm.`;
  else if (weight && weightKg === null) hint = 'Cân nặng chưa đúng định dạng số.';
  else if (weightKg !== null && (weightKg < WEIGHT_MIN || weightKg > WEIGHT_MAX)) hint = `Cân nặng cần từ ${WEIGHT_MIN} đến ${WEIGHT_MAX} kg.`;

  return (
    <section aria-labelledby="bmi-preview-title" aria-live="polite" className="rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <h2 id="bmi-preview-title" className="flex items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
        <Icon name="monitor_weight" className="text-[22px] text-primary" />
        BMI xem trước
      </h2>
      {bmi === null || category === null ? (
        <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">{hint}</p>
      ) : (
        <>
          <div className="mt-space-sm flex items-end gap-space-sm">
            <p className="font-headline-lg text-headline-lg text-on-surface tabular-nums" data-testid="bmi-value">
              {formatNumber(bmi)}
            </p>
            <span className={cn('mb-2 rounded-full px-2.5 py-0.5 font-label-md text-label-md', BMI_CATEGORY_META[category].className)}>
              {BMI_CATEGORY_META[category].label}
            </span>
          </div>
          <div className="relative mt-space-sm" aria-hidden="true">
            <div className="flex h-2 overflow-hidden rounded-full">
              {SEGMENTS.map((segment, index) => {
                const from = index === 0 ? SCALE_MIN : SEGMENTS[index - 1].to;
                return <span key={segment.to} className={segment.className} style={{ width: `${percentOf(segment.to) - percentOf(from)}%` }} />;
              })}
            </div>
            <span
              className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-on-surface ring-2 ring-surface-container-lowest"
              style={{ left: `${percentOf(bmi)}%` }}
            />
            <div className="mt-1 flex justify-between font-label-sm text-label-sm text-on-surface-variant tabular-nums">
              <span>18,5</span>
              <span>23</span>
              <span>25</span>
            </div>
          </div>
          <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">{BMI_CATEGORY_META[category].advice}</p>
          {energy && (
            <dl className="mt-space-md grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-space-sm text-center">
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">BMR</dt>
                <dd className="font-label-lg text-label-lg text-on-surface tabular-nums">{formatNumber(energy.bmrKcal)}</dd>
              </div>
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">TDEE</dt>
                <dd className="font-label-lg text-label-lg text-on-surface tabular-nums">{formatNumber(energy.tdeeKcal)}</dd>
              </div>
              <div>
                <dt className="font-label-sm text-label-sm text-on-surface-variant">Mục tiêu/ngày</dt>
                <dd className="font-label-lg text-label-lg text-primary tabular-nums">{formatNumber(energy.targetDailyCalories)}</dd>
              </div>
            </dl>
          )}
          <p className="mt-space-sm font-label-sm text-label-sm text-on-surface-variant">
            Phân loại theo chuẩn WHO cho người châu Á; số chính thức do hệ thống tính khi lưu.
          </p>
        </>
      )}
    </section>
  );
};
