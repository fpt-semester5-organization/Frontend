import type { Gender, HealthGoal, RegionPreference } from '../types/profile.types';

// Công thức và ngưỡng theo Business Rules: BR-USR-02 (BMI chuẩn WHO/WPRO châu Á), BR-USR-NUT-03 (BMR, TDEE, calo mục tiêu).
// Giao diện chỉ dùng để xem trước khi nhập; số chính thức do server tính và trả về sau khi lưu.

export const HEIGHT_MIN = 50;
export const HEIGHT_MAX = 250;
export const WEIGHT_MIN = 20;
export const WEIGHT_MAX = 300;
export const MIN_AGE = 10;

/** "54,5" hoặc "54.5" → 54.5; chuỗi rỗng hoặc sai định dạng → null. */
export function parseDecimal(value: string | null | undefined): number | null {
  const text = (value ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

export const inRange = (value: number | null, min: number, max: number) => value !== null && value >= min && value <= max;

/** BMI = kg / (m)², làm tròn 1 chữ số; null khi chiều cao/cân nặng ngoài khoảng hợp lệ. */
export function calcBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!inRange(heightCm, HEIGHT_MIN, HEIGHT_MAX) || !inRange(weightKg, WEIGHT_MIN, WEIGHT_MAX)) return null;
  const meters = (heightCm as number) / 100;
  return Math.round(((weightKg as number) / (meters * meters)) * 10) / 10;
}

export type BmiCategory = 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';

/** BR-USR-02: Thiếu cân < 18,5; Bình thường 18,5–22,9; Tiền béo phì 23,0–24,9; Béo phì ≥ 25,0. */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'UNDERWEIGHT';
  if (bmi < 23) return 'NORMAL';
  if (bmi < 25) return 'OVERWEIGHT';
  return 'OBESE';
}

export const BMI_CATEGORY_META: Record<BmiCategory, { label: string; className: string; advice: string }> = {
  UNDERWEIGHT: {
    label: 'Thiếu cân',
    className: 'bg-info-container text-info',
    advice: 'Nên bổ sung thêm năng lượng và đạm thực vật.',
  },
  NORMAL: {
    label: 'Bình thường',
    className: 'bg-success-container text-success',
    advice: 'Thể trạng cân đối, hãy duy trì chế độ ăn hiện tại.',
  },
  OVERWEIGHT: {
    label: 'Tiền béo phì',
    className: 'bg-warning-container text-warning',
    advice: 'Nên giảm nhẹ năng lượng và tăng rau xanh.',
  },
  OBESE: {
    label: 'Béo phì',
    className: 'bg-error-container text-on-error-container',
    advice: 'Nên tham khảo ý kiến chuyên gia dinh dưỡng.',
  },
};

/** Nhãn cho bmiCategory server trả về; mã lạ thì hiển thị nguyên văn. */
export const bmiCategoryLabel = (code: string | null | undefined) =>
  code && code in BMI_CATEGORY_META ? BMI_CATEGORY_META[code as BmiCategory].label : code ?? '';

/** Tuổi tròn tại ngày `today` từ "YYYY-MM-DD"; null nếu ngày không hợp lệ. */
export function ageFrom(dateOfBirth: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age;
}

/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD (giá trị max cho ô ngày). */
export function todayIso(today = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

const GOAL_DELTA: Record<HealthGoal, number> = { LOSE_WEIGHT: -400, MAINTAIN: 0, GAIN_MUSCLE: 400 };

/**
 * BR-USR-NUT-03: BMR Mifflin-St Jeor (Nam +5, Nữ −161); TDEE = BMR × 1,2 (không thu thập mức vận động, D61);
 * calo mục tiêu = TDEE −400 / 0 / +400 theo mục tiêu, không thấp hơn 1200 (nữ) / 1500 (nam).
 */
export function estimateEnergy(input: { gender: Gender; heightCm: number; weightKg: number; age: number; goal: HealthGoal }) {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const bmr = base + (input.gender === 'MALE' ? 5 : -161);
  const tdee = bmr * 1.2;
  const floor = input.gender === 'MALE' ? 1500 : 1200;
  return {
    bmrKcal: Math.round(bmr),
    tdeeKcal: Math.round(tdee),
    targetDailyCalories: Math.round(Math.max(floor, tdee + GOAL_DELTA[input.goal])),
  };
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'MALE', label: 'Nam' },
];

export const GOAL_OPTIONS: { value: HealthGoal; label: string; hint: string }[] = [
  { value: 'LOSE_WEIGHT', label: 'Giảm cân', hint: 'Bớt khoảng 400 kcal mỗi ngày.' },
  { value: 'MAINTAIN', label: 'Giữ cân', hint: 'Ăn đúng mức năng lượng tiêu hao.' },
  { value: 'GAIN_MUSCLE', label: 'Tăng cơ', hint: 'Thêm khoảng 400 kcal mỗi ngày.' },
];

export const REGION_OPTIONS: { value: RegionPreference; label: string }[] = [
  { value: 'NORTH', label: 'Miền Bắc' },
  { value: 'CENTRAL', label: 'Miền Trung' },
  { value: 'SOUTH', label: 'Miền Nam' },
];

export const labelOf = <T extends string>(options: { value: T; label: string }[], value: T | null | undefined) =>
  options.find((option) => option.value === value)?.label ?? '';
