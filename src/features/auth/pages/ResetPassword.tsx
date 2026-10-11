import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { resetPassword } from '../api/auth.api';
import { PATHS } from '../../../routes/paths';

const schema = z.object({
  otp: z.string().min(1, 'Vui lòng nhập mã OTP').length(6, 'Mã OTP gồm đúng 6 chữ số'),
  newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
});

type ResetPasswordValues = z.infer<typeof schema>;

export const ResetPassword = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otp: '',
      newPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      navigate(PATHS.AUTH.LOGIN);
    },
  });

  if (!state?.email) return <Navigate to={PATHS.AUTH.FORGOT_PASSWORD} />;

  const onSubmit = (d: ResetPasswordValues) => {
    mutation.mutate({ email: state.email, ...d });
  };

  const errorMessage =
    mutation.error &&
    ((mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã OTP.');

  return (
    <div className="w-full">
      {/* Screen Code Badge */}
      <div className="text-[11px] font-mono tracking-widest text-[#52796f] uppercase font-semibold mb-2 select-none">
        SCR-05
      </div>

      {/* Main Serif Title */}
      <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] font-normal tracking-tight">
        Đặt lại mật khẩu
      </h1>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
        Nhập mã OTP đã được gửi tới <b className="text-gray-800">{state.email}</b> và đặt mật khẩu mới.
      </p>

      {/* Error Alert */}
      {mutation.isError && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 8 ký tự"
              {...register('newPassword')}
              className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all outline-none ${
                errors.newPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 hover:border-gray-300 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3.5 px-6 rounded-full bg-[#133e2e] hover:bg-[#0c291e] active:scale-[0.99] text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
        >
          <span>{mutation.isPending ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      {/* Back to Login Link */}
      <div className="mt-8 text-center text-xs sm:text-sm text-gray-600">
        <span>Nhớ lại mật khẩu? </span>
        <Link
          to={PATHS.AUTH.LOGIN}
          className="text-[#133e2e] font-semibold hover:underline transition-colors"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

