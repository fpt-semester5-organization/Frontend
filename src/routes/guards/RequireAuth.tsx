import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { PATHS } from '../paths';

export const RequireAuth = () => {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to={PATHS.AUTH.LOGIN} replace />;
  }
  return <Outlet />;
};
