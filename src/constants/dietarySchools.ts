import type { Schemas } from '@/api/types';

/** Mã 07 trường phái chay (DietarySchools.School_Code, BR-ADM-MAS-001), lấy từ OpenAPI. */
export type DietarySchoolCode = NonNullable<Schemas['ListDietarySchoolsResponse']['data'][number]['schoolCode']>;

/** Tên ngắn hiển thị trên nhãn công thức. Tên đầy đủ lấy từ GET /dietary-schools (schoolName). */
export const DIETARY_SCHOOL_LABEL: Record<DietarySchoolCode, string> = {
  VEGAN: 'Thuần chay',
  OVO: 'Chay có trứng',
  LACTO: 'Chay có sữa',
  LACTO_OVO: 'Chay trứng & sữa',
  BUDDHIST: 'Kiêng ngũ vị tân',
  POLLOTARIAN: 'Chay ăn thịt trắng',
  PESCATARIAN: 'Chay ăn hải sản',
};

export function dietarySchoolLabel(code: string | null | undefined): string {
  if (!code) return '';
  return DIETARY_SCHOOL_LABEL[code as DietarySchoolCode] ?? code;
}
