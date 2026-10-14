import http, { refreshAccessToken } from '@/api/http';
import type { ApiEnvelope, ApiErrorBody } from '@/api/types';
import { ApiError } from '@/lib/apiError';
import type {
  ActivateResult,
  CompleteSlotResult,
  CreateMealPlanBody,
  MealPlanDetail,
  MealPlanListItem,
  MealPlanNutrition,
  NutritionLevel,
  SwapSlotBody,
  SwapSlotResult,
} from '../types/mealPlan.types';

/** AI sinh thực đơn ≤ 8 giây, Fallback ≤ 2 giây (FN-MEAL-01): chờ dư để không cắt ngang khi mạng chậm. */
const GENERATE_TIMEOUT_MS = 30 * 1000;

/** GET /meal-plans — FN-MEAL-02 Danh sách thực đơn của tôi, mới nhất trước. */
export async function listMealPlans(params: { page: number; size: number }) {
  const res = await http.get<ApiEnvelope<MealPlanListItem[]>>('/meal-plans', { params });
  return res.data;
}

/** GET /meal-plans/{id} — FN-MEAL-02 Chi tiết 21 bữa. */
export async function getMealPlan(planId: number) {
  const res = await http.get<ApiEnvelope<MealPlanDetail>>(`/meal-plans/${planId}`);
  return res.data.data;
}

/** POST /meal-plans — FN-MEAL-01 Sinh thực đơn tuần bằng AI (DRAFT). */
export async function createMealPlan(body: CreateMealPlanBody) {
  const res = await http.post<ApiEnvelope<MealPlanDetail>>('/meal-plans', body, { timeout: GENERATE_TIMEOUT_MS });
  return res.data;
}

/** POST /meal-plans/{id}/activate — FN-MEAL-02 Kích hoạt thực đơn DRAFT. */
export async function activateMealPlan(planId: number) {
  const res = await http.post<ApiEnvelope<ActivateResult>>(`/meal-plans/${planId}/activate`);
  return res.data;
}

/** PUT /meal-plans/{id}/slots/{slotId} — FN-MEAL-03 Đổi món. */
export async function swapMealSlot(planId: number, slotId: number, body: SwapSlotBody) {
  const res = await http.put<ApiEnvelope<SwapSlotResult>>(`/meal-plans/${planId}/slots/${slotId}`, body);
  return res.data;
}

/** PATCH /meal-plans/{id}/slots/{slotId} — FN-MEAL-04 Đánh dấu đã ăn / chưa ăn. */
export async function setMealSlotCompleted(planId: number, slotId: number, isCompleted: boolean) {
  const res = await http.patch<ApiEnvelope<CompleteSlotResult>>(`/meal-plans/${planId}/slots/${slotId}`, { isCompleted });
  return res.data.data;
}

/** GET /meal-plans/{id}/nutrition — FN-MEAL-07 BASIC cho mọi thành viên, DETAILED chỉ VIP. */
export async function getMealPlanNutrition(planId: number, level: NutritionLevel) {
  const res = await http.get<ApiEnvelope<MealPlanNutrition>>(`/meal-plans/${planId}/nutrition`, { params: { level } });
  return res.data.data;
}

/** Lỗi của request tải tệp cũng về dạng Blob: đọc lại JSON để giữ errorCode/message của server. */
async function blobToApiError(status: number, body: unknown): Promise<ApiError> {
  try {
    const parsed: unknown = JSON.parse(body instanceof Blob ? await body.text() : String(body));
    const { errorCode, message, details } = parsed as Partial<ApiErrorBody>;
    if (typeof errorCode === 'string') {
      return new ApiError({ status, errorCode, message: message ?? '', details: details ?? [] });
    }
  } catch {
    // Body không phải JSON: dùng lỗi chung theo mã HTTP.
  }
  return new ApiError({ status, errorCode: status >= 500 ? 'ERR_INTERNAL' : 'ERR_UNKNOWN', message: '' });
}

/** GET /meal-plans/{id}/export — FN-MEAL-08 Tệp PDF (VIP); tải về máy, không lưu trên máy chủ. */
export async function exportMealPlanPdf(planId: number, include: 'PLAN' | 'PLAN,SHOPPING') {
  const request = () =>
    http.get<Blob>(`/meal-plans/${planId}/export`, {
      params: { include },
      responseType: 'blob',
      validateStatus: () => true,
    });
  let res = await request();
  // Không qua interceptor lỗi của http.ts nên tự làm mới token một lần khi 401.
  if (res.status === 401) {
    await refreshAccessToken();
    res = await request();
  }
  if (res.status >= 200 && res.status < 300) return res.data;
  throw await blobToApiError(res.status, res.data);
}
