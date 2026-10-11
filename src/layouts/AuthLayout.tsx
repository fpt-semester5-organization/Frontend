import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft, Leaf } from 'lucide-react';
import { PATHS } from '../routes/paths';
import authHeroImg from '../assets/auth-hero.jpg';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-gray-900 selection:bg-[#133e2e]/20 selection:text-[#133e2e]">
      {/* Left Column: Visual Hero (Desktop) */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 xl:w-[48%] min-h-screen flex-col justify-end p-10 xl:p-14 overflow-hidden bg-stone-900 select-none">
        {/* Background Image with slight scale on hover */}
        <img
          src={authHeroImg}
          alt="Món ăn lành mạnh VeggieLife"
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-out hover:scale-105"
        />

        {/* Soft Vignette & Gradient Overlay for pristine text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 pointer-events-none" />

        {/* Bottom Content Card */}
        <div className="relative z-10 max-w-lg text-white">
          {/* Leaf Icon */}
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center mb-5 text-emerald-300 shadow-md">
            <Leaf className="w-5 h-5 fill-emerald-300/30 stroke-emerald-300" />
          </div>

          {/* Inspirational Quote */}
          <blockquote className="font-serif text-2xl xl:text-3xl font-normal leading-snug tracking-tight text-white/95 mb-4 drop-shadow-sm">
            “Mỗi bữa ăn là một cơ hội để chăm sóc cơ thể và hành tinh.”
          </blockquote>

          {/* Subtitle / Branding */}
          <div className="flex items-center gap-2 text-xs xl:text-sm text-emerald-100/80 font-sans tracking-wide">
            <span className="font-semibold text-white">VeggieLife</span>
            <span className="text-emerald-400">·</span>
            <span>Sống xanh mỗi ngày</span>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div className="flex-1 flex flex-col justify-between min-h-screen relative p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto bg-white">
        {/* Top Bar */}
        <header className="flex items-center justify-between w-full">
          {/* Mobile Brand Mark */}
          <div className="lg:hidden flex items-center gap-2 text-[#133e2e] font-serif text-lg font-bold">
            <Leaf className="w-5 h-5 text-[#133e2e]" />
            <span>VeggieLife</span>
          </div>

          {/* Back to Home Link */}
          <Link
            to={PATHS.HOME}
            className="text-xs sm:text-sm font-medium text-gray-500 hover:text-[#133e2e] transition-colors flex items-center gap-1.5 ml-auto group py-1 px-2 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Về trang chủ</span>
          </Link>
        </header>

        {/* Centered Outlet for Login / Register / Forgot Password */}
        <main className="w-full max-w-[420px] mx-auto my-auto py-8">
          <Outlet />
        </main>

        {/* Subtle Footer */}
        <footer className="text-center text-xs text-gray-400 pt-4">
          © {new Date().getFullYear()} VeggieLife. Tất cả các quyền được bảo lưu.
        </footer>
      </div>
    </div>
  );
};
