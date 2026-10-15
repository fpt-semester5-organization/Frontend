/**
 * @handwritten
 * SCR-04 · auth/ForgotPassword · `/auth/forgot-password`
 * FN: FN-AUTH-11 · Nguyễn Văn Minh Tâm · Sprint 5
 */
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FormAlert, SubmitButton } from '@/components/ui/forms';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { useForgotPassword } from '../hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas/auth.schemas';

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const navigate = useNavigate();
  const form = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const { formError, handle, clear } = useApiFormErrors(form.setError);
  const submit = form.handleSubmit((v) => {
    clear();
    forgot.mutate(v, {
      onSuccess: () => {
        toast.success('Nếu email tồn tại, mã OTP đặt lại mật khẩu đã được gửi');
        navigate(PATHS.AUTH.RESET_PASSWORD, { state: { email: v.email } });
      },
      onError: handle,
    });
  });
  return (
    <AuthCard
      icon="lock_reset"
      title="Quên mật khẩu?"
      width={480}
      footer={
        <Link to={PATHS.AUTH.LOGIN} className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-md">
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field label="Email đã đăng ký" required type="email" icon="mail" autoComplete="email" placeholder="vanan@veggielife.vn" error={form.formState.errors.email?.message} {...form.register('email')} />
        <SubmitButton loading={forgot.isPending}>Gửi mã OTP</SubmitButton>
      </form>
    </AuthCard>
  );
}
