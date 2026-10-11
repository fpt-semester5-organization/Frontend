import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { forgotPassword } from '../api/auth.api';
import { PATHS } from '../../../routes/paths';

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không đúng định dạng'),
});

type ForgotPasswordValues = z.infer<typeof schema>;

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (_, variables) => {
      navigate(PATHS.AUTH.RESET_PASSWORD, { state: { email: variables.email } });
    },
  });

  const onSubmit = (values: ForgotPasswordValues) => {
    mutation.mutate(values);
  };

  const errorMessage =
    mutation.error &&
    ((mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Không thể gửi mã. Vui lòng kiểm tra lại email.');

  return (
    <div className="w-full">
      {/* Screen Code Badge */}
      <div className="text-[11px] font-mono tracking-widest text-[#52796f] uppercase font-semibold mb-2 select-none">
        SCR-03
      </div>

      {/* Main Serif Title */}
      <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] font-normal tracking-tight">
        Quên mật khẩu
      </h1>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
        Nhập email đã đăng ký của bạn để nhận mã xác thực khôi phục mật khẩu.
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            placeholder="ban@email.com"
            {...register('email')}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all outline-none ${
              errors.email
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-gray-200 hover:border-gray-300 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15'
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3.5 px-6 rounded-full bg-[#133e2e] hover:bg-[#0c291e] active:scale-[0.99] text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
        >
          <span>{mutation.isPending ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}</span>
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

