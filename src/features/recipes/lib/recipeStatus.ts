import type { MyRecipeStatus, RecipeStatus } from '../types/recipe.types';

/** Nhãn hiển thị cho vòng đời công thức (BR-ADM-CNT-001), dùng ở trang chi tiết và trang sửa. */
export const RECIPE_STATUS_META: Record<MyRecipeStatus, { label: string; icon: string; className: string; hint: string }> = {
  APPROVED_ACTIVE: {
    label: 'Đã đăng',
    icon: 'check_circle',
    className: 'bg-success-container text-success',
    hint: 'Công thức đang hiển thị công khai.',
  },
  DRAFT: {
    label: 'Bản nháp',
    icon: 'draft',
    className: 'bg-surface-container-high text-on-surface',
    hint: 'Chỉ bạn xem được. Gửi duyệt khi đã hoàn thiện.',
  },
  PENDING_REVIEW: {
    label: 'Đang chờ duyệt',
    icon: 'hourglass_top',
    className: 'bg-info-container text-info',
    hint: 'Đang chờ kiểm duyệt nên chưa hiển thị công khai.',
  },
  QUARANTINED_HIDDEN: {
    label: 'Đang bị ẩn',
    icon: 'visibility_off',
    className: 'bg-warning-container text-warning',
    hint: 'Bị báo cáo hoặc AI gắn cờ, đang chờ quản trị viên xem xét nên tạm thời chưa sửa được.',
  },
  REJECTED: {
    label: 'Bị từ chối',
    icon: 'block',
    className: 'bg-error-container text-on-error-container',
    hint: 'Chưa đạt kiểm duyệt. Sửa lại rồi gửi duyệt lần nữa.',
  },
  ARCHIVED: {
    label: 'Đã gỡ',
    icon: 'inventory_2',
    className: 'bg-surface-container text-on-surface-variant',
    hint: 'Đã gỡ khỏi trang cá nhân và kho công thức.',
  },
};

/** QUARANTINED_HIDDEN trả 409 ERR_RECIPE_LOCKED; ARCHIVED/DELETED trả 404 khi PUT (FN-POST-04). */
export const canEditRecipe = (status: RecipeStatus | undefined) =>
  status !== 'QUARANTINED_HIDDEN' && status !== 'ARCHIVED' && status !== 'DELETED';

/** Bản nháp và bản bị từ chối còn bước "gửi duyệt" (PUT submit = true); bản đã gửi thì sửa là kiểm duyệt lại. */
export const isDraftLike = (status: RecipeStatus | undefined) => status === 'DRAFT' || status === 'REJECTED';

/** Chỉ công thức đang công khai mới "gỡ khỏi trang cá nhân" được (DELETE mode=archive). */
export const canArchiveRecipe = (status: RecipeStatus | undefined) => status === 'APPROVED_ACTIVE';
