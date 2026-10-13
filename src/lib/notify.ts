import { ERROR_MESSAGES, isKnownErrorCode } from '@/constants/errorCodes';
import { toApiError, type ApiError } from '@/lib/apiError';
import { useUiStore } from '@/stores/ui.store';

const TOO_FAST_MESSAGE = 'Thao tác quá nhanh, thử lại sau.';
const SYSTEM_ERROR_MESSAGE = 'Lỗi hệ thống, vui lòng thử lại.';
const SERVICE_DOWN_MESSAGE = 'Dịch vụ tạm gián đoạn, vui lòng thử lại.';
const NETWORK_MESSAGE = 'Không kết nối được máy chủ, vui lòng kiểm tra mạng và thử lại.';

/** Câu tiếng Việt cho người dùng: ưu tiên message server trả, sau đó tới bảng errorCodes (UI-4). */
export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.message) return apiError.message;
  if (isKnownErrorCode(apiError.errorCode)) return ERROR_MESSAGES[apiError.errorCode];
  if (apiError.status === 0) return NETWORK_MESSAGE;
  if (apiError.status >= 500) return SYSTEM_ERROR_MESSAGE;
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}

/**
 * Hành vi chung theo nhóm mã lỗi (UI Screen Spec mục 1.1) cho thao tác ghi:
 * 429 → toast "Thao tác quá nhanh"; 500 → toast lỗi hệ thống + correlationId ra console;
 * 502/503 → toast dịch vụ gián đoạn; 403 ERR_GUEST_* đã được http.ts mở SignupPromptModal.
 * Trả về ApiError để màn hình xử lý tiếp (lỗi theo trường, hộp thoại 409/422...).
 */
export function notifyApiError(error: unknown): ApiError {
  const apiError = toApiError(error);
  const { pushToast } = useUiStore.getState();

  if (apiError.status === 403 && apiError.errorCode.startsWith('ERR_GUEST_')) return apiError;

  if (apiError.status === 429) {
    pushToast('warning', apiError.message || TOO_FAST_MESSAGE);
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
