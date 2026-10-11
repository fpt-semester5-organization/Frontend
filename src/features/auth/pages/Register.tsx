import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { register as registerApi } from '../api/auth.api';
import { PATHS } from '../../../routes/paths';
import { GoogleButton } from '../components/GoogleButton';

const schema = z
  .object({
    fullName: z.string().min(2, 'Họ tên ít nhất 2 ký tự'),
    email: z.string().min(1, 'Vui lòng nhập email').email('Email không đúng định dạng'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'Vui lòng đồng ý với điều khoản dịch vụ',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof schema>;

export const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: true,
    },
  });

  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (_, variables) => {
      navigate(PATHS.AUTH.VERIFY_OTP, { state: { email: variables.email } });
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    mutation.mutate({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
    });
  };

  const errorMessage =
    mutation.error &&
    ((mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Không thể tạo tài khoản. Email này có thể đã được sử dụng.');

  return (
    <div className="w-full">
      {/* Screen Code Badge */}
      <div className="text-[11px] font-mono tracking-widest text-[#52796f] uppercase font-semibold mb-2 select-none">
        SCR-02
      </div>

      {/* Main Serif Title */}
      <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] font-normal tracking-tight">
        Đăng ký
      </h1>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
        Đăng ký để bắt đầu hành trình ăn lành và nhận thực đơn mỗi tuần.
      </p>

      {/* Error Alert */}
      {mutation.isError && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Họ và tên
          </label>
          <input
            type="text"
            placeholder="Nguyễn Văn A"
            {...register('fullName')}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all outline-none ${
              errors.fullName
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-gray-200 hover:border-gray-300 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15'
            }`}
          />
          {errors.fullName && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email Field */}
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

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 8 ký tự"
              {...register('password')}
              className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all outline-none ${
                errors.password
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
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Nhập lại mật khẩu
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu vừa đặt"
              {...register('confirmPassword')}
              className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 bg-white transition-all outline-none ${
                errors.confirmPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-200 hover:border-gray-300 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 focus:outline-none transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500 font-medium">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('agreeTerms')}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#133e2e] accent-[#133e2e] cursor-pointer"
            />
            <span className="leading-relaxed">
              Tôi đồng ý với{' '}
              <a href="#" className="text-[#133e2e] font-semibold hover:underline">
                Điều khoản dịch vụ
              </a>{' '}
              &amp;{' '}
              <a href="#" className="text-[#133e2e] font-semibold hover:underline">
                Chính sách bảo mật
              </a>
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.agreeTerms.message}
            </p>
          )}
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3.5 px-6 rounded-full bg-[#133e2e] hover:bg-[#0c291e] active:scale-[0.99] text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer pt-3.5 mt-2"
        >
          <span>{mutation.isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      {/* Or Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="w-full border-t border-gray-200" />
        <span className="absolute bg-white px-3 text-xs text-gray-400 font-normal select-none">
          hoặc tiếp tục với
        </span>
      </div>

      {/* Social Google Login */}
      <GoogleButton
        label="Google"
        onClick={() => {
          // Placeholder or trigger google oauth
        }}
      />

      {/* Bottom Switch Link */}
      <div className="mt-8 text-center text-xs sm:text-sm text-gray-600">
        <span>Đã có tài khoản? </span>
        <Link
          to={PATHS.AUTH.LOGIN}
          className="text-[#133e2e] font-semibold hover:underline transition-colors"
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};

