import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { PATHS } from '@/routes/paths';

/**
 * Guard: Requires user to be logged in as Member or Admin
 */
export const RequireAuth: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to={PATHS.AUTH.LOGIN} replace />;
  }
  return <Outlet />;
};

/**
 * Guard: Requires user to have active VIP status
 */
export const RequireVip: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to={PATHS.AUTH.LOGIN} replace />;
  }
  if (!user?.isVip) {
    return <Navigate to={PATHS.SUBSCRIPTION.PRICING} replace />;
  }
  return <Outlet />;
};

/**
 * Guard: Requires user to have ADMIN role
 */
export const RequireAdmin: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to={PATHS.AUTH.LOGIN} replace />;
  }
  return <Outlet />;
};

/**
 * Guard: Only accessible by unauthenticated guests (redirects to Home if logged in)
 */
export const GuestOnly: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={PATHS.HOME} replace />;
  }
  return <Outlet />;
};
