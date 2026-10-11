import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export const AdminLayout = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-gray-800">Admin Panel</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/admin" className="block px-4 py-2 rounded bg-gray-800 text-white">Dashboard</Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={clearAuth} className="w-full text-left px-4 py-2 text-gray-300 hover:text-white">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};
