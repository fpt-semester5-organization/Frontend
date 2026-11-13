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
  avatarUrl?: string | null;
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
export type ENumberUpdateBody = UpdateENumberBody;

// ---------- Nguyên liệu & dị ứng (SCR-43: FN-ADM-12) ----------

export type StallType = Schemas['CreateAdminIngredientRequest']['defaultStallType'];
export type FoodGroup = NonNullable<Row<Schemas['ListAdminIngredientsResponse']['data']>['foodGroup']>;
export type AdminIngredient = DeepRequired<Row<Schemas['ListAdminIngredientsResponse']['data']>> & {
  imageUrl?: string | null;
  isLocked?: boolean;
  /** Số ảnh ứng viên PENDING cắt từ ảnh tủ lạnh người dùng (BR-ADM-ING-02). */
  candidateCount?: number;
};
/** GET /admin/ingredients/{id}/candidates — FN-ADM-12-CAND (OpenAPI chưa có). */
export type IngredientCandidate = {
  candidateId: number;
  croppedImageUrl: string;
  /** Độ tin cậy AI 0..1. */
  confidenceScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  sessionId: number;
  createdAt: string;
};
export type IngredientFilters = Query<'listAdminIngredients'> & {
  foodGroup?: string;
  stallType?: string;
  isLocked?: boolean;
  hasImage?: boolean;
};
export type CreateIngredientBody = Schemas['CreateAdminIngredientRequest'];
/** PUT /admin/ingredients/{id}: Backend có (AdminIngredientsController) nhưng OpenAPI chưa có; chỉ gửi trường đổi. */
export type UpdateIngredientBody = Partial<Omit<CreateIngredientBody, 'foodGroup'>> & {
  foodGroup?: FoodGroup;
  imageUrl?: string | null;
  isLocked?: boolean;
};
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
export type UpdatePlanBody = {
  planName?: string;
  durationDays?: number;
  priceVnd?: number;
  isActive?: boolean;
};
export type ReconcileAction = Schemas['ReconcileAdminPaymentRequest']['action'];
export type ReconcileBody = Schemas['ReconcileAdminPaymentRequest'];
export type ReconcileResult = DeepRequired<Schemas['ReconcileAdminPaymentResponse']['data']>;

export interface AdminPaymentTransaction {
  transactionId: number;
  partnerTransactionCode: string;
  userId: number;
  userEmail: string;
  userFullName: string;
  planId: number;
  planName: string;
  planDurationDays: number;
  gatewayProvider: string;
  amountVnd: number;
  transactionStatus: 'PENDING' | 'SUCCESS' | 'EXPIRED' | 'FAILED' | 'REFUNDED' | string;
  createdAt: string;
  completedAt?: string | null;
  startsAt: string;
  endsAt: string;
  receiptUrl?: string | null;
  canApprove: boolean;
  canReconcile: boolean;
}

export interface AdminPaymentFilters {
  page?: number;
  size?: number;
  status?: string;
  gateway?: string;
  keyword?: string;
  from?: string;
  to?: string;
}

export interface ApprovePaymentResult {
  transactionId: number;
  partnerTransactionCode: string;
  userId: number;
  status: string;
  planName: string;
  vipEndsAt: string;
  receiptUrl?: string | null;
}

// ---------- Cấu hình hệ thống (System Settings - FN-ADM-20) ----------

export type SettingCategory = 'MEAL_PLAN' | 'AI_QUOTA' | 'LLMOPS' | 'COMMUNITY' | 'GENERAL' | string;

export interface SystemSetting {
  settingKey: string;
  settingValue: string;
  defaultValue: string;
  dataType: 'INT' | 'DECIMAL' | 'BOOLEAN' | 'STRING' | string;
  category: SettingCategory;
  description?: string | null;
  legalDocumentsUrl?: string | null;
  updatedAt: string;
  updatedBy?: number | null;
}

export interface UpdateSystemSettingBody {
  settingValue: string;
  legalDocumentsUrl?: string | null;
}

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

export interface UserTierDistribution {
  vipTokens: number;
  vipCostUsd: number;
  memberTokens: number;
  memberCostUsd: number;
  systemTokens: number;
  systemCostUsd: number;
}

export interface TopSpender {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  totalTokens: number;
  totalCostUsd: number;
  requestCount: number;
}

