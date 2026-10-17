import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

type CurrentUserRaw = DeepRequired<Schemas['GetCurrentUserResponse']['data']>;
type HealthRaw = CurrentUserRaw['health'];

export type Gender = NonNullable<Schemas['UpdateCurrentUserHealthProfileRequest']['gender']>;
export type HealthGoal = NonNullable<Schemas['UpdateCurrentUserHealthProfileRequest']['healthGoal']>;
export type RegionPreference = NonNullable<Schemas['UpdateCurrentUserHealthProfileRequest']['regionPreference']>;

/**
 * Hồ sơ sức khỏe (FN-PROF-01/04). targetWeightKg, regionPreference có thể trống.
 * UNSPECIFIED: bmiCategory là string tự do; theo BR-USR-02 dùng UNDERWEIGHT | NORMAL | OVERWEIGHT | OBESE.
 */
export type HealthProfile = Omit<HealthRaw, 'targetWeightKg' | 'regionPreference'> & {
  targetWeightKg: number | null;
  regionPreference: RegionPreference | null;
};

export type UserAllergen = CurrentUserRaw['allergens'][number];

/**
 * GET /users/me (FN-PROF-01). Thành viên mới chưa có hồ sơ sức khỏe thì `health` = null.
 * restoreDeadline: có trong cột "Dữ liệu hiển thị" của SCR-07 nhưng OpenAPI chưa khai báo.
 */
export type CurrentUser = Omit<CurrentUserRaw, 'phoneNumber' | 'avatarUrl' | 'health'> & {
  phoneNumber: string | null;
  avatarUrl: string | null;
  health: HealthProfile | null;
  restoreDeadline?: string | null;
};

/** PATCH /users/me (FN-PROF-02). */
export type UpdateProfileBody = Schemas['UpdateCurrentUserRequest'];
export type UpdateProfileResult = DeepRequired<Schemas['UpdateCurrentUserResponse']['data']>;

/** POST /users/me/avatar (FN-PROF-03). */
export type AvatarResult = DeepRequired<Schemas['UploadCurrentUserAvatarResponse']['data']>;

/** DELETE /users/me (FN-PROF-07). */
export type DeleteAccountBody = Schemas['DeleteCurrentUserRequest'];
export type DeleteAccountResult = DeepRequired<Schemas['DeleteCurrentUserResponse']['data']>;

/** PUT /users/me/health-profile (FN-PROF-04). */
export type HealthProfileBody = Schemas['UpdateCurrentUserHealthProfileRequest'];

/** POST/GET /users/me/weight-history (FN-PROF-06). */
export type WeightEntryBody = Schemas['CreateCurrentUserWeightEntryRequest'];
export type WeightEntryResult = DeepRequired<Schemas['CreateCurrentUserWeightEntryResponse']['data']>;
export type WeightEntry = DeepRequired<Schemas['ListCurrentUserWeightHistoryResponse']['data'][number]>;
export type WeightHistoryParams = NonNullable<ApiOperations['listCurrentUserWeightHistory']['parameters']['query']>;

/** PUT /users/me/allergies (FN-PROF-05) và danh mục GET /allergens (FN-PROF-08). */
export type AllergiesBody = Schemas['ReplaceCurrentUserAllergiesRequest'];
export type AllergiesResult = DeepRequired<Schemas['ReplaceCurrentUserAllergiesResponse']['data']>;
export type Allergen = DeepRequired<Schemas['ListAllergensResponse']['data'][number]>;
