import { toApiError } from '@/lib/apiError';

/**
 * Backend chưa có route (404/405 không kèm envelope lỗi) — khác 404 nghiệp vụ như ERR_ADM_NOT_FOUND.
 * Dùng cho các màn làm theo OpenAPI trong khi Backend chưa triển khai (trường phái, E-number, giám sát AI).
 */
export function isMissingEndpoint(error: unknown): boolean {
  const apiError = toApiError(error);
  return (apiError.status === 404 || apiError.status === 405) && apiError.errorCode === 'ERR_UNKNOWN';
}

/** 404 nghiệp vụ: đối tượng không tồn tại (ERR_ADM_NOT_FOUND…). */
export function isNotFound(error: unknown): boolean {
  const apiError = toApiError(error);
  return apiError.status === 404 && apiError.errorCode !== 'ERR_UNKNOWN';
}

/** Không thử lại lỗi 4xx; lỗi máy chủ thử lại 1 lần. */
export const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;
