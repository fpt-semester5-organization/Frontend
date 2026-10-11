import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { verifyOtp } from '../api/auth.api';
import { useAuthStore } from '../../../stores/auth.store';
import { PATHS } from '../../../routes/paths';

const schema = z.object({
  otp: z.string().min(1, 'Vui lòng nhập mã OTP').length(6, 'Mã OTP gồm đúng 6 chữ số'),
});

type VerifyOtpValues = z.infer<typeof schema>;

export const VerifyOtp = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otp: '',
    },
  });

  const mutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (res: any) => {
      setAuth(res.data.user, res.data.accessToken);
      navigate(PATHS.HOME);
    },
  });

  if (!state?.email) return <Navigate to={PATHS.AUTH.REGISTER} />;

  const onSubmit = (d: VerifyOtpValues) => {
    mutation.mutate({ email: state.email, otp: d.otp });
  };

  const errorMessage =
    mutation.error &&
    ((mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Mã OTP không chính xác hoặc đã hết hạn.');

  return (
    <div className="w-full">
      {/* Screen Code Badge */}
      <div className="text-[11px] font-mono tracking-widest text-[#52796f] uppercase font-semibold mb-2 select-none">
        SCR-04
      </div>

      {/* Main Serif Title */}
      <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] font-normal tracking-tight">
        Xác thực OTP
      </h1>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
        Mã xác thực gồm 6 chữ số đã được gửi tới email <b className="text-gray-800">{state.email}</b>.
      </p>

      {/* Error Alert */}
      {mutation.isError && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5 text-center">
            Mã OTP 6 số
          </label>
          <div className="relative">
            <input
              {...register('otp')}
              maxLength={6}
              className={`w-full px-4 py-3.5 rounded-lg border text-center tracking-[0.5em] text-xl font-mono text-gray-900 placeholder:text-gray-300 bg-white transition-all outline-none ${
                errors.otp
                  ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 hover:border-gray-300 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15'
              }`}
              placeholder="------"
            />
            <ShieldCheck className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {errors.otp && (
            <p className="mt-1.5 text-xs text-red-500 text-center font-medium">
              {errors.otp.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3.5 px-6 rounded-full bg-[#133e2e] hover:bg-[#0c291e] active:scale-[0.99] text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
        >
          <span>{mutation.isPending ? 'Đang xác thực...' : 'Xác thực tài khoản'}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      {/* Back to register link */}
      <div className="mt-8 text-center text-xs sm:text-sm text-gray-600">
        <span>Nhập sai email? </span>
        <Link
          to={PATHS.AUTH.REGISTER}
          className="text-[#133e2e] font-semibold hover:underline transition-colors"
        >
          Đăng ký lại
        </Link>
      </div>
    </div>
  );
};

