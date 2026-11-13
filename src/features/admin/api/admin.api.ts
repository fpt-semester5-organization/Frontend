import type { AxiosResponse } from 'axios';
import http, { unwrap, unwrapPaged } from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type {
  AdminIngredient,
  AdminPaymentFilters,
  AdminPaymentTransaction,
  AdminPlan,
  AdminSurveyFilters,
  AdminSurveyListResult,
  AdminUser,
  AdminUserContents,
  AdminUserContentsFilters,
  AdminUserFilters,
  AiMetrics,
  AiMetricsFilters,
  Allergen,
  ApprovePaymentResult,
  CreateAllergenBody,
  CreateENumberBody,
  CreateIngredientBody,
  CreatePlanBody,
  DietarySchool,
  ENumber,
  ENumberFilters,
  IngredientFilters,
  KnowledgeScope,
  KnowledgeStatus,
  LlmopsDashboard,
  LlmopsFilters,
  LlmopsLogFilters,
  LlmopsLogsResponse,
  NutritionDocument,
  ReconcileBody,
  ReconcileResult,
  SystemSetting,
  UpdateDietarySchoolBody,
  UpdateENumberBody,
  UpdateIngredientBody,
  UpdatePlanBody,
  UpdateSystemSettingBody,
  UpdateUserStatusBody,
  UpdateUserStatusResult,
  UploadNutritionDocumentPayload,
  WriteResult,
  IngredientCandidate,
} from '../types/admin.types';

/** Bỏ tham số rỗng để URL gọn và Backend không nhận chuỗi rỗng (`?keyword=`). */
export function compactParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<T>;
}

