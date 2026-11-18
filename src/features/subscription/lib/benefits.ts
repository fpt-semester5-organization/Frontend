import { QUOTA } from '@/constants/quota';
import { parseServerDate } from '@/lib/format';
import type { Plan, TierBenefits } from '../types/subscription.types';

/**
 * Tính năng chỉ VIP mới có (BR-PAY-SUB-03), ngoài các hạn mức trong `benefitRows`.
 * Chỉ liệt kê tính năng Backend thực sự chặn theo VIP: GET /meal-plans/{id}/nutrition?level=DETAILED.
 * Không quảng cáo xuất PDF thực đơn vì Backend chưa có GET /meal-plans/{id}/export.
 */
export const VIP_EXCLUSIVE_FEATURES = ['Xem calo chi tiết của thực đơn tuần'];

export interface BenefitFallbackLimits {
  chatDailyLimitFree?: number;
  chatDailyLimitVip?: number;
  chatLimitDailyFree?: number;
  chatLimitDailyVip?: number;
  mealPlanWeeklyLimitFree?: number;
  mealPlanWeeklyLimitVip?: number;
  fridgeScanDailyLimitFree?: number;
  fridgeScanDailyLimitVip?: number;
  fridgeScanLimitDailyFree?: number;
  fridgeScanLimitDailyVip?: number;
  barcodeScanLimitDailyFree?: number;
  barcodeScanLimitDailyVip?: number;
}

/** Bốn hạn mức của một gói VIP, đúng tên khóa trong Features_JSON của Backend (D121, D122). */
export interface PlanQuotas {
  chatLimitDaily?: number;
  mealPlanLimitWeekly?: number;
  fridgeScanLimitDaily?: number;
  barcodeScanLimitDaily?: number;
}
type QuotaKey = keyof PlanQuotas;

/** Thứ tự khóa Backend thử khi đọc (UserBenefitService): camelCase trước, snake_case sau, không phân biệt hoa thường. */
const QUOTA_KEY_NAMES: Record<QuotaKey, [string, string]> = {
  chatLimitDaily: ['chatLimitDaily', 'chat_limit_daily'],
  mealPlanLimitWeekly: ['mealPlanLimitWeekly', 'meal_plan_limit_weekly'],
  fridgeScanLimitDaily: ['fridgeScanLimitDaily', 'fridge_scan_limit_daily'],
  barcodeScanLimitDaily: ['barcodeScanLimitDaily', 'barcode_scan_limit_daily'],
};
export const QUOTA_KEYS = Object.keys(QUOTA_KEY_NAMES) as QuotaKey[];

const QUOTA_LABEL: Record<QuotaKey, { long: string; short: string; unit: string }> = {
  chatLimitDaily: { long: 'Số lần người dùng được hỏi Trợ lý AI', short: 'Hỏi Trợ lý AI', unit: 'câu/ngày' },
  mealPlanLimitWeekly: { long: 'Số lần được tạo Thực đơn tuần', short: 'Tạo thực đơn tuần', unit: 'lần/tuần' },
  fridgeScanLimitDaily: { long: 'Số lần được dùng tính năng Quét tủ lạnh', short: 'Quét tủ lạnh', unit: 'ảnh/ngày' },
  barcodeScanLimitDaily: { long: 'Số lần được quét mã vạch sản phẩm', short: 'Quét mã vạch', unit: 'lần/ngày' },
};

/**
 * Dòng hạn mức để hiển thị, chỉ gồm hạn mức có giá trị. `short` dùng nhãn ngắn cho chỗ hẹp (biên lai, thẻ Admin).
 */
export function quotaRows(quotas: PlanQuotas, opts: { short?: boolean } = {}): [string, string][] {
  return QUOTA_KEYS.filter((key) => quotas[key] !== undefined).map((key) => [
    opts.short ? QUOTA_LABEL[key].short : QUOTA_LABEL[key].long,
    `${quotas[key]} ${QUOTA_LABEL[key].unit}`,
  ]);
}

