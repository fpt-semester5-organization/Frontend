import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';

export interface PublicSystemSettings {
  // Hạn mức thực đơn tuần & đổi món
  mealPlanWeeklyLimitFree: number;
  mealPlanWeeklyLimitVip: number;
  mealSwapLimitDraft: number;
  mealSwapLimitActive: number;
  mealSwapCalorieTolerancePercent: number;

  // Định mức AI Chatbot & Quét tủ lạnh
  chatLimitDailyGuest: number;
  chatLimitDailyFree: number;
  chatLimitDailyVip: number;
  fridgeScanLimitDailyFree: number;
  fridgeScanLimitDailyVip: number;

  // Tài liệu pháp lý
  legalUserAgreementUrl?: string;
  legalPrivacyPolicyUrl?: string;
  legalTermsOfServiceUrl?: string;
  legalVeganDisclaimerUrl?: string;
}

/**
 * Lấy cấu hình hệ thống công khai từ Backend (GET /api/v1/system/settings/public).
 * Phục vụ đồng bộ thời gian thực các hạn mức tạo thực đơn, chatbot, quét tủ lạnh trên toàn ứng dụng.
 */
export async function getPublicSettings(): Promise<PublicSystemSettings> {
  const res = await http.get<ApiEnvelope<PublicSystemSettings>>('/system/settings/public');
  return res.data.data;
}
