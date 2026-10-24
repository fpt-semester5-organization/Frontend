import type {
  AccountStatus,
  AiModule,
  ContentType,
  FoodGroup,
  ForbiddenFoodGroup,
  KnowledgeScope,
  KnowledgeSource,
  ReconcileAction,
  StallType,
  VeganStatus,
  VenueSource,
} from '../types/admin.types';

// Nhãn tiếng Việt cho các giá trị enum (docs/10 mục 4). Giao diện không hiện mã thô (UI-4).

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; tone: Tone }> = {
  PENDING_ACTIVATION: { label: 'Chưa kích hoạt', tone: 'neutral' },
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  QUARANTINED: { label: 'Bị hạn chế', tone: 'warning' },
  SUSPENDED: { label: 'Tạm khóa', tone: 'warning' },
  BANNED: { label: 'Cấm vĩnh viễn', tone: 'error' },
  SOFT_DELETED: { label: 'Chờ xóa (30 ngày)', tone: 'neutral' },
  ANONYMIZED_DELETED: { label: 'Đã xóa, ẩn danh', tone: 'neutral' },
};

export const accountStatusLabel = (status: string | null | undefined) =>
  (status && ACCOUNT_STATUS[status as AccountStatus]?.label) || 'Không rõ';

export const ACCOUNT_STATUSES = Object.keys(ACCOUNT_STATUS) as AccountStatus[];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  POST: 'Bài viết',
  RECIPE: 'Công thức',
  VIDEO: 'Video',
  COMMENT: 'Bình luận',
};

/** Trạng thái nội dung: Posts.Moderation_Status, Recipes.Status, Comments.Status, Videos.Status. */
const CONTENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  PENDING_REVIEW: { label: 'Chờ duyệt', tone: 'info' },
  APPROVED_ACTIVE: { label: 'Đang hiển thị', tone: 'success' },
  ACTIVE: { label: 'Đang hiển thị', tone: 'success' },
  READY: { label: 'Đang hiển thị', tone: 'success' },
  PROCESSING: { label: 'Đang xử lý', tone: 'info' },
  REJECTED: { label: 'Bị từ chối', tone: 'error' },
  FLAGGED: { label: 'Bị gắn cờ', tone: 'warning' },
  QUARANTINED_HIDDEN: { label: 'Bị ẩn do vi phạm', tone: 'error' },
  HIDDEN: { label: 'Bị ẩn', tone: 'error' },
  BANNED: { label: 'Bị cấm', tone: 'error' },
  FAILED: { label: 'Xử lý lỗi', tone: 'warning' },
  ARCHIVED: { label: 'Lưu trữ', tone: 'neutral' },
  DELETED: { label: 'Đã xóa', tone: 'neutral' },
};

export const contentStatus = (status: string) => CONTENT_STATUS[status] ?? { label: 'Khác', tone: 'neutral' as Tone };

export const VEGAN_STATUS: Record<VeganStatus, { label: string; tone: Tone }> = {
  VEGAN: { label: 'Thuần chay', tone: 'success' },
  DOUBTFUL: { label: 'Nghi vấn', tone: 'warning' },
  NON_VEGAN: { label: 'Không chay', tone: 'error' },
};

export const VEGAN_STATUSES = Object.keys(VEGAN_STATUS) as VeganStatus[];

export const STALL_TYPE_LABEL: Record<StallType, string> = {
  PRODUCE: 'Rau củ quả',
  CONDIMENTS: 'Gia vị',
  DRY_GOODS: 'Đồ khô',
  PLANT_PROTEIN: 'Đạm thực vật',
};

export const STALL_TYPES = Object.keys(STALL_TYPE_LABEL) as StallType[];

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  PLANT: 'Thực vật',
  EGG: 'Trứng',
  DAIRY: 'Sữa',
  POULTRY: 'Gia cầm',
  SEAFOOD: 'Hải sản',
};

/** MVP chỉ nhập PLANT, EGG, DAIRY; POULTRY/SEAFOOD từ Sprint sau (D109, SCR-43). */
export const FOOD_GROUPS_MVP: FoodGroup[] = ['PLANT', 'EGG', 'DAIRY'];

