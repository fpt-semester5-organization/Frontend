import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { PATHS } from '@/routes/paths';

/** Trạng thái 404 (UI Spec 1.1). */
export const NotFoundPage: React.FC = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-space-2xl text-center">
    <Icon name="search_off" className="text-[56px] text-outline" />
    <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Không tìm thấy trang</h1>
    <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
      Đường dẫn không tồn tại hoặc tính năng đang được phát triển.
    </p>
    <Link
      to={PATHS.HOME}
      className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
    >
      Về trang chủ
    </Link>
  </div>
);
