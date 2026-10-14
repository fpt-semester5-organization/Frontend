import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { QUOTA } from '@/constants/quota';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

const UPGRADE_LINK =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 py-2.5 font-label-md text-label-md text-on-secondary no-underline shadow-sm transition-colors hover:bg-on-secondary-fixed-variant';

/** Quyền lợi hiển thị (số liệu từ constants/quota, server mới là nơi quyết định). */
const BENEFITS = [
  `Tạo tới ${QUOTA.mealPlanPerWeek.vip} thực đơn mỗi tuần (gói Free: ${QUOTA.mealPlanPerWeek.free})`,
  'Xem calo từng món, từng bữa và so với mục tiêu mỗi ngày',
  'Xuất thực đơn và danh sách đi chợ ra PDF để in',
];

/** Hộp mời nâng cấp VIP khi Thành viên Free chạm hạn mức (UI Spec 1.1: 403 ERR_QUOTA_*). */
export const VipUpsellDialog: React.FC<{ show: boolean; onHide: () => void; title: string; message: React.ReactNode }> = ({
  show,
  onHide,
  title,
  message,
}) => (
  <Modal show={show} onHide={onHide} bare labelledBy="vip-upsell-title">
    <div className="flex flex-col items-center gap-space-md p-space-lg text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
        <Icon name="workspace_premium" filled className="text-[30px]" />
      </span>
      <h2 id="vip-upsell-title" className="font-headline-sm text-headline-sm text-on-surface">
        {title}
      </h2>
      <div className="font-body-md text-body-md text-on-surface-variant">{message}</div>
      <ul className="flex w-full flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md text-left">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface">
            <Icon name="check_circle" filled className="mt-0.5 text-[18px] text-primary" />
            {benefit}
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col-reverse gap-space-sm sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onHide}>
          Để sau
        </Button>
        <Link to={PATHS.SUBSCRIPTION.PRICING} onClick={onHide} className={UPGRADE_LINK}>
          <Icon name="workspace_premium" className="text-[18px]" />
          Nâng cấp VIP
        </Link>
      </div>
    </div>
  </Modal>
);

/** Khối khóa cho tính năng chỉ dành cho VIP (UI Spec 1.1: 403 ERR_VIP_REQUIRED). */
export const VipLockCard: React.FC<{ title: string; description: string; className?: string }> = ({
  title,
  description,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col gap-space-sm rounded-xl border border-dashed border-secondary/40 bg-secondary-fixed/40 p-space-md sm:flex-row sm:items-center',
      className
    )}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
      <Icon name="lock" className="text-[20px]" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-label-md text-label-md text-on-surface">{title}</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
    </div>
    <Link to={PATHS.SUBSCRIPTION.PRICING} className={UPGRADE_LINK}>
      Nâng cấp VIP
    </Link>
  </div>
);
