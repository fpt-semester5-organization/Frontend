import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { RequireAuth, GuestOnly, RequireAdmin } from '../routes/guards';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyOtpPage } from '../features/auth/pages/VerifyOtpPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { ScannerPage } from '../features/scanner/pages/ScannerPage';

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
            <h1 className="text-3xl font-serif text-[#133e2e]">Chào mừng tới VeggieLife</h1>
            <p className="text-sm text-gray-500">Hệ sinh thái lối sống thuần chay toàn diện</p>
          </div>
        ),
      },
      { path: PATHS.SCANNER.ROOT, element: <ScannerPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: PATHS.AUTH.CHANGE_PASSWORD,
            element: <ChangePasswordPage />,
          },
        ],
      },
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
  {
    path: '*',
    element: (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-2xl font-bold text-gray-700">404 - Không tìm thấy trang</h2>
        <a href={PATHS.HOME} className="text-[#133e2e] underline font-medium">Quay về trang chủ</a>
      </div>
    ),
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
