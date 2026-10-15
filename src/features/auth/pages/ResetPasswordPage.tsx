/**
 * @handwritten
 * SCR-05 · auth/ResetPassword · `/auth/reset-password`
 * FN: FN-AUTH-12 · Nguyễn Văn Minh Tâm · Sprint 5
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FormAlert, PasswordField, StrengthBar, SubmitButton } from '@/components/ui/forms';
import { PATHS } from '@/routes/paths';
import { apiErrorMessage, http } from '@/api/http';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { useResendOtp, useResetPassword } from '../hooks/useAuth';
import { passwordStrength, resetPasswordSchema, type ResetPasswordForm } from '../schemas/auth.schemas';

export function ResetPasswordPage() {
  const reset = useResetPassword();
  const resend = useResendOtp();
  const navigate = useNavigate();
  const email = ((useLocation().state ?? {}) as { email?: string }).email ?? '';
  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, otp: '', newPassword: '', confirmPassword: '' },
  });
  const { formError, handle, clear } = useApiFormErrors(form.setError);
  const strength = passwordStrength(form.watch('newPassword') ?? '');
  const submit = form.handleSubmit((v) => {
    clear();
    reset.mutate(v, {
      onSuccess: () => {
        toast.success('Đặt lại mật khẩu thành công, vui lòng đăng nhập');
        navigate(PATHS.AUTH.LOGIN, { replace: true });
      },
      onError: handle,
    });
  });
  const resendOtp = () => {
    const mail = form.getValues('email').trim();
    if (!mail) return form.setError('email', { message: 'Nhập email để nhận lại mã' });
    resend.mutate(
      { email: mail, purpose: 'PASSWORD_RESET' },
      { onSuccess: () => toast.success('Nếu email hợp lệ, mã OTP mới đã được gửi'), onError: (e) => toast.error(apiErrorMessage(e)) },
    );
  };
  const fillDevOtp = async () => {
    const mail = form.getValues('email').trim();
    if (!mail) return form.setError('email', { message: 'Nhập email để lấy mã' });
    try {
      const res = await http.get<{ data: { otp: string } }>(`/auth/dev-latest-otp?email=${encodeURIComponent(mail)}`);
      const otp = (res.data as any)?.data?.otp || (res.data as any)?.otp;
      if (otp) {
        form.setValue('otp', otp);
        toast.success(`Đã tự động lấy OTP: ${otp}`);
      }
    } catch {
      toast.error('Chưa có mã OTP nào cho email này.');
    }
  };

  return (
    <AuthCard
      icon="key"
      title="Đặt lại mật khẩu"
      width={480}
      footer={
        <button type="button" onClick={resendOtp} disabled={resend.isPending} className="font-label-md text-label-md text-secondary hover:underline disabled:opacity-60">
          Chưa nhận được mã? Gửi lại
        </button>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-md">
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field label="Email" required type="email" icon="mail" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Field label="Mã OTP (6 chữ số)" required inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="123456" error={form.formState.errors.otp?.message} {...form.register('otp')} />
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={fillDevOtp}
            className="-mt-2 self-start flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-label-sm text-label-sm text-primary transition-colors hover:bg-primary/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>Lấy nhanh mã OTP (Dev Mode)</span>
          </button>
        )}
        <PasswordField label="Mật khẩu mới" required autoComplete="new-password" placeholder="Mật khẩu mới" error={form.formState.errors.newPassword?.message} hint={<StrengthBar {...strength} />} {...form.register('newPassword')} />
        <PasswordField label="Nhập lại mật khẩu mới" required autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <SubmitButton loading={reset.isPending} icon="check">Đặt lại mật khẩu</SubmitButton>
      </form>
    </AuthCard>
  );
}
