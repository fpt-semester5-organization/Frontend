/**
 * SCR-10 · home/Home · `/`
 * FN: FN-POST-01, FN-POST-05 (FN-AUTH-01/02 do phiên Khách chạy sẵn ở AppShell)
 * Trang chủ VeggieLife:
 * - Khối "Món ăn nổi bật": Khám phá các món ăn, tìm kiếm & phân loại món, bấm vào món hiển thị nhiều công thức khác nhau
 *   (công thức dành cho người gầy, người không ăn cay, chuẩn vị truyền thống, kiêng ngũ vị tân).
 * - Khối "TrialCards": Giới thiệu gói dùng thử và tính năng nổi bật.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { PATHS } from '@/routes/paths';
import { HomeHero } from '../components/HomeHero';
import { HomeFoodSection } from '../components/HomeFoodSection';
import { TrialCards } from '../components/TrialCards';

const HomePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'ADMIN') {
    return <Navigate to={PATHS.ADMIN.ROOT} replace />;
  }

  return (
    <div className="flex flex-col">
      <HomeHero />

      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-space-2xl px-margin-mobile py-space-xl sm:px-margin">
        {/* Khối Món ăn nổi bật & Các biến thể công thức (Định lượng rõ ràng & đa dạng công thức) */}
        <div id="foods-section" className="scroll-mt-24">
          <HomeFoodSection />
        </div>

        {/* Khối Thẻ dùng thử & Lợi ích VIP */}
        <TrialCards />
      </main>
    </div>
  );
};

export default HomePage;
