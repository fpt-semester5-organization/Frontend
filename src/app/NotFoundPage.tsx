import React, { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { PATHS } from '@/routes/paths';

const PRIMARY_LINK =
  'rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const SECONDARY_BUTTON =
  'rounded-lg bg-surface-container px-5 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

interface StatusPageProps {
  icon: string;
  /** Mã trạng thái hiển thị nhỏ phía trên tiêu đề (404, 403…), chỉ để người dùng nhận biết loại lỗi. */
  code: string;
  title: string;
  description: ReactNode;
}

/** Khung chung cho trang trạng thái (404, 403): tiêu đề, giải thích và lối thoát về trang trước / trang chủ. */
export const StatusPage: React.FC<StatusPageProps> = ({ icon, code, title, description }) => {
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-space-2xl text-center">
      <Icon name={icon} className="text-[56px] text-outline" />
      <p className="font-label-md text-label-md tracking-widest text-on-surface-variant">{code}</p>
      <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">{title}</h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-space-sm">
        {canGoBack && (
          <button type="button" onClick={() => navigate(-1)} className={SECONDARY_BUTTON}>
            Quay lại trang trước
          </button>
        )}
        <Link to={PATHS.HOME} className={PRIMARY_LINK}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
};

/** Trạng thái 404 (UI Spec 1.1): đường dẫn không tồn tại. */
export const NotFoundPage: React.FC = () => (
  <StatusPage
    icon="search_off"
    code="LỖI 404"
    title="Không tìm thấy trang"
    description="Đường dẫn không tồn tại hoặc tính năng đang được phát triển."
  />
);