/** Nhóm thực phẩm cấm của trường phái (D109). */
export const FORBIDDEN_GROUPS: ForbiddenFoodGroup[] = ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'];

export const RECONCILE_ACTION: Record<ReconcileAction, { label: string; hint: string }> = {
  COMPENSATE: {
    label: 'Bù thời hạn VIP',
    hint: 'Người dùng đã bị trừ tiền nhưng chưa được kích hoạt VIP, hoặc cần bù thêm một kỳ.',
  },
  REFUND: { label: 'Hoàn tiền', hint: 'Hoàn tiền thủ công cho người dùng và kết thúc kỳ VIP của giao dịch này.' },
};

export const VENUE_SOURCE_LABEL: Record<VenueSource, string> = {
  HAPPYCOW: 'HappyCow',
  GOOGLE_PLACES: 'Google Places',
};

export const venueSourceLabel = (source: string | null | undefined) =>
  (source && VENUE_SOURCE_LABEL[source as VenueSource]) || 'Không rõ nguồn';

export const AI_MODULE_LABEL: Record<AiModule, string> = {
  CHATBOT: 'Trợ lý dinh dưỡng',
  MEAL_PLANNER: 'Lập thực đơn',
  FRIDGE_VISION: 'Tủ lạnh AI',
  VIDEO_TO_RECIPE: 'Video thành công thức',
};

export const aiModuleLabel = (module: string) => AI_MODULE_LABEL[module as AiModule] ?? 'Tính năng khác';

/** AIQuotaLogs.Feature_Code (docs/10): thứ tự cố định cũng là thứ tự màu trong biểu đồ. */
export const FEATURE_LABEL: Record<string, string> = {
  AI_CHAT: 'Trợ lý dinh dưỡng',
  MEAL_PLAN_GEN: 'Lập thực đơn',
  AI_FRIDGE: 'Tủ lạnh AI',
  AI_BARCODE: 'Mã vạch',
  SUMMARIZE_VIDEO: 'Tóm tắt video',
  AI_EMBEDDING: 'Embedding kho tri thức',
  CONTENT_MODERATION: 'Kiểm duyệt nội dung',
};

export const featureLabel = (feature: string | null | undefined) =>
  !feature ? 'Tất cả tính năng' : (FEATURE_LABEL[feature] ?? 'Tính năng khác');

export const KNOWLEDGE_SCOPE_LABEL: Record<KnowledgeScope, string> = {
  ALL: 'Toàn bộ kho tri thức',
  RECIPE: 'Công thức đã duyệt',
  POST: 'Bài viết cộng đồng',
  VIDEO: 'Video (phiên âm và công thức)',
  NUTRITION_DOC: 'Tài liệu dinh dưỡng',
  DICTIONARY: 'Từ điển (E-number, dị ứng, nguyên liệu)',
};

export const KNOWLEDGE_SOURCE_LABEL: Record<KnowledgeSource, string> = {
  RECIPE: 'Công thức',
  POST: 'Bài viết',
  VIDEO_TRANSCRIPT: 'Phiên âm video',
  VIDEO_RECIPE: 'Công thức từ video',
  NUTRITION_DOC: 'Tài liệu dinh dưỡng',
  E_NUMBER: 'E-number',
  ALLERGEN: 'Nhóm dị ứng',
  INGREDIENT: 'Nguyên liệu',
};

/** Trạng thái ngắt mạch AI (BR-ADM-AI-002). */
export const CIRCUIT_STATE: Record<string, { label: string; tone: Tone; hint: string }> = {
  CLOSED: { label: 'Bình thường', tone: 'success', hint: 'Các tính năng AI đang gọi dịch vụ bình thường.' },
  HALF_OPEN: { label: 'Đang thử lại', tone: 'warning', hint: 'Mạch vừa mở lại một phần để thử dịch vụ AI.' },
  OPEN: {
    label: 'Đang ngắt',
    tone: 'error',
    hint: 'Quá 50% yêu cầu lỗi hoặc chậm trong 60 giây: ngắt 05 phút, người dùng nhận dữ liệu dự phòng.',
  },
};

export const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-container text-success',
  warning: 'bg-warning-container text-warning',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-info-container text-info',
  neutral: 'bg-surface-container text-on-surface-variant',
};
