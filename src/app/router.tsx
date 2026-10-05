import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

/**
 * Starter Welcome Page - displays system status and feature module status
 * Each team member can replace their respective route with their feature pages.
 */
const WelcomePage: React.FC = () => {
  const modules = [
    { name: 'Auth', path: PATHS.AUTH.LOGIN, desc: 'Đăng nhập, đăng ký OTP, quên mật khẩu' },
    { name: 'Home', path: PATHS.HOME, desc: 'Trang chủ, tìm kiếm công thức & bài viết' },
    { name: 'Recipes', path: PATHS.RECIPES.ROOT, desc: 'Danh sách, chi tiết, tạo công thức món chay' },
    { name: 'Community', path: PATHS.COMMUNITY.ROOT, desc: 'Bảng tin cộng đồng, bình luận đa tầng, tương tác' },
    { name: 'Videos', path: PATHS.VIDEOS, desc: 'Trình phát video nấu ăn & tóm tắt công thức STT' },
    { name: 'Profile', path: PATHS.PROFILE.ROOT, desc: 'Hồ sơ người dùng, chỉ số BMI, trường phái ăn chay' },
    { name: 'Meal Plans', path: PATHS.MEAL_PLANS, desc: 'Lập thực đơn tuần tự động theo dinh dưỡng' },
    { name: 'Shopping Lists', path: PATHS.SHOPPING_LISTS, desc: 'Danh sách đi chợ thông minh' },
    { name: 'Scanner', path: PATHS.SCANNER.ROOT, desc: 'Quét mã vạch sản phẩm & OCR nhãn phụ E-numbers' },
    { name: 'Fridge Vision', path: PATHS.FRIDGE, desc: 'Nhận diện nguyên liệu tủ lạnh qua ảnh AI' },
    { name: 'Venues Map', path: PATHS.VENUES.ROOT, desc: 'Bản đồ quán chay lân cận (HappyCow + Maps)' },
    { name: 'AI Chatbot', path: PATHS.CHAT, desc: 'Tư vấn dinh dưỡng chuyên sâu & khảo sát' },
    { name: 'Subscription', path: PATHS.SUBSCRIPTION.PRICING, desc: 'Gói thành viên VIP, thanh toán MoMo / VietQR' },
    { name: 'Admin Portal', path: PATHS.ADMIN.DASHBOARD, desc: 'Quản trị người dùng, kiểm duyệt & giám sát AI' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>🥗</span>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#16a34a', margin: 0 }}>
            VeggieLife Frontend
          </h1>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            background: '#dcfce7',
            color: '#15803d',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            marginLeft: 'auto'
          }}>
            Template Ready (100%)
          </span>
        </div>
        <p style={{ color: '#4b5563', margin: 0, fontSize: '0.95rem' }}>
          Khung kiến trúc <strong>Feature-Driven</strong> (React 18 · TypeScript · Vite · Tailwind · React Query · Zustand).
          Các thành viên vui lòng phát triển mã nguồn trực tiếp trong thư mục <code>src/features/&lt;tên-feature&gt;/</code> tương ứng.
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
          Danh mục 14 Phân hệ Nghiệp vụ (Features)
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem'
        }}>
          {modules.map((m) => (
            <div
              key={m.name}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                  {m.name}
                </h3>
                <code style={{ fontSize: '0.75rem', color: '#16a34a', background: '#f0fdf4', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  {m.path}
                </code>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4 }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
        SWP391 — VeggieLife Project © 2026. Built with Vite + React + TypeScript.
      </footer>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <WelcomePage />,
  },
  {
    path: '*',
    element: (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>404 - Không tìm thấy trang</h2>
        <p style={{ color: '#6b7280' }}>Đường dẫn không tồn tại hoặc tính năng đang được phát triển.</p>
        <a href={PATHS.HOME} style={{ color: '#16a34a', textDecoration: 'underline' }}>Quay về trang chủ</a>
      </div>
    ),
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
