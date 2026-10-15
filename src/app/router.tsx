import React, { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { RequireAuth, GuestOnly, RequireAdmin } from '@/routes/guards';
import { LogoMark } from '@/components/common/Logo';
import { PATHS } from '@/routes/paths';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyOtpPage } from '@/features/auth/pages/VerifyOtpPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { ScannerPage } from '@/features/scanner/pages/ScannerPage';

// Tải trang theo route (code splitting); Suspense nằm trong MainLayout.
const PostFeed = lazy(() => import('@/features/community/pages/PostFeed'));
const PostDetail = lazy(() => import('@/features/community/pages/PostDetail'));
const PostEditor = lazy(() => import('@/features/community/pages/PostEditor'));
const VenueMap = lazy(() => import('@/features/venues/pages/VenueMap'));
const MyPosts = lazy(() => import('@/features/community/pages/MyPosts'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));

/**
 * Starter Welcome Page - displays system status and feature module status
 * Each team member can replace their respective route with their feature pages.
 */
const WelcomePage: React.FC = () => {
  const modules = [
    { name: 'Auth', path: PATHS.AUTH.LOGIN, desc: 'Đăng nhập, đăng ký OTP, quên mật khẩu' },
    { name: 'Home', path: PATHS.HOME, desc: 'Trang chủ, tìm kiếm công thức & bài viết' },
    { name: 'Recipes', path: PATHS.RECIPES.ROOT, desc: 'Danh sách, chi tiết, tạo công thức món chay' },
    { name: 'Community', path: PATHS.COMMUNITY.ROOT, desc: 'Bảng tin cộng đồng, bình luận đa tầng, tương tác' },
    { name: 'Videos', path: PATHS.VIDEOS.DETAIL(':id'), desc: 'Trình phát video nấu ăn & tóm tắt công thức STT' },
    { name: 'Profile', path: PATHS.ME.PROFILE, desc: 'Hồ sơ người dùng, chỉ số BMI, trường phái ăn chay' },
    { name: 'Meal Plans', path: PATHS.MEAL_PLANS.ROOT, desc: 'Lập thực đơn tuần tự động theo dinh dưỡng' },
    { name: 'Shopping Lists', path: PATHS.SHOPPING_LISTS.DETAIL(':id'), desc: 'Danh sách đi chợ thông minh' },
    { name: 'Scanner', path: PATHS.SCANNER.ROOT, desc: 'Quét mã vạch sản phẩm & tra phụ gia E-numbers' },
    { name: 'Fridge Vision', path: PATHS.FRIDGE, desc: 'Nhận diện nguyên liệu tủ lạnh qua ảnh AI' },
    { name: 'Venues Map', path: PATHS.VENUES.ROOT, desc: 'Bản đồ quán chay lân cận (HappyCow + Maps)' },
    { name: 'AI Chatbot', path: PATHS.CHAT.ROOT, desc: 'Tư vấn dinh dưỡng chuyên sâu & khảo sát' },
    { name: 'Subscription', path: PATHS.SUBSCRIPTION.PRICING, desc: 'Gói thành viên VIP, thanh toán MoMo / VietQR' },
    { name: 'Admin Portal', path: PATHS.ADMIN.DASHBOARD, desc: 'Quản trị người dùng, kiểm duyệt & giám sát AI' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-margin-mobile py-space-xl sm:px-margin">
      <header className="mb-space-xl flex flex-col gap-space-sm border-b border-outline-variant/50 pb-space-lg">
        <div className="flex flex-wrap items-center gap-space-sm">
          <LogoMark size={40} />
          <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">VeggieLife Frontend</h1>
          <span className="ml-auto rounded-full bg-primary-fixed px-2.5 py-1 font-label-sm text-label-sm text-on-primary-fixed">
            Khung dự án
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Khung kiến trúc theo feature (React 18, TypeScript, Vite, Tailwind, React Query, Zustand). Mỗi thành viên phát
          triển trong thư mục <code className="rounded bg-surface-container px-1">src/features/&lt;tên-feature&gt;/</code>.
        </p>
      </header>

      <section aria-labelledby="modules-title">
        <h2 id="modules-title" className="mb-space-md font-headline-sm text-headline-sm text-on-surface">
          14 phân hệ nghiệp vụ
        </h2>
        <ul className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <li key={m.name} className="rounded-xl bg-surface-container-lowest p-space-md shadow-card">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="font-label-lg text-label-lg text-on-surface">{m.name}</h3>
                <code className="truncate rounded bg-primary-fixed px-1.5 py-0.5 font-label-sm text-label-sm text-on-primary-fixed">
                  {m.path}
                </code>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{m.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          // Bản đồ quán chay (SCR-18)
          { path: PATHS.VENUES.ROOT, element: <VenueMap /> },

          { path: PATHS.HOME, element: <WelcomePage /> },

          // Community (SCR-25 → SCR-28)
          { path: PATHS.COMMUNITY.ROOT, element: <PostFeed /> },
          { path: PATHS.COMMUNITY.POST_DETAIL(':id'), element: <PostDetail /> },
          { path: PATHS.ME.POSTS, element: <MyPosts /> },
          {
            element: <RequireAuth />,
            children: [
              { path: PATHS.COMMUNITY.NEW_POST, element: <PostEditor /> },
              { path: PATHS.COMMUNITY.EDIT_POST(':id'), element: <PostEditor /> },
              { path: PATHS.AUTH.CHANGE_PASSWORD, element: <ChangePasswordPage /> },
            ],
          },

          // Chatbot RAG (SCR-29)
          { path: PATHS.CHAT.ROOT, element: <ChatPage /> },
          { path: PATHS.CHAT.SESSION(':sessionId'), element: <ChatPage /> },

          // Scanner
          { path: PATHS.SCANNER.ROOT, element: <ScannerPage /> },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: PATHS.AUTH.LOGIN, element: <LoginPage /> },
              { path: PATHS.AUTH.REGISTER, element: <RegisterPage /> },
              { path: PATHS.AUTH.VERIFY_OTP, element: <VerifyOtpPage /> },
              { path: PATHS.AUTH.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
              { path: PATHS.AUTH.RESET_PASSWORD, element: <ResetPasswordPage /> },
            ],
          },
        ],
      },
      {
        path: PATHS.ADMIN.DASHBOARD,
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [{ index: true, element: <div className="p-8">Admin Dashboard</div> }],
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