export interface CostCell {
  costUsd: number;
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface HourlyCost {
  hour: number;
  costUsd: number;
  tokens: number;
}

export type LlmopsDashboard = Omit<DeepRequired<Schemas['GetAdminLlmopsDashboardResponse']['data']>, 'series'> & {
  series: CostPoint[];
  dates?: string[];
  features?: string[];
  dayTotals?: Record<string, CostCell>;
  featureTotals?: Record<string, CostCell>;
  total?: CostCell;
  hourlyCosts?: HourlyCost[];
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  promptCostUsd?: number;
  completionCostUsd?: number;
  userTierDistribution?: UserTierDistribution;
  topSpenders?: TopSpender[];
};

export interface LlmopsLogItem {
  logId: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userRole: string;
  userAvatarUrl?: string | null;
  featureCode: string;
  tokensConsumed: number;
  costEstimateUsd: number;
  requestStatus: 'SUCCESS' | 'QUOTA_EXCEEDED' | 'ERROR' | string;
  errorMessage?: string | null;
  executionTimeMs: number;
  createdAt: string;
}

export interface LlmopsLogFilters {
  from?: string;
  to?: string;
  feature?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface LlmopsLogsResponse {
  items: LlmopsLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type KnowledgeScope = NonNullable<Schemas['CreateAdminKnowledgeReindexRequest']['scope']>;
export type KnowledgeSource =
  | 'RECIPE'
  | 'POST'
  | 'VIDEO_TRANSCRIPT'
  | 'VIDEO_RECIPE'
  | 'NUTRITION_DOC'
  | 'E_NUMBER'
  | 'ALLERGEN'
  | 'INGREDIENT'
  | (string & {});
export type KnowledgeStatus = Omit<DeepRequired<Schemas['ListAdminKnowledgeStatusResponse']['data']>, 'lastIndexedAt' | 'bySource'> & {
  lastIndexedAt: string | null;
  bySource: Record<string, number>;
  /** Số điểm vector bị Admin ẩn (không được chatbot tìm thấy); totalPoints/bySource chỉ tính điểm đang dùng. */
  inactivePoints?: number;
};

export interface NutritionDocument {
  id: string;
  title: string;
  author: string;
  fileName: string;
  fileType: 'PDF' | 'MARKDOWN';
  chunks: number;
  isActive: boolean;
  updatedAt: string;
  fileUrl?: string;
}

export interface UploadNutritionDocumentPayload {
  file: File;
  title: string;
  author?: string;
}

// ---------- Khảo sát & Đánh giá Chatbot AI (SCR-41: FN-ADM-15, FN-CHAT-06) ----------

export interface AdminSurvey {
  surveyId: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  sessionId?: number | null;
  sessionTitle?: string | null;
  ratingScore: number;
  contextQuestion: string;
  feedbackContent?: string | null;
  createdAt: string;
}

export interface AdminSurveySummary {
  totalSurveys: number;
  averageRating: number;
  positiveCount: number;
  positiveRate: number;
  negativeCount: number;
  negativeRate: number;
  neutralCount: number;
}

export interface AdminSurveyFilters {
  rating?: number;
  isNegative?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminSurveyListResult {
  surveys: {
    items: AdminSurvey[];
    pageNumber: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  summary: AdminSurveySummary;
}

// ---------- Kiểm duyệt vi phạm & bình luận (SCR-34/35: FN-ADM-04/05/06) ----------

export type ModerationTargetType = 'POST' | 'RECIPE' | 'VIDEO' | 'COMMENT';
export type ReportSource = 'AI_SCAN' | 'USER_REPORT';
export type ViolationType = 'VIO_MEAT' | 'VIO_LABEL' | 'VIO_HATE' | 'VIO_SPAM';

export interface ModerationItem {
  reportId: number;
  targetType: ModerationTargetType;
  targetId: number;
  parentPostId?: number;
  targetTitle?: string;
  targetContent?: string;
  authorName?: string;
  violationType: ViolationType;
  reportSource: ReportSource;
  evidenceSummary?: string;
  status?: string;
  createdAt: string;
}

export interface ModerationQuery {
  reportSource?: ReportSource;
  violationType?: ViolationType;
  targetType?: ModerationTargetType;
  page: number;
  size: number;
}

export interface ModerationDecisionBody {
  decision: 'UPHOLD' | 'DISMISS';
  note: string;
  applySanction?: boolean;
}

export interface ModerationDecisionResult {
  reportId: number;
  status: string;
  targetStatus?: string;
}

export interface CommentDeleteResult {
  deleted: number;
}

// ---------- Thao tác kỷ luật & người dùng bổ trợ (SCR-39 bổ sung) ----------

export type UserSanctionAction = 'WARN' | 'RESTRICT_COMMENT' | 'SUSPEND' | 'BAN' | 'REACTIVATE';

export interface AdminUserQuery {
  keyword?: string;
  accountStatus?: AccountStatus;
  role?: 'MEMBER' | 'ADMIN';
  dietarySchoolId?: number;
  page: number;
  size: number;
}

export interface UserStatusBody {
  action: UserSanctionAction;
  durationDays?: number;
  reason: string;
}

export interface UserStatusResult {
  userId: number;
  accountStatus: AccountStatus;
  lockedUntil?: string | null;
  violationCount?: number;
}

export interface UserContentItem {
  type: string;
  id: number;
  status?: string;
  createdAt?: string;
}

export interface UserContents {
  violationSummary?: { resolved?: number; dismissed?: number };
  items: UserContentItem[];
}

// ---------- Danh mục & Xác minh công thức (SCR-36/37: FN-ADM-07/08/09) ----------

export interface Category {
  categoryId: number;
  categoryName: string;
  isCore?: boolean;
}

export interface CategoryCreateBody {
  categoryName: string;
  description?: string;
}

export interface CategoryUpdateBody {
  categoryName?: string;
  isActive?: boolean;
}

export interface CategoryDeleteResult {
  migratedRecipes?: number;
  migratedVenues?: number;
}

export interface RecipeSummary {
  recipeId: number;
  type?: string;
  title: string;
  imageUrl?: string;
  dietarySchool?: string;
  cookTimeMinutes?: number;
  caloriesKcal?: number;
  voteCount?: number;
  isVerified?: boolean;
}

export interface RecipeQuery {
  keyword?: string;
  categoryId?: number;
  page: number;
  size: number;
}

export interface VerifyResult {
  recipeId: number;
  isVerified: boolean;
}

// ---------- Bổ trợ Dữ liệu gốc & Gói VIP ----------

export interface DietarySchoolUpdateBody {
  schoolName?: string;
  forbiddenFoodRules?: { forbiddenFoodGroups?: string[]; forbidAllium?: boolean };
}

export interface ENumberQuery {
  veganStatus?: VeganStatus;
  keyword?: string;
  page: number;
  size: number;
}

export interface ENumberCreateBody {
  code: string;
  name: string;
  veganStatus: VeganStatus;
  originSource: string;
  categoryType?: string;
  healthRiskNotes?: string;
}

export interface IngredientQuery {
  keyword?: string;
  allergenId?: number;
  page: number;
  size: number;
}

export interface IngredientCreateBody {
  name: string;
  standardUnit?: string;
  defaultStallType: StallType;
  foodGroup?: FoodGroup;
  caloriesPer100g: number;
  isAllium?: boolean;
}

export interface AllergenCreateBody {
  allergenName: string;
  code: string;
  description?: string;
}

export type PlanCreateBody = CreatePlanBody;
export type PlanUpdateBody = UpdatePlanBody;

export interface VenueQuery {
  isActive?: boolean;
  source?: VenueSource;
  keyword?: string;
  page: number;
  size: number;
}

// ---------- Nhật ký kiểm toán & Thống kê tổng quan (SCR-38/40: FN-ADM-17/18) ----------

export interface AuditLog {
  auditId: number;
  actorUserId?: number | null;
  actorRole?: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  note?: string;
  createdAt: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AuditQuery {
  actorUserId?: number;
  action?: string;
  targetTable?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

export interface AnalyticsOverview {
  users?: {
    total?: number;
    newInPeriod?: number;
    byStatus?: Record<string, number>;
    standardMembers?: number;
    vipMembers?: number;
    suspendedMembers?: number;
  };
  content?: {
    recipes?: number;
    recipesNewInPeriod?: number;
    posts?: number;
    postsNewInPeriod?: number;
    videos?: number;
    videosNewInPeriod?: number;
  };
  vip?: { active?: number; revenueVnd?: number };
  moderationQueue?: number;
  aiCostUsd?: number;
}

export interface DateRange {
  from?: string;
  to?: string;
}

