import type { GENDERS, HEALTH_GOALS } from '@/constants/enums';

type Gender = (typeof GENDERS)[number];
type Goal = (typeof HEALTH_GOALS)[number];

export interface BodyInput {
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  healthGoal: Goal;
}

export const ageFromDob = (dob: string, now = new Date()) => {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age;
};

/** BMI theo chuẩn WHO châu Á (BR-USR-NUT-03). */
export const bmiCategory = (bmi: number) =>
  bmi < 18.5 ? 'Thiếu cân' : bmi < 23 ? 'Bình thường' : bmi < 25 ? 'Thừa cân' : 'Béo phì';

/**
 * BMR Mifflin-St Jeor (Nam: 10×kg + 6,25×cm − 5×tuổi + 5; Nữ: − 161), TDEE = BMR × 1,2,
 * calo mục tiêu: LOSE_WEIGHT = TDEE − 400, MAINTAIN = TDEE, GAIN_MUSCLE = TDEE + 400; sàn 1200 kcal (nữ) / 1500 kcal (nam).
 * Chỉ để hiển thị trước khi lưu — server (FN-PROF-04) mới là nơi tính chính thức.
 */
export function computeMetrics(p: BodyInput) {
  const age = ageFromDob(p.dateOfBirth);
  const bmi = p.weightKg / (p.heightCm / 100) ** 2;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + (p.gender === 'MALE' ? 5 : -161);
  const tdee = bmr * 1.2;
  const delta = p.healthGoal === 'LOSE_WEIGHT' ? -400 : p.healthGoal === 'GAIN_MUSCLE' ? 400 : 0;
  const floor = p.gender === 'MALE' ? 1500 : 1200;
  const target = Math.max(floor, Math.round(tdee + delta));
  return { age, bmi, bmiCategory: bmiCategory(bmi), bmr: Math.round(bmr), tdee: Math.round(tdee), targetDailyCalories: target };
}
