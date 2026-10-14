import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-[#133e2e] text-white p-6 space-y-6">
        <div className="text-xl font-bold">VeggieLife Admin</div>
        <nav className="space-y-2 text-sm">
          <Link
            to={PATHS.ADMIN.DASHBOARD}
            className="block py-2 px-3 rounded bg-white/10 text-white font-medium"
          >
            Dashboard
          </Link>
          <Link to={PATHS.HOME} className="block py-2 px-3 rounded hover:bg-white/5 text-gray-300">
            Quay lại web
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};
