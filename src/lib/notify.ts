import { AxiosError } from 'axios';
import { ERROR_MESSAGES, isKnownErrorCode } from '@/constants/errorCodes';
import { toApiError, type ApiError } from '@/lib/apiError';
import { cleanUserMessage } from '@/lib/userMessage';
import { useUiStore } from '@/stores/ui.store';

const TOO_FAST_MESSAGE = 'Thao tác quá nhanh, thử lại sau.';
const SYSTEM_ERROR_MESSAGE = 'Lỗi hệ thống, vui lòng thử lại.';
const SERVICE_DOWN_MESSAGE = 'Dịch vụ tạm gián đoạn, vui lòng thử lại.';
const NETWORK_MESSAGE = 'Không kết nối được máy chủ, vui lòng kiểm tra mạng và thử lại.';

/** Câu tiếng Việt cho người dùng: ưu tiên message server trả, sau đó tới bảng errorCodes (UI-4). */
export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.message) return apiError.message;
  // ERR_INTERNAL/ERR_UNKNOWN do toApiError tự gán khi server không trả envelope: chọn câu theo mã HTTP (503 → gián đoạn).
  const synthetic = ['ERR_INTERNAL', 'ERR_UNKNOWN'].includes(apiError.errorCode) && apiError.status !== 0;
  if (!synthetic && isKnownErrorCode(apiError.errorCode)) return cleanUserMessage(ERROR_MESSAGES[apiError.errorCode]);
  if (apiError.status === 0) return NETWORK_MESSAGE;
  if (apiError.status === 502 || apiError.status === 503) return SERVICE_DOWN_MESSAGE;
  if (apiError.status >= 500) return SYSTEM_ERROR_MESSAGE;
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}

/**
 * Interceptor của http.ts đã báo các lỗi này cho mọi request (429 → toast, 503 → banner, 5xx → toast,
 * hạn mức → toast hoặc popup đăng ký); báo thêm ở đây sẽ thành 2 thông báo trùng nhau.
 */
const handledByInterceptor = (error: unknown, apiError: ApiError) =>
  error instanceof AxiosError &&
  !!error.response &&
  (apiError.status === 429 ||
    apiError.status >= 500 ||
    (apiError.status === 403 && /^ERR_(GUEST|QUOTA)_/.test(apiError.errorCode)));

/**
 * Hành vi chung theo nhóm mã lỗi (UI Screen Spec mục 1.1) cho thao tác ghi:
 * 429 → toast "Thao tác quá nhanh"; 500 → toast lỗi hệ thống + correlationId ra console;
 * 502/503 → dịch vụ gián đoạn; 403 ERR_GUEST_* đã được http.ts mở SignupPromptModal.
 * Lỗi đã được interceptor báo thì không báo lại. Trả về ApiError để màn hình xử lý tiếp (lỗi theo trường, hộp thoại 409/422...).
 */
export function notifyApiError(error: unknown): ApiError {
  const apiError = toApiError(error);
  const { pushToast } = useUiStore.getState();

  if (apiError.status === 403 && apiError.errorCode.startsWith('ERR_GUEST_')) return apiError;
  if (handledByInterceptor(error, apiError)) return apiError;

  if (apiError.status === 429) {
    pushToast('warning', cleanUserMessage(apiError.message) || TOO_FAST_MESSAGE);
  } else if (apiError.status === 502 || apiError.status === 503) {
    pushToast('danger', apiError.message || SERVICE_DOWN_MESSAGE);
  } else if (apiError.status >= 500) {
    console.error('[API] Lỗi hệ thống', {
      errorCode: apiError.errorCode,
      correlationId: apiError.correlationId,
    });
    pushToast('danger', SYSTEM_ERROR_MESSAGE);
  } else {
    pushToast('danger', getErrorMessage(apiError));
  }
  return apiError;
}

export const notifySuccess = (message: string) => useUiStore.getState().pushToast('success', message);
export const notifyInfo = (message: string) => useUiStore.getState().pushToast('info', message);
export const notifyWarning = (message: string) => useUiStore.getState().pushToast('warning', message);
export const notifyError = (message: string) => useUiStore.getState().pushToast('danger', message);
