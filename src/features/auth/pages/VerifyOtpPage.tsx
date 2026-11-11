/**
 * @handwritten
 * SCR-03 · auth/VerifyOtp · `/auth/verify-otp`
 * FN: FN-AUTH-05, FN-AUTH-06 · Nguyễn Văn Minh Tâm · Sprint 5
 * Giao diện: Stich-AI-45UI-Screen/SCR-03_auth-VerifyOtp/code.html. OTP 6 số, TTL 5 phút, sai 5 lần khóa 15 phút (BR-USR-AUTH-01).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiErrorCode, apiErrorData, apiErrorMessage } from '@/api/http';
import { FormAlert, SubmitButton } from '@/components/ui/forms';
import { OTP_LOCK_MS, OTP_TTL_SECONDS } from '@/constants/quota';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { OTP_LENGTH, OtpInput, type OtpInputHandle } from '../components/OtpInput';
import { useResendOtp, useVerifyOtp } from '../hooks/useAuth';
import { formatMmSs, useCountdown } from '../hooks/useCountdown';
import type { VerifyOtpForm } from '../schemas/auth.schemas';

interface OtpState {
  email?: string;
  otpExpiresIn?: number;
  purpose?: VerifyOtpForm['purpose'];
  /** Có khi quay lại từ bước đặt mật khẩu mới: giữ đúng hạn mã, số lượt còn lại và trạng thái khóa. */
  otpExpiresAt?: number;
  attemptsLeft?: number | null;
  lockedUntil?: number | null;
}

const fmt = formatMmSs;

function initialRemaining({ otpExpiresAt, otpExpiresIn }: OtpState) {
  if (otpExpiresAt !== undefined) return Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
  return otpExpiresIn ?? OTP_TTL_SECONDS;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as OtpState;
  const email = state.email ?? '';
  const purpose = state.purpose ?? 'EMAIL_VERIFY';
  const isReset = purpose === 'PASSWORD_RESET';
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [remaining, setRemaining] = useState(() => initialRemaining(state));
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(state.attemptsLeft ?? null);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(state.lockedUntil ?? null);
  const lockLeft = useCountdown(lockedUntil);
  const locked = lockLeft > 0;
  const otpInput = useRef<OtpInputHandle>(null);

  useEffect(() => {
    const t = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!email) return <Navigate to={isReset ? PATHS.AUTH.FORGOT_PASSWORD : PATHS.AUTH.REGISTER} replace />;

  const code = digits.join('');

  const submit = () => {
    setError(null);
    if (code.length !== OTP_LENGTH) return setError('Mã OTP gồm 6 chữ số');
    if (isReset) {
      // Backend chỉ kiểm tra mã này khi gọi POST /auth/reset-password nên chưa thể báo mã hợp lệ ở bước này.
      navigate(PATHS.AUTH.RESET_PASSWORD, { state: { email, otp: code, otpExpiresAt: Date.now() + remaining * 1000, attemptsLeft } });
      return;
    }
    verify.mutate(
      { email, otp: code, purpose },
      {
        onError: (err) => {
          const c = apiErrorCode(err);
          setError(apiErrorMessage(err));
          if (c === 'ERR_AUTH_OTP_LOCKED') setLockedUntil(Date.now() + OTP_LOCK_MS);
          // Số lần thử còn lại do server trả (data.remainingAttempts), không tự đếm ở FE
          const left = Number(apiErrorData(err).remainingAttempts);
          if (c === 'ERR_AUTH_OTP_INCORRECT' && Number.isFinite(left)) setAttemptsLeft(left);
          setDigits(Array(OTP_LENGTH).fill(''));
          otpInput.current?.focus(0);
        },
      },
    );
  };

  const doResend = () =>
    resend.mutate(
      { email, purpose },
      {
        onSuccess: () => {
          toast.success('Đã gửi lại mã OTP');
          setRemaining(OTP_TTL_SECONDS);
          setAttemptsLeft(null); // Mã mới được Backend đếm lại số lần sai từ đầu
          setDigits(Array(OTP_LENGTH).fill(''));
          otpInput.current?.focus(0);
        },
        onError: (e) => {
          if (apiErrorCode(e) === 'ERR_AUTH_OTP_LOCKED') setLockedUntil(Date.now() + OTP_LOCK_MS);
          toast.error(apiErrorMessage(e));
        },
      },
    );

  const backLink = isReset ? PATHS.AUTH.FORGOT_PASSWORD : PATHS.AUTH.REGISTER;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface-container-lowest px-margin-sm pb-space-xl pt-[calc(72px+2.5rem)]">
      <div className="flex w-full max-w-[500px] flex-col items-center rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-lg shadow-sm sm:p-space-xl">
        <div className="mb-space-md flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary-container">
          <span aria-hidden="true" className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isReset ? 'lock_reset' : 'mark_email_read'}
          </span>
        </div>
        <h1 className="mb-space-xs text-center font-headline-md text-headline-md text-on-surface">
          {isReset ? 'Xác thực đặt lại mật khẩu' : 'Xác thực email'}
        </h1>
        <p className="mb-space-md max-w-[380px] text-center font-body-md text-body-md text-on-surface-variant">
          {isReset ? 'Nhập mã xác thực 6 chữ số gửi tới' : 'Nhập mã gửi tới'}
        </p>
        <div className="mb-space-lg flex w-full items-center justify-between rounded-lg bg-surface-container-low px-space-md py-space-sm">
          <div className="flex min-w-0 items-center gap-space-sm">
            <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant">alternate_email</span>
            <span className="truncate font-label-md text-label-md text-on-surface">{email}</span>
          </div>
          <Link to={backLink} className="group flex shrink-0 items-center gap-1 font-label-sm text-label-sm text-secondary hover:underline">
            <span>Đổi email</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">edit</span>
          </Link>
        </div>

        <form
          className="flex w-full flex-col items-center"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="mb-space-md w-full">
            <OtpInput ref={otpInput} value={digits} onChange={setDigits} disabled={locked} autoFocus />
          </div>
          {error && <div className="mb-space-md w-full"><FormAlert>{error}</FormAlert></div>}
          <div className="mb-space-lg flex w-full flex-col items-center justify-between gap-space-sm rounded-lg bg-surface-container-high/60 p-space-sm sm:flex-row">
            <span className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary">timer</span>
              {remaining > 0 ? `Mã hết hạn sau ${fmt(remaining)}` : 'Mã đã hết hạn'}
            </span>
            <button type="button" onClick={doResend} disabled={resend.isPending || locked || remaining > OTP_TTL_SECONDS - 60} className="font-label-md text-label-md text-secondary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
              Gửi lại mã
            </button>
          </div>
          <div className="mb-space-lg flex w-full items-center justify-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">info</span>
            <span>
              {locked ? `Đã nhập sai 5 lần, thử lại sau ${fmt(lockLeft)}` : <>Còn lại <strong className="font-semibold text-on-surface">{attemptsLeft ?? 5}/5</strong> lần thử nhập mã</>}
            </span>
          </div>
          <div className="w-full">
            <SubmitButton loading={!isReset && verify.isPending} disabled={locked || code.length !== OTP_LENGTH || remaining === 0}>
              {isReset ? 'Tiếp tục' : 'Xác nhận'}
            </SubmitButton>
          </div>
          <Link to={backLink} className="mt-space-md flex items-center gap-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Quay lại</span>
          </Link>
        </form>
      </div>
    </main>
  );
}
