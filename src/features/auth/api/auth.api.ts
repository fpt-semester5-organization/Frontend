import { apiErrorStatus, http, unwrap } from '@/api/http';
import { bootstrapGuestSession as bootstrapRealGuest, endSession, refreshAccessToken } from '@/api/session';
import type { ApiEnvelope } from '@/api/types';
import { IS_MOCK } from '@/lib/env';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import type {
  ChangePasswordForm,
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
  VerifyOtpForm,
} from '../schemas/auth.schemas';
import type { LoginResult, RegisterResult, VerifyOtpResult } from '../types/auth.types';

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/** Dữ liệu giả khi chưa có backend (VITE_MOCK_AUTH=true, chỉ dev). */
const mock = {
  login: async (f: LoginForm): Promise<LoginResult> => {
    await wait();
    const admin = f.email.toLowerCase().startsWith('admin');
    return {
      tokenType: 'Bearer',
      accessToken: 'mock-token',
      expiresIn: 900,
      user: { userId: admin ? 1 : 1001, fullName: admin ? 'Lê Hoàng' : 'Nguyễn Văn An', email: f.email, role: admin ? 'ADMIN' : 'MEMBER', isVip: false },
    };
  },
};

/** FN-AUTH-08 */
export const login = (f: LoginForm) =>
  IS_MOCK ? mock.login(f) : unwrap<LoginResult>(http.post('/auth/login', f));

/** FN-AUTH-04 */
export const register = async (f: RegisterForm): Promise<RegisterResult> => {
  if (IS_MOCK) {
    await wait();
    return { email: f.email, otpExpiresIn: 300 };
  }
  const { fullName, email, password, confirmPassword } = f; // agreeTerms chỉ là ràng buộc giao diện, không gửi
  return unwrap<RegisterResult>(http.post('/auth/register', { fullName, email, password, confirmPassword }));
};

/** FN-AUTH-05 */
export const verifyOtp = async (f: VerifyOtpForm): Promise<VerifyOtpResult> => {
  if (IS_MOCK) {
    await wait();
    if (f.otp !== '123456') throw Object.assign(new Error('otp'), { response: { status: 400, data: { statusCode: 400, errorCode: 'ERR_AUTH_OTP_INCORRECT', message: 'Mã OTP không đúng (dev: dùng 123456).' } } });
    return { ...(await mock.login({ email: f.email, password: '', restoreAccount: false })), redirectUrl: '/' };
  }
  // openapi VerifyOtpRequest = { email, otp }; `purpose` chỉ có ở resend-otp
  return unwrap<VerifyOtpResult>(http.post('/auth/verify-otp', { email: f.email, otp: f.otp }));
};

/** FN-AUTH-06 */
export const resendOtp = async (email: string, purpose: VerifyOtpForm['purpose']) => {
  if (IS_MOCK) return wait(300);
  await http.post('/auth/resend-otp', { email, purpose });
};

/** FN-AUTH-11 */
export const forgotPassword = async (f: ForgotPasswordForm) => {
  if (IS_MOCK) return wait();
  await http.post('/auth/forgot-password', f);
};

/** FN-AUTH-12 */
export const resetPassword = async (f: ResetPasswordForm) => {
  if (IS_MOCK) return wait();
  await http.post('/auth/reset-password', { email: f.email, otp: f.otp, newPassword: f.newPassword });
};

/** FN-AUTH-13 */
export const changePassword = async (f: ChangePasswordForm) => {
  if (IS_MOCK) return wait();
  await http.put('/auth/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
};

/** FN-AUTH-10 — thu hồi Refresh Token + đưa jti vào danh sách đen, rồi dọn phiên cục bộ (luôn dọn, kể cả khi API lỗi). */
export const logout = async () => {
  try {
    if (!IS_MOCK && useAuthStore.getState().accessToken) {
      try {
        await http.post('/auth/logout');
      } catch (e) {
        // Access Token hết hạn (/auth/logout không tự refresh): làm mới 1 lần để thu hồi đúng Refresh Token rồi gọi lại
        if (apiErrorStatus(e) !== 401) throw e;
        await refreshAccessToken();
        await http.post('/auth/logout');
      }
    }
  } catch {
    /* 503/mạng/refresh hỏng: vẫn đăng xuất cục bộ */
  } finally {
    endSession();
  }
};

/** FN-AUTH-01 + FN-AUTH-02: tạo phiên Khách và nạp hạn mức dùng thử (đã đặt ở api/session). */
export async function bootstrapGuestSession() {
  if (IS_MOCK) {
    const auth = useAuthStore.getState();
    if (auth.user || auth.guestToken) return;
    auth.setGuestToken('mock-guest-token');
    useGuestStore.getState().setGuest('mock-guest');
    return;
  }
  await bootstrapRealGuest();
}

export type { ApiEnvelope };
