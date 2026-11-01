import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { toast } from '@/stores/ui.store';
import * as api from '../api/auth.api';
import type { LoginResult, VerifyOtpResult } from '../types/auth.types';

/** Backend trả `redirectUrl` kiểu `/onboarding/health-profile` (không phải route của FE) → ánh xạ sang SCR-08. */
export function mapRedirectUrl(redirectUrl?: string): string | undefined {
  if (!redirectUrl) return undefined;
  if (redirectUrl.startsWith('/onboarding/health-profile')) return PATHS.PROFILE.HEALTH;
  return redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : undefined;
}

/** Chỉ nhận đường dẫn nội bộ (chống chuyển hướng ra trang ngoài) và không quay lại chính các trang xác thực. */
function safeReturnUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value.startsWith('/auth/') ? undefined : value;
}

/**
 * returnUrl để quay lại sau xác thực (UI-5, BR-GUEST-AUTH-01): guard, SignupPromptModal… gắn vào URL `?returnUrl=`,
 * còn Đăng ký → OTP chuyển tiếp qua `location.state`; đọc cả hai.
 */
export function readReturnUrl(location: { state: unknown; search: string }): string | undefined {
  return (
    safeReturnUrl((location.state as { returnUrl?: unknown } | null)?.returnUrl) ??
    safeReturnUrl(new URLSearchParams(location.search).get('returnUrl'))
  );
}

/** Sau khi đăng nhập/kích hoạt: lưu phiên, bỏ phiên Khách (server đã hợp nhất ngữ cảnh), về returnUrl / redirectUrl / trang chủ; Admin về /admin. */
export function useAfterLogin() {
  const navigate = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  return (result: LoginResult | VerifyOtpResult) => {
    const auth = useAuthStore.getState();
    auth.setSession({ ...result.user }, result.accessToken);
    auth.clearGuestToken();
    useGuestStore.getState().reset();
    void qc.invalidateQueries(); // dữ liệu tải khi còn là Khách (memberActions…) được làm mới theo vai trò mới
    const returnUrl = readReturnUrl(loc);
    // Tài khoản ADMIN khi đăng nhập bắt buộc chuyển thẳng vào khu vực quản trị /admin (trừ khi có returnUrl cụ thể thuộc /admin)
    const target =
      result.user.role === 'ADMIN'
        ? returnUrl && returnUrl.startsWith('/admin')
          ? returnUrl
          : PATHS.ADMIN.ROOT
        : returnUrl ?? mapRedirectUrl((result as VerifyOtpResult).redirectUrl) ?? PATHS.HOME;
    navigate(target, { replace: true });
  };
}

export const useLogin = () => {
  const after = useAfterLogin();
  return useMutation({ mutationFn: api.login, onSuccess: (r) => { toast.success('Đăng nhập thành công'); after(r); } });
};

export const useLoginWithGoogle = () => {
  const after = useAfterLogin();
  return useMutation({
    mutationFn: api.loginWithGoogle,
    onSuccess: (r) => {
      toast.success(r.isNewAccount ? 'Đăng ký thành công bằng Google!' : 'Đăng nhập Google thành công!');
      after(r);
    },
  });
};

export const useRegister = () => useMutation({ mutationFn: api.register });
export const useVerifyOtp = () => {
  const after = useAfterLogin();
  return useMutation({ mutationFn: api.verifyOtp, onSuccess: (r) => { toast.success('Kích hoạt tài khoản thành công'); after(r); } });
};
export const useResendOtp = () => useMutation({ mutationFn: (v: { email: string; purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET' }) => api.resendOtp(v.email, v.purpose) });
export const useForgotPassword = () => useMutation({ mutationFn: api.forgotPassword });
export const useResetPassword = () => useMutation({ mutationFn: api.resetPassword });
export const useChangePassword = () => useMutation({ mutationFn: api.changePassword });

/** FN-AUTH-10 — gọi API rồi xóa phiên; về trang chủ. */
export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => navigate(PATHS.HOME, { replace: true }),
  });
}


export { useLegalDocuments } from '@/features/legal/hooks/useLegalDocuments';
