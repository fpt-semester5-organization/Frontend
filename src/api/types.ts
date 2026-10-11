/**
 * Envelope chuẩn của API VeggieLife (Architecture & Deployment — Decision Log):
 *   thành công: { statusCode, message, data[, meta] }
 *   lỗi:        { statusCode, errorCode, message[, details] }
 * KHÔNG có trường `success`.
 */
export interface ApiMeta {
  page: number;
  size: number;
  total: number;
  /** Chỉ ở GET /recipes cho Khách: xem tới mục thứ N thì mời đăng ký (BR-GUEST-01). */
  signUpPromptAtItem?: number;
}

export interface ApiEnvelope<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: ApiFieldError[];
  /** Có ở một số lỗi: remainingAttempts, suspendedUntil, lockedUntil, registerUrl/loginUrl, failedCriteria… */
  data?: Record<string, unknown> | null;
  correlationId?: string;
}

export interface Paged<T> {
  items: T[];
  meta: ApiMeta;
}
