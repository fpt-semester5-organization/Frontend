import { http, unwrap } from '@/api/http';

/** Phần hồ sơ cần cho các panel "Hồ sơ" của Chat/Thực đơn (GET /users/me — FN-PROF-01). */
export interface MyProfile {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: 'MEMBER' | 'VIP' | 'ADMIN';
  isVip: boolean;
  health?: {
    gender?: 'MALE' | 'FEMALE';
    heightCm?: number;
    currentWeightKg?: number;
    targetWeightKg?: number;
    bmi?: number;
    bmiCategory?: string;
    targetDailyCalories?: number;
    healthGoal?: 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';
    dietarySchool?: { id: number; code: string; name: string };
    requiresAlliumFree?: boolean;
    regionPreference?: string;
  } | null;
  allergens?: { allergenId: number; name: string }[];
}

export const getMyProfile = () => unwrap<MyProfile>(http.get('/users/me'));
