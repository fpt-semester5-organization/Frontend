import type { components, operations, paths } from './generated/schema';

/** Schema sinh từ docs/08. OpenAPI Specification.yaml (npm run gen:api). */
export type Schemas = components['schemas'];
export type ApiPaths = paths;
/** Tham số theo operationId, ví dụ ApiOperations['listPosts']['parameters']['query']. */
export type ApiOperations = operations;

/** Meta phân trang chuẩn (D111): { page, size, total }. */
export interface PageMeta {
  page: number;
  size: number;
  total: number;
}

/** Envelope thành công (D52): { statusCode, message, data[, meta] }. Không có trường `success`. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: PageMeta;
}

/** Phần tử details[] của lỗi ERR_VALIDATION (API Specification, Quy tắc 1). */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Envelope lỗi (D52): { statusCode, errorCode, message[, details] }. */
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: ApiErrorDetail[];
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
