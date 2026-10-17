import { QUOTA } from '@/constants/quota';
import type { TierBenefits } from '../types/subscription.types';

/** Dòng quyền lợi để hiển thị. `chatPerDay` của VIP có thể null: hiển thị "tối đa N" theo BR (QUOTA.chatPerDay.vip). */
export function benefitRows(benefits: { free?: TierBenefits; vip?: TierBenefits } | undefined) {
  const chatVip = benefits?.vip?.chatPerDay;
  const vipChat = chatVip === null || chatVip === undefined || chatVip === '' ? `tối đa ${QUOTA.chatPerDay.vip}` : String(chatVip);
  return {
    free: [
      ['Trợ lý AI', `${benefits?.free?.chatPerDay ?? QUOTA.chatPerDay.free} câu/ngày`],
      ['Thực đơn tuần', `${benefits?.free?.mealPlansPerWeek ?? QUOTA.mealPlanPerWeek.free} lần/tuần`],
      ['Quét tủ lạnh', `${benefits?.free?.fridgePhotosPerDay ?? QUOTA.fridgeImagesPerDay.free} ảnh/ngày`],
    ] as [string, string][],
    vip: [
      ['Trợ lý AI', `${vipChat} câu/ngày`],
      ['Thực đơn tuần', `${benefits?.vip?.mealPlansPerWeek ?? QUOTA.mealPlanPerWeek.vip} lần/tuần`],
      ['Quét tủ lạnh', `${benefits?.vip?.fridgePhotosPerDay ?? QUOTA.fridgeImagesPerDay.vip} ảnh/ngày`],
    ] as [string, string][],
  };
}

/** Giá quy đổi theo 30 ngày, suy ra từ dữ liệu API (không có số cứng). */
export const perThirtyDays = (priceVnd: number, durationDays: number) => Math.round((priceVnd / Math.max(1, durationDays)) * 30);
