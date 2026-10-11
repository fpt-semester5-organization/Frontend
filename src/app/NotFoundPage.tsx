import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { PATHS } from '@/routes/paths';

export const NotFoundPage: React.FC = () => (
  <EmptyState
    icon={MapPinOff}
    title="404 - Không tìm thấy trang"
    description="Đường dẫn không tồn tại hoặc tính năng đang được phát triển."
    action={
      <Link
        to={PATHS.HOME}
        className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white no-underline hover:bg-brand-700"
      >
        Về trang chủ
      </Link>
    }
  />
);
