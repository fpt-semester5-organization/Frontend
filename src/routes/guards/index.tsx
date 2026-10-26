import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ForbiddenPage } from '@/app/ForbiddenPage';
import { readReturnUrl } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/common/PageLoader';
import { MainLayout } from '@/layouts/MainLayout';
import { useAuthStore } from '@/stores/auth.store';
import { PATHS, withReturnUrl } from '@/routes/paths';

const useLoginRedirect = () => {
  const location = useLocation();
  return withReturnUrl(PATHS.AUTH.LOGIN, `${location.pathname}${location.search}`);
};

/** Thành viên (MEMBER/VIP) hoặc Admin. */
export const RequireAuth: React.FC = () => {
  const { isAuthenticated, sessionStatus } = useAuthStore();
  const loginUrl = useLoginRedirect();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={loginUrl} replace />;
  return <Outlet />;
};

/** Thành viên VIP còn hạn (role VIP + claim isVip, D104). */
export const RequireVip: React.FC = () => {
  const { user, isAuthenticated, sessionStatus } = useAuthStore();
  const loginUrl = useLoginRedirect();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={loginUrl} replace />;
  if (!user?.isVip) return <Navigate to={PATHS.SUBSCRIPTION.PRICING} replace />;
  return <Outlet />;
};

/**
 * Quản trị viên (role ADMIN). Khách → đăng nhập kèm returnUrl; đã đăng nhập nhưng không phải ADMIN → trang 403
 * (trước đây chuyển về đăng nhập rồi bị GuestOnly đẩy về trang chủ, người dùng không biết vì sao).
 */
export const RequireAdmin: React.FC = () => {
  const { user, isAuthenticated, sessionStatus } = useAuthStore();
  const loginUrl = useLoginRedirect();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={loginUrl} replace />;
  if (user?.role !== 'ADMIN')
    return (
      <MainLayout>
        <ForbiddenPage />
      </MainLayout>
    );
  return <Outlet />;
};

/** Trang đăng nhập/đăng ký: đã đăng nhập thì về returnUrl (nếu có) hoặc trang chủ; tài khoản ADMIN bắt buộc về /admin. */
export const GuestOnly: React.FC = () => {
  const { user, isAuthenticated, sessionStatus } = useAuthStore();
  const location = useLocation();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (isAuthenticated) {
    if (user?.role === 'ADMIN') {
      const returnUrl = readReturnUrl(location);
      return <Navigate to={returnUrl && returnUrl.startsWith('/admin') ? returnUrl : PATHS.ADMIN.ROOT} replace />;
    }
    return <Navigate to={readReturnUrl(location) ?? PATHS.HOME} replace />;
  }
  return <Outlet />;
};
