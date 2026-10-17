// Dữ liệu giả hồ sơ cá nhân & sức khỏe (FN-PROF-01..07) cho MSW (chỉ dev). Tải lại trang là về ban đầu.
import { users, type MockUser } from './db';
import { allergens, findSchool } from './recipeDb';

export type MockGender = 'MALE' | 'FEMALE';
export type MockGoal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';
export type MockRegion = 'NORTH' | 'CENTRAL' | 'SOUTH';

export interface MockHealthInput {
  gender: MockGender;
  dateOfBirth: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number | null;
  healthGoal: MockGoal;
  dietarySchoolId: number;
  requiresAlliumFree: boolean;
  regionPreference: MockRegion;
  updatedAt: string;
}

export interface MockProfile {
  phoneNumber: string | null;
  avatarUrl: string | null;
  health: MockHealthInput | null;
  allergies: { allergenId: number; notes: string | null }[];
  weights: { logId: number; weightKg: number; loggedDate: string; note: string | null }[];
}

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const daysAgoDate = (days: number) => daysAgoIso(days).slice(0, 10);

let nextLogId = 500;
export const newLogId = () => nextLogId++;

/** Lịch sử cân nặng giảm dần đều trong `count` tuần gần nhất. */
const weeklyWeights = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    logId: newLogId(),
    weightKg: Math.round((from - ((from - to) * i) / (count - 1)) * 10) / 10,
    loggedDate: daysAgoDate((count - 1 - i) * 7),
    note: i === 0 ? 'Bắt đầu theo dõi cân nặng.' : null,
  }));

export const profiles = new Map<number, MockProfile>([
  // Nguyễn An: đã có hồ sơ đầy đủ, đang giảm cân, dị ứng đậu phộng.
  [
    1024,
    {
      phoneNumber: '0912345678',
      avatarUrl: null,
      health: {
        gender: 'FEMALE',
        dateOfBirth: '2003-04-12',
        heightCm: 162,
        currentWeightKg: 54.5,
        targetWeightKg: 52,
        healthGoal: 'LOSE_WEIGHT',
        dietarySchoolId: 1,
        requiresAlliumFree: false,
        regionPreference: 'SOUTH',
        updatedAt: daysAgoIso(3),
      },
      allergies: [{ allergenId: 3, notes: 'Nổi mẩn khi ăn nhiều' }],
      weights: weeklyWeights(56.8, 54.5, 8),
    },
  ],
  // Trần Bình (VIP): chưa lập hồ sơ sức khỏe.
  [2048, { phoneNumber: null, avatarUrl: null, health: null, allergies: [], weights: [] }],
  // Lê Minh Chi: hồ sơ cũ hơn 30 ngày (isStaleMetrics), kiêng ngũ vị tân.
  [
    3072,
    {
      phoneNumber: '0387654321',
      avatarUrl: null,
      health: {
        gender: 'MALE',
        dateOfBirth: '1998-09-02',
        heightCm: 172,
        currentWeightKg: 68,
        targetWeightKg: null,
        healthGoal: 'MAINTAIN',
        dietarySchoolId: 5,
        requiresAlliumFree: true,
        regionPreference: 'CENTRAL',
        updatedAt: daysAgoIso(45),
      },
      allergies: [],
      weights: weeklyWeights(68, 68, 2),
    },
  ],
]);

export const profileOf = (userId: number): MockProfile => {
  let profile = profiles.get(userId);
  if (!profile) {
    profile = { phoneNumber: null, avatarUrl: null, health: null, allergies: [], weights: [] };
    profiles.set(userId, profile);
  }
  return profile;
};

const ageOf = (dateOfBirth: string) => {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
};

/** BR-USR-02 (BMI châu Á) và BR-USR-NUT-03 (Mifflin-St Jeor, TDEE = BMR × 1,2, calo mục tiêu ±400, sàn 1200/1500). */
export function healthDto(input: MockHealthInput) {
  const meters = input.heightCm / 100;
  const bmi = Math.round((input.currentWeightKg / (meters * meters)) * 10) / 10;
  const bmiCategory = bmi < 18.5 ? 'UNDERWEIGHT' : bmi < 23 ? 'NORMAL' : bmi < 25 ? 'OVERWEIGHT' : 'OBESE';
  const bmr = 10 * input.currentWeightKg + 6.25 * input.heightCm - 5 * ageOf(input.dateOfBirth) + (input.gender === 'MALE' ? 5 : -161);
  const tdee = bmr * 1.2;
  const delta = input.healthGoal === 'LOSE_WEIGHT' ? -400 : input.healthGoal === 'GAIN_MUSCLE' ? 400 : 0;
  const school = findSchool(input.dietarySchoolId);
  return {
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    heightCm: input.heightCm,
    currentWeightKg: input.currentWeightKg,
    targetWeightKg: input.targetWeightKg,
    bmi,
    bmiCategory,
    bmrKcal: Math.round(bmr),
    tdeeKcal: Math.round(tdee),
    targetDailyCalories: Math.round(Math.max(input.gender === 'MALE' ? 1500 : 1200, tdee + delta)),
    healthGoal: input.healthGoal,
    dietarySchool: school ? { id: school.dietarySchoolId, code: school.schoolCode, name: school.schoolName } : null,
    requiresAlliumFree: input.requiresAlliumFree,
    regionPreference: input.regionPreference,
    // BR-USR-02: khuyến nghị cập nhật cân nặng tối thiểu 30 ngày/lần.
    isStaleMetrics: Date.now() - new Date(input.updatedAt).getTime() > 30 * 86_400_000,
    updatedAt: input.updatedAt,
  };
}

export const allergenName = (allergenId: number) => allergens.find((item) => item.allergenId === allergenId)?.allergenName ?? '';

/** GET /users/me — FN-PROF-01. */
export function meDto(user: MockUser) {
  const profile = profileOf(user.userId);
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: profile.phoneNumber,
    avatarUrl: profile.avatarUrl,
    role: user.role,
    isVip: user.isVip,
    health: profile.health ? healthDto(profile.health) : null,
    allergens: profile.allergies.map((item) => ({ allergenId: item.allergenId, name: allergenName(item.allergenId) })),
    restoreDeadline: null,
  };
}

export const findUser = (userId: number) => users.find((user) => user.userId === userId);
