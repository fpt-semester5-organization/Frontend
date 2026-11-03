import React from 'react';
import { Icon } from '@/components/ui/Icon';

export interface HomeHeroProps {
  // Props tùy chọn để giữ tương thích ngược
  filters?: unknown;
  schools?: unknown;
  schoolsLoading?: boolean;
  onChange?: (patch: unknown) => void;
}

/** Phần đầu trang chủ: Banner thông điệp đầy đủ chiều cao màn hình, đĩa salad chay sắc nét tự nhiên. */
export const HomeHero: React.FC<HomeHeroProps> = () => {
  return (
    <section
      aria-labelledby="home-title"
      className="relative flex min-h-[calc(100vh-72px)] min-h-[calc(100dvh-72px)] items-center overflow-hidden bg-[#f4f0e6] bg-cover bg-no-repeat bg-right"
      style={{
        backgroundImage: `url('/images/home-hero-bg.webp')`,
      }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center px-margin-mobile py-space-xl sm:px-margin sm:py-space-2xl">
        <div className="flex w-full max-w-[620px] flex-col items-start gap-space-md text-left">
          <h1
            id="home-title"
            className="font-headline-lg text-headline-lg-mobile text-balance text-[#1b3d2b] sm:font-display sm:text-display"
          >
            Sống xanh, ăn lành, trọn yêu thương
          </h1>
          <p className="max-w-[540px] font-body-md text-body-md text-on-surface-variant sm:text-body-lg">
            Công thức có định lượng rõ ràng, video nấu ăn và kinh nghiệm từ cộng đồng người ăn chay.
          </p>

          <a
            href="#foods-section"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-label-lg text-label-lg text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
          >
            Khám phá công thức
            <Icon name="arrow_downward" className="text-[20px]" />
          </a>
        </div>
      </div>
    </section>
  );
};
