import http from '@/api/http';
import type { ApiEnvelope, Paged } from '@/api/types';
import type {
  Allergen,
  AllergiesBody,
  AllergiesResult,
  AvatarResult,
  CurrentUser,
  DeleteAccountBody,
  DeleteAccountResult,
  HealthProfile,
  HealthProfileBody,
  UpdateProfileBody,
  UpdateProfileResult,
  WeightEntry,
  WeightEntryBody,
  WeightEntryResult,
  WeightHistoryParams,
} from '../types/profile.types';

const normalizeHealth = (health: HealthProfile | null | undefined): HealthProfile | null =>
  health ? { ...health, targetWeightKg: health.targetWeightKg ?? null, regionPreference: health.regionPreference ?? null } : null;

/** GET /users/me — FN-PROF-01 hồ sơ cá nhân, chỉ số sức khỏe và dị ứng. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await http.get<ApiEnvelope<CurrentUser>>('/users/me');
  const data = res.data.data;
  return {
    ...data,
    phoneNumber: data.phoneNumber || null,
    avatarUrl: data.avatarUrl || null,
    health: normalizeHealth(data.health),
    allergens: Array.isArray(data.allergens) ? data.allergens : [],
  };
}

/** PATCH /users/me — FN-PROF-02 họ tên, số điện thoại. */
export async function updateProfile(body: UpdateProfileBody) {
  const res = await http.patch<ApiEnvelope<UpdateProfileResult>>('/users/me', body);
  return res.data;
}

/** POST /users/me/avatar — FN-PROF-03 ảnh JPEG/PNG/WEBP ≤ 5 MB (multipart). */
export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<ApiEnvelope<AvatarResult>>('/users/me/avatar', form, { timeout: 60000 });
  return res.data;
}

/** DELETE /users/me — FN-PROF-07 vô hiệu hóa tài khoản (ân hạn 30 ngày), xác nhận bằng mật khẩu. */
export async function deleteAccount(body: DeleteAccountBody) {
  const res = await http.delete<ApiEnvelope<DeleteAccountResult>>('/users/me', { data: body });
  return res.data;
}

/** PUT /users/me/health-profile — FN-PROF-04; server tính BMI/BMR/TDEE và ghi một mốc cân nặng. */
export async function updateHealthProfile(body: HealthProfileBody) {
  const res = await http.put<ApiEnvelope<HealthProfile>>('/users/me/health-profile', body);
  return { ...res.data, data: normalizeHealth(res.data.data) as HealthProfile };
}

/** GET /users/me/weight-history — FN-PROF-06. */
export async function listWeightHistory(params: WeightHistoryParams): Promise<Paged<WeightEntry>> {
  const res = await http.get<ApiEnvelope<WeightEntry[]>>('/users/me/weight-history', { params });
  const items = Array.isArray(res.data.data) ? res.data.data : [];
  return { items, meta: res.data.meta ?? { page: params.page ?? 1, size: params.size ?? 20, total: items.length } };
}

/** POST /users/me/weight-history — FN-PROF-06 ghi một mốc cân nặng. */
export async function createWeightEntry(body: WeightEntryBody) {
  const res = await http.post<ApiEnvelope<WeightEntryResult>>('/users/me/weight-history', body);
  return res.data;
}

/** GET /allergens — FN-PROF-08 danh mục dị ứng. */
export async function listAllergens(): Promise<Allergen[]> {
  const res = await http.get<ApiEnvelope<Allergen[]>>('/allergens');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

/** PUT /users/me/allergies — FN-PROF-05 thay toàn bộ danh sách dị ứng. */
export async function replaceAllergies(body: AllergiesBody) {
  const res = await http.put<ApiEnvelope<AllergiesResult>>('/users/me/allergies', body);
  return res.data;
}
