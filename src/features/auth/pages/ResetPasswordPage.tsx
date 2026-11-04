/**
 * @handwritten
 * SCR-05 · auth/ResetPassword · `/auth/reset-password`
 * FN: FN-AUTH-12 · Nguyễn Văn Minh Tâm · Sprint 5
 * Nhận email và mã OTP từ SCR-03. Backend chỉ kiểm tra mã khi gọi API của trang này, nên người dùng sửa được mã ngay tại đây.
 */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorCode, apiErrorData, apiErrorMessage } from '@/api/http';
import { Field, FormAlert, PasswordField, StrengthBar, SubmitButton } from '@/components/ui/forms';
import { OTP_LOCK_MS } from '@/constants/quota';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { useResetPassword } from '../hooks/useAuth';
import { formatMmSs, useCountdown } from '../hooks/useCountdown';
import { passwordStrength, resetPasswordSchema, type ResetPasswordForm } from '../schemas/auth.schemas';

export function ResetPasswordPage() {
  const reset = useResetPassword();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as { email?: string; otp?: string; otpExpiresAt?: number; attemptsLeft?: number | null };
  const email = state.email ?? '';
  const otp = state.otp ?? '';
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(state.attemptsLeft ?? null);
  const [otpExpired, setOtpExpired] = useState(false);
  const lockLeft = useCountdown(lockedUntil);
  const locked = lockLeft > 0;

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, otp, newPassword: '', confirmPassword: '' },
  });

  const { formError, setFormError, handle, clear } = useApiFormErrors(form.setError);
  const newPassword = form.watch('newPassword') ?? '';
  const otpComplete = /^\d{6}$/.test(form.watch('otp') ?? '');
  const strength = passwordStrength(newPassword);

  // Nếu người dùng vào thẳng trang mà chưa qua bước nhập email và mã OTP ở VerifyOtpPage
  if (!email || !otp) {
    return <Navigate to={PATHS.AUTH.FORGOT_PASSWORD} replace />;
  }

  const submit = form.handleSubmit((v) => {
    clear();
    reset.mutate(v, {
      onSuccess: () => {
        toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        navigate(PATHS.AUTH.LOGIN, { replace: true });
      },
      onError: (err) => {
        const code = apiErrorCode(err);
        if (code === 'ERR_AUTH_OTP_LOCKED') {
          setLockedUntil(Date.now() + OTP_LOCK_MS);
          setFormError(apiErrorMessage(err));
          return;
        }
        if (code === 'ERR_AUTH_OTP_INCORRECT' || code === 'ERR_AUTH_OTP_EXPIRED') {
          // Xóa mã đã bị từ chối để bấm lại không gửi mã cũ và không mất thêm lượt thử; mật khẩu vừa nhập được giữ nguyên.
          const left = Number(apiErrorData(err).remainingAttempts);
          if (Number.isFinite(left)) setAttemptsLeft(left);
          if (code === 'ERR_AUTH_OTP_EXPIRED') setOtpExpired(true);
          form.setValue('otp', '');
          form.setError('otp', { type: 'server', message: apiErrorMessage(err) }, { shouldFocus: true });
          return;
        }
        handle(err);
      },
    });
  });

  // Kiểm tra từng tiêu chuẩn BR-AUTH-001 để hiển thị trực quan
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  return (
    <AuthCard
      icon="key"
      title="Thiết lập mật khẩu mới"
      width={480}
      footer={
        <div className="flex w-full items-center justify-between">
          <Link
            to={PATHS.AUTH.LOGIN}
            className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại đăng nhập
          </Link>
          <Link
            to={PATHS.AUTH.VERIFY_OTP}
            state={{ email, purpose: 'PASSWORD_RESET', otpExpiresAt: otpExpired ? 0 : state.otpExpiresAt, attemptsLeft, lockedUntil }}
            className="font-label-sm text-label-sm text-secondary hover:underline"
          >
            Gửi lại mã OTP
          </Link>
        </div>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-md">
        {/* Email nhận mã OTP ở bước trước */}
        <div className="flex min-w-0 items-center gap-space-sm rounded-lg border border-surface-container-high bg-surface-container-low px-space-md py-space-sm">
          <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant">alternate_email</span>
          <span className="truncate font-label-md text-label-md font-medium text-on-surface">{email}</span>
        </div>

        <Field
          label="Mã OTP"
          required
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          hint={<p className="font-label-sm text-label-sm text-on-surface-variant">Mã được kiểm tra khi bạn bấm Cập nhật mật khẩu mới.</p>}
          error={form.formState.errors.otp?.message}
          {...form.register('otp')}
        />

        {/* Ô mật khẩu mới */}
        <PasswordField
          label="Mật khẩu mới"
          required
          autoComplete="new-password"
          placeholder="Nhập mật khẩu mới"
          error={form.formState.errors.newPassword?.message}
          hint={<StrengthBar {...strength} />}
          {...form.register('newPassword')}
        />

        {/* Bảng checklist tiêu chuẩn mật khẩu an toàn */}
        <div className="rounded-lg border border-surface-container-high/60 bg-surface-container-low/60 p-3">
          <div className="mb-2 font-label-sm text-label-sm font-medium text-on-surface-variant">
            Tiêu chuẩn mật khẩu an toàn:
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-label-sm text-label-sm">
            <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                {hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>Tối thiểu 8 ký tự</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasUpper ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                {hasUpper ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>Có chữ cái in hoa</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasLower ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                {hasLower ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>Có chữ cái in thường</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasNumber && hasSpecial ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                {hasNumber && hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>Có chữ số & ký tự đặc biệt</span>
            </div>
          </div>
        </div>

        {/* Ô xác nhận mật khẩu mới */}
        <PasswordField
          label="Nhập lại mật khẩu mới"
          required
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu mới"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />

        {/* Đặt ngay trên nút bấm để lỗi luôn nằm trong tầm nhìn, kể cả trên màn hình thấp. */}
        {formError && <FormAlert>{formError}</FormAlert>}

        <SubmitButton loading={reset.isPending} disabled={locked || !otpComplete} icon={locked ? 'schedule' : 'check'}>
          {locked ? `Thử lại sau ${formatMmSs(lockLeft)}` : reset.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
