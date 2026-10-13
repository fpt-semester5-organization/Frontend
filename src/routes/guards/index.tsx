import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
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

/** Quản trị viên (role ADMIN). */
export const RequireAdmin: React.FC = () => {
  const { user, isAuthenticated, sessionStatus } = useAuthStore();
  const loginUrl = useLoginRedirect();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (!isAuthenticated || user?.role !== 'ADMIN') return <Navigate to={loginUrl} replace />;
  return <Outlet />;
};

/** Trang đăng nhập/đăng ký: đã đăng nhập thì về trang chủ. */
export const GuestOnly: React.FC = () => {
  const { isAuthenticated, sessionStatus } = useAuthStore();
  if (sessionStatus === 'restoring') return <PageLoader />;
  if (isAuthenticated) return <Navigate to={PATHS.HOME} replace />;
  return <Outlet />;
};
