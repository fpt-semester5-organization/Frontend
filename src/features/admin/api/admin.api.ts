import type { AxiosResponse } from 'axios';
import http, { unwrap, unwrapPaged } from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type {
  AdminIngredient,
  AdminPlan,
  AdminUser,
  AdminUserContents,
  AdminUserContentsFilters,
  AdminUserFilters,
  AdminVenue,
  AdminVenueFilters,
  AiMetrics,
  AiMetricsFilters,
  Allergen,
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
  ReconcileBody,
  ReconcileResult,
  UpdateDietarySchoolBody,
  UpdateENumberBody,
  UpdateIngredientBody,
  UpdatePlanBody,
  UpdateUserStatusBody,
  UpdateUserStatusResult,
  WriteResult,
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

/** POST /admin/payments/{id}/reconcile — FN-ADM-13 (BR-ADM-PAY-002), mỗi giao dịch chỉ đối soát 1 lần. */
export const reconcileAdminPayment = (transactionId: number, body: ReconcileBody) =>
  write<ReconcileResult>(http.post(`/admin/payments/${transactionId}/reconcile`, body));

// ---------- SCR-45 Quán chay ----------

/** GET /admin/venues — FN-ADM-14 (cả quán đang ẩn). */
export const listAdminVenues = (filters: AdminVenueFilters) =>
  unwrapPaged<AdminVenue>(http.get('/admin/venues', { params: compactParams(filters) }));

/** PUT /admin/venues/{id} — FN-ADM-14: ẩn/hiện quán (BR-ADM-MAP-001). */
export const updateAdminVenue = (id: number, isActive: boolean) =>
  write<{ venueId: number; isActive: boolean }>(http.put(`/admin/venues/${id}`, { isActive }));

/** POST /admin/venues/sync — FN-ADM-14: xếp job đồng bộ nguồn theo tỉnh/thành (202). */
export const syncAdminVenues = (province: string) => write<{ jobId: string }>(http.post('/admin/venues/sync', { province }));

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
