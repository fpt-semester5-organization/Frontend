import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login } from '../api/auth.api';
import { useAuthStore } from '../../../stores/auth.store';
import { PATHS } from '../../../routes/paths';
import { GoogleButton } from '../components/GoogleButton';

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không đúng định dạng'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

type LoginFormValues = z.infer<typeof schema>;

export const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (res: any) => {
      setAuth(res.data.user, res.data.accessToken);
      if (res.data.user.role === 'ADMIN') {
        navigate(PATHS.ADMIN.DASHBOARD);
      } else {
        navigate(PATHS.HOME);
      }
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values);
  };

  const errorMessage =
    mutation.error &&
    ((mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');

  return (
    <div className="w-full">
      {/* Screen Code Badge */}
      <div className="text-[11px] font-mono tracking-widest text-[#52796f] uppercase font-semibold mb-2 select-none">
        SCR-01
      </div>

      {/* Main Serif Title */}
      <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] font-normal tracking-tight">
        Đăng nhập
      </h1>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-8 leading-relaxed">
        Đăng nhập để lưu món và theo dõi hành trình ăn lành.
      </p>

      {/* Error Alert */}
      {mutation.isError && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#133e2e] accent-[#133e2e] cursor-pointer"
            />
            <span className="group-hover:text-gray-900 transition-colors">
              Ghi nhớ tôi
            </span>
          </label>
          <Link
            to={PATHS.AUTH.FORGOT_PASSWORD}
            className="text-gray-600 hover:text-[#133e2e] transition-colors font-medium"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3.5 px-6 rounded-full bg-[#133e2e] hover:bg-[#0c291e] active:scale-[0.99] text-white text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
        >
          <span>{mutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      {/* Or Divider */}
      <div className="relative my-7 flex items-center justify-center">
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
        <span>Chưa có tài khoản? </span>
        <Link
          to={PATHS.AUTH.REGISTER}
          className="text-[#133e2e] font-semibold hover:underline transition-colors"
        >
          Đăng ký miễn phí
        </Link>
      </div>
    </div>
  );
};

