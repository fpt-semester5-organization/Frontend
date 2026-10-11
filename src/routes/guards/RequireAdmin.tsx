import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { PATHS } from '../paths';

export const RequireAdmin = () => {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to={PATHS.HOME} replace />;
  }
  return <Outlet />;
};
