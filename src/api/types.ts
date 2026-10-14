import type { components, operations, paths } from './generated/schema';

/** Schema sinh từ docs/08. OpenAPI Specification.yaml (npm run gen:api). */
export type Schemas = components['schemas'];
export type ApiPaths = paths;
/** Tham số theo operationId, ví dụ ApiOperations['listPosts']['parameters']['query']. */
export type ApiOperations = operations;

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

export type PageMeta = ApiMeta;

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

export type ApiErrorDetail = ApiFieldError;

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

/**
 * OpenAPI không đánh dấu `required` cho các trường bên trong `data`, nên type sinh ra
 * đều là tùy chọn. Dùng DeepRequired cho dữ liệu server luôn trả đủ trường như ví dụ mẫu.
 */
export type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;
