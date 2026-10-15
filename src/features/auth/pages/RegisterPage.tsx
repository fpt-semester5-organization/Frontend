/**
 * @handwritten
 * SCR-02 · auth/Register · `/auth/register`
 * FN: FN-AUTH-04 · Nguyễn Văn Minh Tâm · Sprint 5
 * Giao diện: Stich-AI-45UI-Screen/SCR-02_auth-Register/code.html.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleButton } from '@/components/common/GoogleButton';
import { Field, FormAlert, PasswordField, StrengthBar, SubmitButton } from '@/components/ui/forms';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { useRegister } from '../hooks/useAuth';
import { passwordStrength, registerSchema, type RegisterForm } from '../schemas/auth.schemas';

export function RegisterPage() {
  const reg = useRegister();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: undefined as unknown as true },
  });
  const { formError, setFormError, errorCode, handle, clear } = useApiFormErrors(form.setError);
  const strength = passwordStrength(form.watch('password') ?? '');

  const submit = form.handleSubmit(
    (v) => {
      clear();
      reg.mutate(v, {
        onSuccess: (r) => {
          toast.success('Đã gửi mã OTP tới email của bạn');
          navigate(PATHS.AUTH.VERIFY_OTP, { state: { email: r.email, otpExpiresIn: r.otpExpiresIn, purpose: 'EMAIL_VERIFY', returnUrl: (location.state as { returnUrl?: string } | null)?.returnUrl } });
        },
        onError: handle,
      });
    },
    (errs) => {
      if (errs.agreeTerms?.message) setFormError(errs.agreeTerms.message);
      else if (errs.confirmPassword?.message) setFormError(errs.confirmPassword.message);
      else if (errs.password?.message) setFormError(errs.password.message);
      else if (errs.email?.message) setFormError(errs.email.message);
      else if (errs.fullName?.message) setFormError(errs.fullName.message);
    },
  );

  return (
    <AuthCard
      icon="potted_plant"
      title="Tạo tài khoản mới"
      footer={
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Đã có tài khoản?{' '}
          <Link to={PATHS.AUTH.LOGIN} state={location.state} className="ml-1 font-label-md text-label-md font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <GoogleButton label="Tiếp tục với Google" />
      <div className="relative my-space-md flex items-center justify-center">
        <div className="h-px w-full bg-surface-container-highest" />
        <span className="absolute bg-surface-container-lowest px-3 font-label-sm text-label-sm text-on-surface-variant">hoặc</span>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-md">
        {formError && <FormAlert>{formError}</FormAlert>}
        {errorCode === 'ERR_AUTH_EMAIL_EXISTS' && (
          <FormAlert kind="info">
            Email này đã có tài khoản. <Link to={PATHS.AUTH.LOGIN} className="font-semibold underline">Đăng nhập</Link> hoặc <Link to={PATHS.AUTH.FORGOT_PASSWORD} className="font-semibold underline">quên mật khẩu</Link>?
          </FormAlert>
        )}
        <Field label="Họ và tên" required icon="badge" placeholder="Nguyễn Văn An" autoComplete="name" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
        <Field label="Email đăng nhập" required icon="mail" type="email" placeholder="vanan@veggielife.vn" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <PasswordField label="Mật khẩu" required placeholder="Mật khẩu" autoComplete="new-password" error={form.formState.errors.password?.message} hint={<StrengthBar {...strength} />} {...form.register('password')} />
        <PasswordField label="Xác nhận mật khẩu" required placeholder="Nhập lại mật khẩu" autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <div className="flex flex-col gap-1">
          <label className="mt-1 flex cursor-pointer select-none items-start gap-2.5 font-body-sm text-body-sm leading-tight text-on-surface-variant">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary-container" {...form.register('agreeTerms')} />
            <span>
              Tôi đồng ý với <span className="font-semibold text-on-surface">Điều khoản</span> và <span className="font-semibold text-on-surface">Chính sách bảo mật</span>
            </span>
          </label>
          {form.formState.errors.agreeTerms && <p role="alert" className="font-label-sm text-label-sm text-error">{form.formState.errors.agreeTerms.message}</p>}
        </div>
        <SubmitButton loading={reg.isPending}>Tạo tài khoản</SubmitButton>
      </form>
    </AuthCard>
  );
}
