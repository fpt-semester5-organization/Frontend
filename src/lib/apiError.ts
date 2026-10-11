import { AxiosError } from 'axios';
import type { ApiErrorBody, ApiErrorDetail } from '@/api/types';

/** Lỗi API đã chuẩn hóa từ envelope lỗi { statusCode, errorCode, message, details }. */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly details: ApiErrorDetail[];
  readonly correlationId?: string;

  constructor(params: {
    status: number;
    errorCode: string;
    message: string;
    details?: ApiErrorDetail[];
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.details = params.details ?? [];
    this.correlationId = params.correlationId;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const isErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiErrorBody).errorCode === 'string' &&
  typeof (value as ApiErrorBody).message === 'string';

/** Chuyển mọi lỗi (AxiosError, lỗi mạng, lỗi lạ) về ApiError để giao diện xử lý một kiểu. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof AxiosError) {
    const body = error.response?.data;
    // UNSPECIFIED: tên header correlationId chưa có trong đặc tả; tạm đọc X-Correlation-Id.
    const correlationId = error.response?.headers?.['x-correlation-id'] as string | undefined;

    if (error.response && isErrorBody(body)) {
      return new ApiError({
        status: error.response.status,
        errorCode: body.errorCode,
        message: body.message,
        details: Array.isArray(body.details) ? body.details : [],
        correlationId,
      });
    }
    if (error.response) {
      return new ApiError({
        status: error.response.status,
        errorCode: error.response.status >= 500 ? 'ERR_INTERNAL' : 'ERR_UNKNOWN',
        message: '',
        correlationId,
      });
    }
    return new ApiError({ status: 0, errorCode: 'ERR_NETWORK', message: '' });
  }

  return new ApiError({ status: 0, errorCode: 'ERR_UNKNOWN', message: '' });
}
