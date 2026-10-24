import type { ApiMeta, ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Kiểu lấy từ src/api/generated (docs/08. OpenAPI). Trường Backend trả thêm ngoài OpenAPI ghi rõ nguồn
// (Backend develop 45999c2); trường có thể thiếu khi Backend chưa trả thì để tùy chọn.

type Row<T> = T extends readonly (infer U)[] ? U : never;
type Query<K extends keyof ApiOperations> = NonNullable<ApiOperations[K]['parameters']['query']>;

/** Kết quả thao tác ghi: `message` của server để hiện toast (UI Spec: "toast với message của server"). */
export interface WriteResult<T> {
  data: T;
  message: string;
}

export interface PagedResult<T> {
  items: T[];
  meta: ApiMeta;
}

// ---------- Người dùng (SCR-39: FN-ADM-01/02/03) ----------

export type AccountStatus = NonNullable<Row<Schemas['ListAdminUsersResponse']['data']>['accountStatus']>;
export type UserRole = NonNullable<Row<Schemas['ListAdminUsersResponse']['data']>['role']>;
export type SanctionAction = Schemas['UpdateAdminUserStatusRequest']['action'];
export type UpdateUserStatusBody = Schemas['UpdateAdminUserStatusRequest'];
export type UpdateUserStatusResult = DeepRequired<Schemas['UpdateAdminUserStatusResponse']['data']> & { lockedUntil: string | null };
export type AdminUserFilters = Query<'listAdminUsers'>;
export type AdminUserContentsFilters = Query<'listAdminUserContents'>;
export type ContentType = NonNullable<AdminUserContentsFilters['type']>;

/** Một dòng của GET /admin/users; Backend trả thêm trường phái, hạn khóa và số vi phạm đã xác nhận. */
export type AdminUser = DeepRequired<Row<Schemas['ListAdminUsersResponse']['data']>> & {
  dietarySchoolId?: number | null;
  dietarySchoolName?: string | null;
  lockedUntil?: string | null;
  /** Users.Count_ViolationReports: căn cứ thang kỷ luật lũy tiến BR-ADM-USR-002. */
  countViolationReports?: number;
};

export interface AdminUserContentItem {
  type: ContentType;
  id: number;
  /** Backend trả thêm: tiêu đề bài/công thức/video hoặc trích đoạn bình luận. */
  title?: string | null;
  status: string;
  createdAt: string;
}

/** data của GET /admin/users/{id}/contents; Backend trả thêm trạng thái hiện tại của tài khoản. */
export interface AdminUserContents {
  userId?: number;
  accountStatus?: AccountStatus;
  lockedUntil?: string | null;
  countViolationReports?: number;
  violationSummary: { resolved: number; dismissed: number };
  items: AdminUserContentItem[];
  meta: ApiMeta;
}

// ---------- Trường phái & E-number (SCR-42: FN-ADM-10/11) ----------

export type DietarySchool = DeepRequired<Row<Schemas['ListAdminDietarySchoolsResponse']['data']>>;
export type ForbiddenFoodGroup = 'EGG' | 'DAIRY' | 'POULTRY' | 'SEAFOOD';
/** OpenAPI để forbiddenFoodRules là object rỗng; cấu trúc lấy theo mô tả D109. */
export interface UpdateDietarySchoolBody {
  schoolName?: string;
  forbiddenFoodRules?: { forbiddenFoodGroups: ForbiddenFoodGroup[]; forbidAllium: boolean };
}

export type VeganStatus = Schemas['CreateAdminENumberRequest']['veganStatus'];
export type ENumber = DeepRequired<Row<Schemas['ListAdminENumbersResponse']['data']>>;
export type ENumberFilters = Query<'listAdminENumbers'>;
export type CreateENumberBody = Schemas['CreateAdminENumberRequest'];
export type UpdateENumberBody = Schemas['UpdateAdminENumberRequest'];

// ---------- Nguyên liệu & dị ứng (SCR-43: FN-ADM-12) ----------

export type StallType = Schemas['CreateAdminIngredientRequest']['defaultStallType'];
export type FoodGroup = NonNullable<Row<Schemas['ListAdminIngredientsResponse']['data']>['foodGroup']>;
export type AdminIngredient = DeepRequired<Row<Schemas['ListAdminIngredientsResponse']['data']>>;
export type IngredientFilters = Query<'listAdminIngredients'>;
export type CreateIngredientBody = Schemas['CreateAdminIngredientRequest'];
/** PUT /admin/ingredients/{id}: Backend có (AdminIngredientsController) nhưng OpenAPI chưa có; chỉ gửi trường đổi. */
export type UpdateIngredientBody = Partial<Omit<CreateIngredientBody, 'foodGroup'>> & { foodGroup?: FoodGroup };
export type CreateAllergenBody = Schemas['CreateAdminAllergenRequest'];
/** GET /allergens (danh mục dùng chung): Backend trả { allergenId, code, allergenName }. */
export interface Allergen {
  allergenId: number;
  code?: string;
  allergenName: string;
}

// ---------- Gói VIP & đối soát (SCR-44: FN-ADM-13) ----------

export type AdminPlan = DeepRequired<Row<Schemas['ListAdminSubscriptionPlansResponse']['data']>>;
export type CreatePlanBody = Schemas['CreateAdminSubscriptionPlanRequest'];
export type UpdatePlanBody = Schemas['UpdateAdminSubscriptionPlanRequest'];
export type ReconcileAction = Schemas['ReconcileAdminPaymentRequest']['action'];
export type ReconcileBody = Schemas['ReconcileAdminPaymentRequest'];
export type ReconcileResult = DeepRequired<Schemas['ReconcileAdminPaymentResponse']['data']>;

// ---------- Quán chay (SCR-45: FN-ADM-14) ----------

export type AdminVenue = DeepRequired<Row<Schemas['ListAdminVenuesResponse']['data']>>;
export type VenueSource = NonNullable<Query<'listAdminVenues'>['source']>;
export type AdminVenueFilters = Query<'listAdminVenues'>;

// ---------- Giám sát AI (SCR-41: FN-ADM-15/16, FN-CHAT-07) ----------

export type AiModule = NonNullable<Query<'getAdminAiMetrics'>['module']>;
export type AiMetricsFilters = Query<'getAdminAiMetrics'>;
export type LlmopsFilters = Query<'getAdminLlmopsDashboard'>;
export type AiMetrics = DeepRequired<Schemas['GetAdminAiMetricsResponse']['data']>;
export type AiModuleMetric = Row<AiMetrics['modules']>;

/** Một điểm của series chi phí. groupBy=DAY có thể không có `feature`, groupBy=FEATURE có thể không có `date`. */
export interface CostPoint {
  date?: string | null;
  feature?: string | null;
  tokens: number;
  costUsd: number;
}

export type LlmopsDashboard = Omit<DeepRequired<Schemas['GetAdminLlmopsDashboardResponse']['data']>, 'series'> & {
  series: CostPoint[];
};

export type KnowledgeScope = NonNullable<Schemas['CreateAdminKnowledgeReindexRequest']['scope']>;
export type KnowledgeSource = keyof NonNullable<Schemas['ListAdminKnowledgeStatusResponse']['data']['bySource']>;
export type KnowledgeStatus = Omit<DeepRequired<Schemas['ListAdminKnowledgeStatusResponse']['data']>, 'lastIndexedAt' | 'bySource'> & {
  lastIndexedAt: string | null;
  bySource: Partial<Record<KnowledgeSource, number>>;
};
