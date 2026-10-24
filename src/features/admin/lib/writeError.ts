import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError, type ApiError } from '@/lib/apiError';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError } from '@/lib/notify';
import { toast } from '@/stores/ui.store';
import { isMissingEndpoint } from './endpoint';

interface WriteErrorOptions<T extends FieldValues> {
  setError?: UseFormSetError<T>;
  fields?: readonly Path<T>[];
  /** 409/422: mở hộp thoại giải thích với message của server, giữ dữ liệu đã nhập. */
  onConflict?: (message: string) => void;
}

/**
 * Lỗi của thao tác ghi trên màn Admin, theo bảng mã lỗi SCR-39…45:
 * 400 → lỗi dưới từng trường (details[]); 409/422 → hộp thoại; 403 ERR_ADM_FORBIDDEN → toast cảnh báo, không đổi trang;
 * Backend chưa có route → toast nói rõ; còn lại theo hành vi chung (notifyApiError).
 */
export function handleWriteError<T extends FieldValues>(error: unknown, options: WriteErrorOptions<T> = {}): ApiError {
  const apiError = toApiError(error);
  if (options.setError && options.fields && applyServerFieldErrors(error, options.setError, options.fields)) return apiError;
  if ((apiError.status === 409 || apiError.status === 422) && options.onConflict) {
    options.onConflict(getErrorMessage(apiError));
    return apiError;
  }
  if (apiError.status === 403 && apiError.errorCode === 'ERR_ADM_FORBIDDEN') {
    toast.warning(getErrorMessage(apiError));
    return apiError;
  }
  if (isMissingEndpoint(error)) {
    toast.error('Máy chủ chưa hỗ trợ thao tác này.');
    return apiError;
  }
  return notifyApiError(error);
}
