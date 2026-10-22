import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/apiError';
import { getErrorMessage, notifyApiError } from '@/lib/notify';
import { useUiStore } from '@/stores/ui.store';

/** AxiosError giống hệt lỗi axios thật khi server trả mã HTTP lỗi. */
const axiosError = (status: number, data: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {} as AxiosResponse['config'],
    data,
  });

describe('Thông báo lỗi cho người dùng (UI-4)', () => {
  beforeEach(() => useUiStore.setState({ toasts: [] }));

  it('không bao giờ trả câu kỹ thuật của axios', () => {
    expect(getErrorMessage(axiosError(503, '<html>Bad gateway</html>'))).toBe('Dịch vụ tạm gián đoạn, vui lòng thử lại.');
    expect(getErrorMessage(axiosError(500, ''))).toBe('Lỗi hệ thống, vui lòng thử lại.');
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(
      'Không kết nối được máy chủ, vui lòng kiểm tra mạng và thử lại.',
    );
  });

  it('dùng câu của server sau khi đã bỏ mã tham chiếu', () => {
    const err = axiosError(403, { statusCode: 403, errorCode: 'ERR_VIP_REQUIRED', message: 'Chỉ dành cho VIP (FN-MEAL-08).' });
    expect(getErrorMessage(err)).toBe('Chỉ dành cho VIP.');
  });

  it('không hiện thêm toast cho lỗi 5xx mà interceptor của http.ts đã báo', () => {
    notifyApiError(axiosError(500, { statusCode: 500, errorCode: 'ERR_INTERNAL', message: '' }));
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('vẫn báo lỗi nghiệp vụ (4xx) bằng câu tiếng Việt', () => {
    notifyApiError(new ApiError({ status: 409, errorCode: 'ERR_REPORT_DUPLICATE', message: '' }));
    expect(useUiStore.getState().toasts.map((t) => t.message)).toEqual(['Bạn đã gửi báo cáo cho nội dung này trước đó.']);
  });

  it('gộp các toast giống hệt nhau đang hiển thị', () => {
    const { pushToast } = useUiStore.getState();
    pushToast('danger', 'Lỗi hệ thống, vui lòng thử lại');
    pushToast('danger', 'Lỗi hệ thống, vui lòng thử lại');
    pushToast('warning', 'Request failed with status code 429');
    expect(useUiStore.getState().toasts.map((t) => t.message)).toEqual([
      'Lỗi hệ thống, vui lòng thử lại',
      'Đã có lỗi xảy ra, vui lòng thử lại.',
    ]);
  });
});
