/**
 * @handwritten
 * SCR-01 · auth/Login · `/auth/login`
 * FN: FN-AUTH-08 · Nguyễn Văn Minh Tâm · Sprint 5
 * Giao diện: Stich-AI-45UI-Screen/SCR-01_auth-Login (viết lại theo design system Linen & Earth để đồng nhất với SCR-02…05).
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorCode, apiErrorData, apiErrorMessage } from '@/api/http';
import { GoogleButton } from '@/components/common/GoogleButton';
import { Field, FormAlert, PasswordField, SubmitButton } from '@/components/ui/forms';
import { Modal } from '@/components/ui/Modal';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { formatMmSs, useCountdown } from '../hooks/useCountdown';
import { useLogin } from '../hooks/useAuth';
import { loginSchema, type LoginForm } from '../schemas/auth.schemas';

/** Khóa đăng nhập mặc định 15 phút (BR-AUTH-004) khi server không trả `lockedUntil`. */
const LOCK_MS = 15 * 60_000;

export function LoginPage() {
  const login = useLogin();
  const location = useLocation();
  const navigate = useNavigate();
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [askRestore, setAskRestore] = useState(false);
  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', restoreAccount: false } });
  const { formError, setFormError, handle, clear } = useApiFormErrors(form.setError);
  const lockLeft = useCountdown(lockedUntil);
  const locked = lockLeft > 0;

  const run = (values: LoginForm, restoreAccount: boolean) => {
    clear();
    setNotVerifiedEmail(null);
    login.mutate(
      { ...values, email: values.email.trim(), restoreAccount },
      {
        onError: (err) => {
          const code = apiErrorCode(err);
          const data = apiErrorData(err);
          if (code === 'ERR_AUTH_ACCOUNT_PENDING_DELETION') return setAskRestore(true); // 409 -> hộp thoại xác nhận khôi phục
          if (code === 'ERR_AUTH_LOGIN_LOCKED') {
            const until = typeof data.lockedUntil === 'string' ? Date.parse(data.lockedUntil) : NaN;
            setLockedUntil(Number.isFinite(until) ? until : Date.now() + LOCK_MS); // 429 -> khóa nút gửi
            return setFormError(apiErrorMessage(err));
          }
          if (code === 'ERR_AUTH_INVALID_CREDENTIALS') {
            const left = Number(data.remainingAttempts);
            return setFormError(`${apiErrorMessage(err)}${Number.isFinite(left) ? ` Còn ${left} lần thử trước khi tạm khóa.` : ''}`);
          }
          if (code === 'ERR_AUTH_EMAIL_NOT_VERIFIED') setNotVerifiedEmail(values.email.trim());
          if (code === 'ERR_AUTH_ACCOUNT_BANNED') {
            const until = typeof data.suspendedUntil === 'string' ? new Date(data.suspendedUntil).toLocaleString('vi-VN') : null;
            toast.warning(apiErrorMessage(err));
            return setFormError(`${apiErrorMessage(err)}${until ? ` Đình chỉ đến ${until}.` : ''}`);
          }
          if (code === 'ERR_AUTH_EMAIL_NOT_VERIFIED') toast.warning(apiErrorMessage(err));
          handle(err);
        },
      },
    );
  };
  const submit = form.handleSubmit(
    (values) => run(values, false),
    (errs) => {
      if (errs.email?.message) setFormError(errs.email.message);
      else if (errs.password?.message) setFormError(errs.password.message);
    },
  );
  const restore = form.handleSubmit(
    (values) => run(values, true),
    (errs) => {
      if (errs.email?.message) setFormError(errs.email.message);
      else if (errs.password?.message) setFormError(errs.password.message);
    },
  );

  return (
    <AuthCard
      icon="potted_plant"
      title="Chào mừng trở lại"
      width={480}
      footer={
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Chưa có tài khoản?{' '}
          <Link to={PATHS.AUTH.REGISTER} state={location.state} className="ml-1 font-label-md text-label-md font-semibold text-primary hover:underline">
            Đăng ký
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
        {notVerifiedEmail && (
          <FormAlert kind="info">
            Tài khoản chưa được kích hoạt.{' '}
            <button type="button" className="font-semibold underline" onClick={() => navigate(PATHS.AUTH.VERIFY_OTP, { state: { email: notVerifiedEmail, otpExpiresIn: 0, purpose: 'EMAIL_VERIFY', returnUrl: (location.state as { returnUrl?: string } | null)?.returnUrl } })}>
              Nhập mã OTP để kích hoạt
            </button>
          </FormAlert>
        )}
        <Field label="Email" type="email" autoComplete="email" placeholder="vanan@veggielife.vn" icon="mail" required error={form.formState.errors.email?.message} {...form.register('email')} />
        <div className="flex flex-col gap-1.5">
          <PasswordField label="Mật khẩu" autoComplete="current-password" placeholder="••••••••" required error={form.formState.errors.password?.message} {...form.register('password')} />
          <Link to={PATHS.AUTH.FORGOT_PASSWORD} className="self-end font-label-sm text-label-sm text-secondary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <SubmitButton loading={login.isPending} disabled={locked} icon="login">
          {locked ? `Tạm khóa, thử lại sau ${formatMmSs(lockLeft)}` : 'Đăng nhập'}
        </SubmitButton>
      </form>

      <Modal show={askRestore} onHide={() => setAskRestore(false)} title="Tài khoản đang chờ xóa">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">Tài khoản này đang trong 30 ngày ân hạn xóa. Bạn có muốn khôi phục và tiếp tục đăng nhập?</p>
          <div className="flex justify-end gap-space-sm">
            <button type="button" onClick={() => setAskRestore(false)} className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface">Để sau</button>
            <button
              type="button"
              onClick={() => {
                setAskRestore(false);
                void restore();
              }}
              className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary"
            >
              Khôi phục & đăng nhập
            </button>
          </div>
        </div>
      </Modal>
    </AuthCard>
  );
}
