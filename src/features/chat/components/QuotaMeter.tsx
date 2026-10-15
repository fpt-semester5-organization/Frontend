import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { QUOTA } from '@/constants/quota';

interface QuotaMeterProps {
  label: string;
  used?: number;
  limit: number;
  unit: string;
  isVip?: boolean;
  isAuthenticated?: boolean;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({
  label,
  used = 0,
  limit,
  unit,
  isVip = false,
  isAuthenticated = false,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((used / Math.max(1, limit)) * 100)));
  const isNearLimit = percentage >= 80;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-xs text-on-surface-variant font-medium">{label}</span>
        <span className="font-mono text-xs font-semibold tabular-nums text-on-surface">
          <span className={isNearLimit ? 'text-warning font-bold' : 'text-primary'}>{used}</span>
          <span className="text-on-surface-variant"> / {limit} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isNearLimit ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
        <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
        <span className="truncate">Trợ lý Dinh dưỡng VeggieLife</span>
      </div>
      {isAuthenticated && !isVip && (
        <Link
          to={PATHS.SUBSCRIPTION.PRICING}
          className="mt-0.5 inline-flex items-center gap-1 font-label-sm text-xs font-semibold text-primary transition hover:underline"
        >
          <span>Nâng cấp VIP ({QUOTA.chatPerDay.vip} câu/ngày)</span>
          <span className="material-symbols-outlined text-[14px]">north_east</span>
        </Link>
      )}
      {!isAuthenticated && (
        <Link
          to={PATHS.AUTH.REGISTER}
          className="mt-0.5 inline-flex items-center gap-1 font-label-sm text-xs font-semibold text-primary transition hover:underline"
        >
          <span>Đăng ký để nhận 20 câu/ngày</span>
          <span className="material-symbols-outlined text-[14px]">north_east</span>
        </Link>
      )}
    </div>
  );
};