const asObject = (json: string | null | undefined): Record<string, unknown> | null => {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/**
 * Đọc ba hạn mức trong Features_JSON của gói hoặc bản chụp của giao dịch, theo đúng cách Backend đọc.
 * JSON hỏng hoặc không phải object thì trả null; khóa thiếu thì để undefined (Backend dùng cấu hình chung cho khóa đó).
 */
export function parsePlanQuotas(json: string | null | undefined): PlanQuotas | null {
  const root = asObject(json);
  if (!root) return null;
  const entries = Object.entries(root);
  const read = (names: string[]) => {
    for (const name of names) {
      const hit = entries.find(([key, value]) => key.toLowerCase() === name.toLowerCase() && typeof value === 'number' && Number.isInteger(value));
      if (hit) return hit[1] as number;
    }
    return undefined;
  };
  return Object.fromEntries(QUOTA_KEYS.map((key) => [key, read(QUOTA_KEY_NAMES[key])])) as PlanQuotas;
}

/**
 * Quyền lợi VIP đọc từ hạn mức của gói đang bán (D121: mọi gói cùng hạn mức theo Chỉ số hệ thống).
 * Backend cũ chưa trả `plan.benefits` thì trả undefined để dùng `benefits.vip` của danh sách.
 */
export function vipTierFromPlans(plans: Plan[] | undefined): TierBenefits | undefined {
  const quotas = plans?.find((p) => p.isActive && p.benefits)?.benefits;
  if (!quotas) return undefined;
  return {
    chatPerDay: quotas.chatLimitDaily,
    mealPlansPerWeek: quotas.mealPlanLimitWeekly,
    fridgePhotosPerDay: quotas.fridgeScanLimitDaily,
    barcodeScansPerDay: quotas.barcodeScanLimitDaily,
  };
}

/** Dòng quyền lợi để hiển thị. Hỗ trợ fallback từ dynamic settings hoặc QUOTA mặc định. */
export function benefitRows(
  benefits: { free?: TierBenefits; vip?: TierBenefits } | undefined,
  fallbackLimits?: BenefitFallbackLimits
) {
  const defaultFreeChat = fallbackLimits?.chatLimitDailyFree ?? fallbackLimits?.chatDailyLimitFree ?? QUOTA.chatPerDay.free;
  const defaultVipChat = fallbackLimits?.chatLimitDailyVip ?? fallbackLimits?.chatDailyLimitVip ?? QUOTA.chatPerDay.vip;
  const defaultFreePlan = fallbackLimits?.mealPlanWeeklyLimitFree ?? QUOTA.mealPlanPerWeek.free;
  const defaultVipPlan = fallbackLimits?.mealPlanWeeklyLimitVip ?? QUOTA.mealPlanPerWeek.vip;
  const defaultFreeFridge = fallbackLimits?.fridgeScanLimitDailyFree ?? fallbackLimits?.fridgeScanDailyLimitFree ?? QUOTA.fridgeImagesPerDay.free;
  const defaultVipFridge = fallbackLimits?.fridgeScanLimitDailyVip ?? fallbackLimits?.fridgeScanDailyLimitVip ?? QUOTA.fridgeImagesPerDay.vip;
  const defaultFreeBarcode = fallbackLimits?.barcodeScanLimitDailyFree ?? QUOTA.barcodePerDay.free;
  const defaultVipBarcode = fallbackLimits?.barcodeScanLimitDailyVip ?? QUOTA.barcodePerDay.vip;

  const chatVip = benefits?.vip?.chatPerDay;
  const vipChat =
    chatVip === null || chatVip === undefined || chatVip === ''
      ? `tối đa ${defaultVipChat}`
      : String(chatVip);

  const { chatLimitDaily: chat, mealPlanLimitWeekly: meal, fridgeScanLimitDaily: fridge, barcodeScanLimitDaily: barcode } = QUOTA_LABEL;
  return {
    free: [
      [chat.long, `${benefits?.free?.chatPerDay ?? defaultFreeChat} ${chat.unit}`],
      [meal.long, `${benefits?.free?.mealPlansPerWeek ?? defaultFreePlan} ${meal.unit}`],
      [fridge.long, `${benefits?.free?.fridgePhotosPerDay ?? defaultFreeFridge} ${fridge.unit}`],
      [barcode.long, `${benefits?.free?.barcodeScansPerDay ?? defaultFreeBarcode} ${barcode.unit}`],
    ] as [string, string][],
    vip: [
      [chat.long, `${vipChat} ${chat.unit}`],
      [meal.long, `${benefits?.vip?.mealPlansPerWeek ?? defaultVipPlan} ${meal.unit}`],
      [fridge.long, `${benefits?.vip?.fridgePhotosPerDay ?? defaultVipFridge} ${fridge.unit}`],
      [barcode.long, `${benefits?.vip?.barcodeScansPerDay ?? defaultVipBarcode} ${barcode.unit}`],
    ] as [string, string][],
  };
}

/**
 * Số ngày VIP thực nhận, tính từ ngày hiệu lực ghi trên chính giao dịch (theo ngày UTC), để dòng "Thời hạn" khớp
 * với "Hiệu lực từ/đến" in ngay bên dưới. Backend tính hạn khi thanh toán xong theo thời hạn của gói lúc đó
 * (làm tròn tới 23:59:59 UTC) nên hiệu số theo ngày UTC đúng bằng số ngày được kích hoạt.
 */
export function paidDurationDays(startsAt: string | null | undefined, endsAt: string | null | undefined): number | null {
  const start = parseServerDate(startsAt);
  const end = parseServerDate(endsAt);
  if (!start || !end || end <= start) return null;
  const utcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((utcDay(end) - utcDay(start)) / 86_400_000);
}

/** Giá quy đổi theo 30 ngày, suy ra từ dữ liệu API (không có số cứng). */
export const perThirtyDays = (priceVnd: number, durationDays: number) => Math.round((priceVnd / Math.max(1, durationDays)) * 30);
