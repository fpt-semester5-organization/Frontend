import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { RequireAuth } from '../routes/guards/RequireAuth';
import { GuestOnly } from '../routes/guards/GuestOnly';
import { RequireAdmin } from '../routes/guards/RequireAdmin';
import { Login } from '../features/auth/pages/Login';
import { Register } from '../features/auth/pages/Register';
import { VerifyOtp } from '../features/auth/pages/VerifyOtp';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword';
import { ResetPassword } from '../features/auth/pages/ResetPassword';
import { ChangePassword } from '../features/auth/pages/ChangePassword';
import { BarcodeScanPage } from '../features/scanner/pages/BarcodeScanPage';
import { ScanHistoryPage } from '../features/scanner/pages/ScanHistoryPage';

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MainLayout />,
    children: [
      { index: true, element: <div className="text-center py-20 text-gray-500">Trang chủ</div> },
      { path: PATHS.SCANNER.ROOT, element: <BarcodeScanPage /> },
      { path: PATHS.SCANNER.HISTORY, element: <ScanHistoryPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: PATHS.AUTH.CHANGE_PASSWORD, element: <ChangePassword /> }
        ]
      }
    ]
  },
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: PATHS.AUTH.LOGIN, element: <Login /> },
          { path: PATHS.AUTH.REGISTER, element: <Register /> },
          { path: PATHS.AUTH.VERIFY_OTP, element: <VerifyOtp /> },
          { path: PATHS.AUTH.FORGOT_PASSWORD, element: <ForgotPassword /> },
          { path: PATHS.AUTH.RESET_PASSWORD, element: <ResetPassword /> },
        ]
      }
    ]
  },
  {
    path: PATHS.ADMIN.DASHBOARD,
    element: <RequireAdmin />,
    children: [
      { element: <AdminLayout />, children: [{ index: true, element: <div>Admin Dashboard</div> }] }
    ]
  }
]);

export const AppRouter = () => <RouterProvider router={router} />;
