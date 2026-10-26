import type { AxiosResponse } from 'axios';
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/api/http';
import type { ApiEnvelope, ApiMeta } from '@/api/types';
import { toast } from '@/stores/ui.store';

/** Kết quả đã bóc envelope, giữ lại `message` của server để hiện toast thành công (spec UI §1). */
export interface ApiResult<T> {
  data: T;
  message: string;
  meta?: ApiMeta;
}

export async function apiCall<T>(req: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<ApiResult<T>> {
  const body = (await req).data;
  return { data: body.data, message: body.message, meta: body.meta };
}

/** Danh sách có phân trang `{items, meta}` — dùng chung `unwrapPaged` của http.ts (meta có thể vắng). */
export { unwrapPaged } from '@/api/http';

/** Bỏ tham số rỗng/undefined trước khi gửi query string. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;
}

/** Thêm khoảng ngày (YYYY-MM-DD) hợp lệ: bỏ khi người dùng để trống. */
export const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Xử lý lỗi mutation ở tầng toast. 429/5xx đã được http.ts báo (toast/banner) nên bỏ qua ở đây để không báo đôi;
 * 4xx hiện `message` của server, rơi về câu tiếng Việt theo `errorCode`.
 */
export function toastApiError(err: unknown) {
  const status = apiErrorStatus(err);
  if (status && (status === 429 || status >= 500)) return;
  toast.error(apiErrorMessage(err));
}

export { apiErrorCode, apiErrorMessage };
