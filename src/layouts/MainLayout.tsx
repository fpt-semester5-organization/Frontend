import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { GuestQuotaBadge } from '../components/common/GuestQuotaBadge';
import { SignupPromptModal } from '../components/common/SignupPromptModal';

export const MainLayout = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">VeggieLife</Link>
          <div className="flex items-center space-x-4">
            {(!user || user.role === 'GUEST') && <GuestQuotaBadge />}
            {user && user.role !== 'GUEST' ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Hi, {user.fullName}</span>
                <button onClick={clearAuth} className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">Logout</button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">Login</Link>
                <Link to="/register" className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm">Register</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500 text-sm">
        &copy; 2026 VeggieLife. All rights reserved.
      </footer>
      <SignupPromptModal />
    </div>
  );
};