/** Thao tác ghi: giữ `message` của server cho toast. */
async function write<T>(req: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<WriteResult<T>> {
  const body = (await req).data;
  return { data: body.data, message: body.message };
}

// ---------- SCR-39 Người dùng ----------

/** GET /admin/users — FN-ADM-01. */
export const listAdminUsers = (filters: AdminUserFilters) =>
  unwrapPaged<AdminUser>(http.get('/admin/users', { params: compactParams(filters) }));

/** PUT /admin/users/{id}/status — FN-ADM-02 (thu hồi phiên, gửi email, ghi AuditLogs ở Backend). */
export const updateAdminUserStatus = (userId: number, body: UpdateUserStatusBody) =>
  write<UpdateUserStatusResult>(http.put(`/admin/users/${userId}/status`, body));

/** GET /admin/users/{id}/contents — FN-ADM-03: nội dung + thống kê vi phạm, phân trang theo meta. */
export async function listAdminUserContents(userId: number, filters: AdminUserContentsFilters): Promise<AdminUserContents> {
  const body = (await http.get<ApiEnvelope<Omit<AdminUserContents, 'meta'>>>(`/admin/users/${userId}/contents`, {
    params: compactParams(filters),
  })).data;
  const items = body.data?.items ?? [];
  return {
    ...body.data,
    violationSummary: body.data?.violationSummary ?? { resolved: 0, dismissed: 0 },
    items,
    meta: body.meta ?? { page: 1, size: items.length, total: items.length },
  };
}

// ---------- SCR-42 Trường phái & E-number ----------

/** GET /admin/dietary-schools — FN-ADM-10 (07 trường phái cố định). */
export const listAdminDietarySchools = () => unwrap<DietarySchool[]>(http.get('/admin/dietary-schools'));

/** PUT /admin/dietary-schools/{id} — FN-ADM-10. */
export const updateAdminDietarySchool = (id: number, body: UpdateDietarySchoolBody) =>
  write<{ dietarySchoolId: number }>(http.put(`/admin/dietary-schools/${id}`, body));

/** GET /admin/e-numbers — FN-ADM-11. */
export const listAdminENumbers = (filters: ENumberFilters) =>
  unwrapPaged<ENumber>(http.get('/admin/e-numbers', { params: compactParams(filters) }));

/** POST /admin/e-numbers — FN-ADM-11. */
export const createAdminENumber = (body: CreateENumberBody) => write<{ code: string }>(http.post('/admin/e-numbers', body));

/** PUT /admin/e-numbers/{code} — FN-ADM-11. */
export const updateAdminENumber = (code: string, body: UpdateENumberBody) =>
  write<{ code: string; veganStatus: string }>(http.put(`/admin/e-numbers/${encodeURIComponent(code)}`, body));

// ---------- SCR-43 Nguyên liệu & dị ứng ----------

/** GET /admin/ingredients — FN-ADM-12. */
export const listAdminIngredients = (filters: IngredientFilters) =>
  unwrapPaged<AdminIngredient>(http.get('/admin/ingredients', { params: compactParams(filters) }));

/** POST /admin/ingredients — FN-ADM-12. */
export const createAdminIngredient = (body: CreateIngredientBody) =>
  write<{ ingredientId: number }>(http.post('/admin/ingredients', body));

/** PUT /admin/ingredients/{id} — sửa nguyên liệu (Backend có, OpenAPI chưa có). */
export const updateAdminIngredient = (id: number, body: UpdateIngredientBody) =>
  write<{ ingredientId: number }>(http.put(`/admin/ingredients/${id}`, body));

/** PUT /admin/ingredients/{id}/allergens — FN-ADM-12: thay toàn bộ nhóm dị ứng của nguyên liệu. */
export const replaceAdminIngredientAllergens = (id: number, allergenIds: number[]) =>
  write<{ ingredientId: number; allergenIds: number[] }>(http.put(`/admin/ingredients/${id}/allergens`, { allergenIds }));

/** PATCH /admin/ingredients/{id}/lock — BR-ADM-ING-01: Khóa / Mở khóa nguyên liệu bảo vệ dữ liệu chuẩn. */
export const toggleAdminIngredientLock = (id: number, isLocked: boolean) =>
  write<{ ingredientId: number; isLocked: boolean }>(http.patch(`/admin/ingredients/${id}/lock`, { isLocked }));

/** POST /admin/ingredients/{id}/image — Tải ảnh trực tiếp lên Cloudinary và lưu URL cho nguyên liệu. */
export const uploadAdminIngredientImage = (id: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return write<{ ingredientId: number; imageUrl: string }>(
    http.post(`/admin/ingredients/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
};

/** GET /admin/ingredients/{id}/candidates — FN-ADM-12-CAND: tối đa 05 ảnh ứng viên PENDING từ tủ lạnh người dùng. */
export const listAdminIngredientCandidates = (id: number) =>
  unwrap<IngredientCandidate[]>(http.get(`/admin/ingredients/${id}/candidates`));

/** POST /admin/ingredients/{id}/apply-candidate — FN-ADM-12-APPLY (BR-ADM-ING-03): Admin duyệt ảnh ứng viên làm ảnh đại diện. */
export const applyAdminIngredientCandidate = (id: number, candidateId: number) =>
  write<{ ingredientId: number; candidateId: number; imageUrl: string }>(
    http.post(`/admin/ingredients/${id}/apply-candidate`, { candidateId }),
  );

/** POST /admin/allergens — FN-ADM-12. */
export const createAdminAllergen = (body: CreateAllergenBody) =>
  write<{ allergenId: number }>(http.post('/admin/allergens', body));

/** GET /allergens — danh mục nhóm dị ứng dùng chung (không có API admin riêng để liệt kê). */
export const listAllergens = () => unwrap<Allergen[]>(http.get('/allergens'));

// ---------- SCR-44 Gói VIP & đối soát ----------

/** GET /admin/subscription-plans — FN-ADM-13 (cả gói đang ẩn). */
export const listAdminPlans = () => unwrap<AdminPlan[]>(http.get('/admin/subscription-plans'));

/** POST /admin/subscription-plans — FN-ADM-13. */
export const createAdminPlan = (body: CreatePlanBody) => write<{ planId: number }>(http.post('/admin/subscription-plans', body));

/** PUT /admin/subscription-plans/{id} — FN-ADM-13: giá mới chỉ áp dụng cho đơn mới (BR-ADM-PAY-001). */
export const updateAdminPlan = (id: number, body: UpdatePlanBody) =>
  write<{ planId: number; priceVnd: number }>(http.put(`/admin/subscription-plans/${id}`, body));

/** DELETE /admin/subscription-plans/{id} — FN-ADM-13: Xóa gói nếu chưa có giao dịch, tự động ẩn nếu đã có giao dịch. */
export const deleteAdminPlan = (id: number) =>
  write<unknown>(http.delete(`/admin/subscription-plans/${id}`));

/** POST /admin/payments/{id}/reconcile — FN-ADM-13 (BR-ADM-PAY-002), mỗi giao dịch chỉ đối soát 1 lần. */
export const reconcileAdminPayment = (transactionId: number, body: ReconcileBody) =>
  write<ReconcileResult>(http.post(`/admin/payments/${transactionId}/reconcile`, body));

/** GET /admin/payments — FN-ADM-13: danh sách giao dịch nạp VIP phân trang, hỗ trợ tìm kiếm & lọc. */
export const listAdminPayments = (filters: AdminPaymentFilters) =>
  unwrapPaged<AdminPaymentTransaction>(http.get('/admin/payments', { params: compactParams(filters) }));

/** POST /admin/payments/{id}/approve — FN-ADM-13: duyệt thủ công giao dịch chuyển khoản khi tiền đã về tài khoản. */
export const approveAdminPayment = (transactionId: number) =>
  write<ApprovePaymentResult>(http.post(`/admin/payments/${transactionId}/approve`));

// ---------- Cấu hình hệ thống động (System Settings) ----------

/** GET /admin/settings — FN-ADM-20: lấy toàn bộ hoặc lọc theo danh mục chỉ số hệ thống. */
export const listAdminSettings = (category?: string) =>
  unwrap<SystemSetting[]>(http.get('/admin/settings', { params: compactParams({ category }) }));

/** GET /admin/settings/{key} — FN-ADM-20: chi tiết một chỉ số hệ thống. */
export const getAdminSetting = (key: string) =>
  unwrap<SystemSetting>(http.get(`/admin/settings/${encodeURIComponent(key)}`));

/** PUT /admin/settings/{key} — FN-ADM-20: cập nhật chỉ số hệ thống. */
export const updateAdminSetting = (key: string, body: UpdateSystemSettingBody) =>
  write<SystemSetting>(http.put(`/admin/settings/${encodeURIComponent(key)}`, body));

/** POST /admin/settings/{key}/reset — FN-ADM-20: khôi phục chỉ số về giá trị mặc định. */
export const resetAdminSetting = (key: string) =>
  write<SystemSetting>(http.post(`/admin/settings/${encodeURIComponent(key)}/reset`));

// ---------- SCR-41 Giám sát AI ----------

/** GET /admin/ai/metrics — FN-ADM-15. */
export const getAdminAiMetrics = (filters: AiMetricsFilters) =>
  unwrap<AiMetrics>(http.get('/admin/ai/metrics', { params: compactParams(filters) }));

/** GET /admin/llmops/dashboard — FN-ADM-16. */
export async function getAdminLlmopsDashboard(filters: LlmopsFilters): Promise<LlmopsDashboard> {
  const data = await unwrap<LlmopsDashboard>(http.get('/admin/llmops/dashboard', { params: compactParams(filters) }));
  return { ...data, series: Array.isArray(data?.series) ? data.series : [] };
}

/** GET /admin/llmops/logs — FN-ADM-16 (nhật ký AIQuotaLogs phân trang). */
export const getAdminLlmopsLogs = (filters: LlmopsLogFilters) =>
  unwrap<LlmopsLogsResponse>(http.get('/admin/llmops/logs', { params: compactParams(filters) }));

/** GET /admin/knowledge/status — FN-CHAT-07 (trạng thái kho vector Qdrant). */
export async function getAdminKnowledgeStatus(): Promise<KnowledgeStatus> {
  const data = await unwrap<KnowledgeStatus>(http.get('/admin/knowledge/status'));
  return { ...data, bySource: data?.bySource ?? {}, lastIndexedAt: data?.lastIndexedAt ?? null };
}

/** POST /admin/knowledge/reindex — FN-CHAT-07: xếp job đồng bộ lại (202). */
export const reindexAdminKnowledge = (scope: KnowledgeScope) =>
  write<{ jobId?: string }>(http.post('/admin/knowledge/reindex', { scope }));

/** GET /admin/knowledge/documents — FN-CHAT-07: danh sách tài liệu dinh dưỡng PDF. */
export const listAdminNutritionDocuments = () =>
  unwrap<NutritionDocument[]>(http.get('/admin/knowledge/documents'));

/** POST /admin/knowledge/documents/upload — FN-CHAT-07: tải lên và vector hoá PDF vào Qdrant. */
export async function uploadAdminNutritionDocument(payload: UploadNutritionDocumentPayload): Promise<NutritionDocument> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('title', payload.title);
  if (payload.author) {
    formData.append('author', payload.author);
  }
  return unwrap<NutritionDocument>(
    http.post('/admin/knowledge/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Sách dài cần nhúng hàng trăm đoạn; PDF scan còn phải OCR bằng Gemini (~1 giây/trang) → không dùng timeout chung 15 giây
      timeout: 15 * 60 * 1000,
    })
  );
}

/** PUT /admin/knowledge/documents/{id}/status — FN-CHAT-07: bật/tắt trạng thái sử dụng tài liệu. */
export const updateAdminNutritionDocumentStatus = (id: string, isActive: boolean) =>
  write<NutritionDocument>(http.put(`/admin/knowledge/documents/${encodeURIComponent(id)}/status`, { isActive }));

/** DELETE /admin/knowledge/documents/{id} — FN-CHAT-07: xóa tài liệu khỏi Vector DB. */
export const deleteAdminNutritionDocument = (id: string) =>
  write<null>(http.delete(`/admin/knowledge/documents/${encodeURIComponent(id)}`));

/** GET /admin/ai/surveys — FN-ADM-15, FN-CHAT-06: danh sách khảo sát phản hồi Chatbot AI. */
export const listAdminAiSurveys = (filters: AdminSurveyFilters) =>
  unwrap<AdminSurveyListResult>(http.get('/admin/ai/surveys', { params: compactParams(filters) }));

