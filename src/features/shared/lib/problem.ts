import axios from 'axios';
import { errorMessage } from '@/constants/errorCodes';
import type { ApiErrorBody } from '@/api/types';

/** Lỗi API đã chuẩn hóa để UI hiển thị theo `errorCode` (không bịa dữ liệu khi lỗi). */
export interface Problem {
  status?: number;
  code?: string;
  message: string;
  /** Lỗi theo từng trường (`details[]`). */
  fields: Record<string, string>;
  /** Hết thời gian chờ (ECONNABORTED/ETIMEDOUT). */
  timeout: boolean;
  /** Không có phản hồi từ máy chủ (mạng/backend tắt). */
  offline: boolean;
  /** Lỗi do dịch vụ AI/bên thứ ba (502/503/504). */
  upstream: boolean;
  /** Dữ liệu phụ đi kèm lỗi (`data` trong error body). */
  data?: Record<string, unknown>;
}

const AI_DOWN = 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.';
const AI_SLOW = 'AI phản hồi quá lâu. Yêu cầu có thể chưa được xử lý — vui lòng thử lại.';
const OFFLINE = 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';

export function toProblem(err: unknown, fallback?: string): Problem {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    const status = err.response?.status;
    const body = err.response?.data;
    const timeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    const offline = !err.response && !timeout;
    const upstream = status === 502 || status === 503 || status === 504;
    const code = body?.errorCode;
    const fields = Object.fromEntries((body?.details ?? []).map((d) => [d.field, d.message]));
    let message = body?.message || errorMessage(code, '');
    if (!message) {
      if (timeout) message = AI_SLOW;
      else if (offline) message = OFFLINE;
      else if (upstream) message = AI_DOWN;
      else message = fallback ?? 'Đã xảy ra lỗi, vui lòng thử lại.';
    }
    return { status, code, message, fields, timeout, offline, upstream, data: body?.data ?? undefined };
  }
  return { message: err instanceof Error && err.message ? err.message : (fallback ?? 'Đã xảy ra lỗi, vui lòng thử lại.'), fields: {}, timeout: false, offline: false, upstream: false };
}

/** Mã lỗi hạn mức/VIP — kích hoạt popup đăng ký (Khách) hoặc mời nâng cấp VIP (Free). */
export const QUOTA_ERROR_CODES = [
  'ERR_QUOTA_AI_EXCEEDED',
  'ERR_QUOTA_BARCODE_EXCEEDED',
  'ERR_QUOTA_MAP_EXCEEDED',
  'ERR_QUOTA_MEAL_PLAN_EXCEEDED',
  'ERR_QUOTA_MEAL_SWAP_EXCEEDED',
  'ERR_VIP_REQUIRED',
] as const;
export type QuotaErrorCode = (typeof QUOTA_ERROR_CODES)[number];

export const isQuotaCode = (c?: string): c is QuotaErrorCode => !!c && (QUOTA_ERROR_CODES as readonly string[]).includes(c);

/** Lỗi 403 dành cho Khách (http.ts đã mở SignupPromptModal) — trang không cần hiện thêm gì. */
export const isGuestRestriction = (c?: string) => !!c && /^ERR_GUEST_/.test(c);
