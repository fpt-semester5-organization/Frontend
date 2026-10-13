/** Nhãn tiếng Việt cho enum (enum gốc ở constants/enums.ts). */
export const DIETARY_SCHOOLS = [
  { id: 1, code: 'VEGAN', name: 'Thuần chay (Vegan)', note: 'Không sữa, không trứng' },
  { id: 2, code: 'OVO', name: 'Chay có trứng (Ovo)', note: 'Không sữa' },
  { id: 3, code: 'LACTO', name: 'Chay có sữa (Lacto)', note: 'Không trứng' },
  { id: 4, code: 'LACTO_OVO', name: 'Chay trứng & sữa (Lacto-Ovo)', note: 'Không thịt, không hải sản' },
  { id: 5, code: 'BUDDHIST', name: 'Chay Phật giáo', note: 'Kiêng ngũ vị tân' },
  { id: 6, code: 'POLLOTARIAN', name: 'Ăn gà (Pollotarian)', note: 'Không hải sản' },
  { id: 7, code: 'PESCATARIAN', name: 'Ăn cá (Pescatarian)', note: 'Không gia cầm' },
] as const;

export const HEALTH_GOAL_LABEL = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Duy trì cân nặng',
  GAIN_MUSCLE: 'Tăng cơ',
} as const;

export const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ' } as const;
export const REGION_LABEL = { NORTH: 'Miền Bắc', CENTRAL: 'Miền Trung', SOUTH: 'Miền Nam' } as const;
