import { QUOTA } from '@/constants/quota';
import type { TierBenefits } from '../types/subscription.types';

/** Tính năng chỉ VIP mới có (BR-PAY-SUB-03), ngoài các hạn mức trong `benefitRows`. */
export const VIP_EXCLUSIVE_FEATURES = ['Xem calo chi tiết của thực đơn tuần', 'Xuất PDF thực đơn và danh sách đi chợ'];

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

  const chatVip = benefits?.vip?.chatPerDay;
  const vipChat =
    chatVip === null || chatVip === undefined || chatVip === ''
      ? `tối đa ${defaultVipChat}`
      : String(chatVip);

  return {
    free: [
      ['Số lần người dùng được hỏi Trợ lý AI', `${benefits?.free?.chatPerDay ?? defaultFreeChat} câu/ngày`],
      ['Số lần được tạo Thực đơn tuần', `${benefits?.free?.mealPlansPerWeek ?? defaultFreePlan} lần/tuần`],
      ['Số lần được dùng tính năng Quét tủ lạnh', `${benefits?.free?.fridgePhotosPerDay ?? defaultFreeFridge} ảnh/ngày`],
    ] as [string, string][],
    vip: [
      ['Số lần người dùng được hỏi Trợ lý AI', `${vipChat} câu/ngày`],
      ['Số lần được tạo Thực đơn tuần', `${benefits?.vip?.mealPlansPerWeek ?? defaultVipPlan} lần/tuần`],
      ['Số lần được dùng tính năng Quét tủ lạnh', `${benefits?.vip?.fridgePhotosPerDay ?? defaultVipFridge} ảnh/ngày`],
    ] as [string, string][],
  };
}

/** Giá quy đổi theo 30 ngày, suy ra từ dữ liệu API (không có số cứng). */
export const perThirtyDays = (priceVnd: number, durationDays: number) => Math.round((priceVnd / Math.max(1, durationDays)) * 30);
