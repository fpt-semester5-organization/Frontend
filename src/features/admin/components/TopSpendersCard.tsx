import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { CARD, StatusBadge } from './AdminUi';
import { formatTokens, formatUsd } from '../lib/llmops';
import type { TopSpender, UserTierDistribution } from '../types/admin.types';

interface TopSpendersCardProps {
  tierDistribution?: UserTierDistribution;
  topSpenders?: TopSpender[];
  showTierDistribution?: boolean;
}

export const TopSpendersCard: React.FC<TopSpendersCardProps> = ({
  tierDistribution,
  topSpenders = [],
  showTierDistribution = true,
}) => {
  const vipTokens = tierDistribution?.vipTokens ?? 0;
  const vipCostUsd = tierDistribution?.vipCostUsd ?? 0;
  const memberTokens = tierDistribution?.memberTokens ?? 0;
  const memberCostUsd = tierDistribution?.memberCostUsd ?? 0;
  const systemTokens = tierDistribution?.systemTokens ?? 0;
  const systemCostUsd = tierDistribution?.systemCostUsd ?? 0;

  const totalTierTokens = vipTokens + memberTokens + systemTokens;
  const vipPercent = totalTierTokens > 0 ? (vipTokens / totalTierTokens) * 100 : 0;
  const memberPercent = totalTierTokens > 0 ? (memberTokens / totalTierTokens) * 100 : 0;
  const systemPercent = totalTierTokens > 0 ? (systemTokens / totalTierTokens) * 100 : 0;

  return (
    <div className={cn(CARD, 'flex flex-col gap-space-lg p-space-md sm:p-space-lg')}>
      <div className={cn('grid gap-space-lg', showTierDistribution ? 'lg:grid-cols-2' : 'grid-cols-1')}>
        {/* Cột 1: Phân bổ theo Hạng Hội viên */}
        {showTierDistribution && (
          <div className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Phân bổ theo Hạng Hội viên
            </h3>
          </div>

          {/* Thanh phân bổ nhiều phân đoạn (Multi-segment bar) */}
          <div className="flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label="Phân bổ token theo hạng"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100}
              className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container"
            >
              {totalTierTokens === 0 ? (
                <div className="h-full w-full bg-surface-container-high" />
              ) : (
                <>
                  {vipTokens > 0 && (
                    <div
                      title={`VIP: ${vipPercent.toFixed(1)}%`}
                      style={{ width: `${vipPercent}%` }}
                      className="h-full bg-secondary transition-all"
                    />
                  )}
                  {memberTokens > 0 && (
                    <div
                      title={`Thành viên: ${memberPercent.toFixed(1)}%`}
                      style={{ width: `${memberPercent}%` }}
                      className="h-full bg-primary transition-all"
                    />
                  )}
                  {systemTokens > 0 && (
                    <div
                      title={`Hệ thống & Khách: ${systemPercent.toFixed(1)}%`}
                      style={{ width: `${systemPercent}%` }}
                      className="h-full bg-outline-variant transition-all"
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 font-body-xs text-body-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                Hội viên VIP ({vipPercent.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Thành viên ({memberPercent.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-outline-variant" />
                Hệ thống / Khách ({systemPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Danh sách chi tiết 3 nhóm */}
          <div className="flex flex-col divide-y divide-surface-container rounded-xl border border-surface-container bg-surface-container-low/40 p-1">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-on-secondary-fixed">
                  <Icon name="workspace_premium" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Hội viên VIP
                  </span>
                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                    {formatNumber(vipTokens)} token
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-md text-label-md font-semibold text-secondary">
                  {formatUsd(vipCostUsd)}
                </span>
                <span className="font-body-xs text-body-xs text-on-surface-variant">
                  {formatTokens(vipTokens)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                  <Icon name="person" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Thành viên thường
                  </span>
                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                    {formatNumber(memberTokens)} token
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-md text-label-md font-semibold text-primary">
                  {formatUsd(memberCostUsd)}
                </span>
                <span className="font-body-xs text-body-xs text-on-surface-variant">
                  {formatTokens(memberTokens)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                  <Icon name="settings_system_daydream" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Hệ thống & Khách dùng thử
                  </span>
                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                    {formatNumber(systemTokens)} token
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {formatUsd(systemCostUsd)}
                </span>
                <span className="font-body-xs text-body-xs text-on-surface-variant">
                  {formatTokens(systemTokens)}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Cột 2: Top 5 tài khoản tiêu thụ nhiều nhất */}
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Top 5 tài khoản tiêu thụ
            </h3>
          </div>

          {topSpenders.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-outline-variant/60 p-6">
              <EmptyState
                icon="savings"
                title="Chưa có dữ liệu tiêu thụ"
                description="Chưa có tài khoản nào phát sinh lượt truy vấn API AI trong khoảng thời gian này."
              />
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-surface-container rounded-xl border border-surface-container bg-surface-container-low/40">
              {topSpenders.map((user, idx) => {
                const initial = (user.fullName || user.email || 'U').trim().charAt(0).toUpperCase();
                const isVip = user.role?.toUpperCase() === 'VIP';
                const isAdmin = user.role?.toUpperCase() === 'ADMIN';

                return (
                  <div key={user.userId || idx} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Avatar: hiển thị ảnh thật nếu có avatarUrl, ngược lại hiển thị chữ cái đầu tiên */}
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || 'Avatar'}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 shrink-0 rounded-full object-cover border border-outline-variant/40"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{ display: user.avatarUrl ? 'none' : 'flex' }}
                        className={cn(
                          'h-10 w-10 shrink-0 items-center justify-center rounded-full font-headline-sm text-headline-sm font-semibold',
                          isVip
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-primary-fixed text-on-primary-fixed'
                        )}
                      >
                        {initial}
                      </div>

                      {/* Thông tin tài khoản */}
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          {user.userId > 0 ? (
                            <Link
                              to={PATHS.ADMIN.USER_DETAIL(user.userId)}
                              className="truncate font-label-md text-label-md font-semibold text-on-surface hover:text-primary hover:underline"
                              title={user.fullName || user.email}
                            >
                              {user.fullName || 'Người dùng #' + user.userId}
                            </Link>
                          ) : (
                            <span className="truncate font-label-md text-label-md font-semibold text-on-surface">
                              {user.fullName || 'Hệ thống'}
                            </span>
                          )}

                          <StatusBadge
                            tone={isVip ? 'wait' : isAdmin ? 'info' : 'neutral'}
                            className="text-[11px]"
                          >
                            {user.role || 'MEMBER'}
                          </StatusBadge>
                        </div>
                        <span className="truncate font-body-xs text-body-xs text-on-surface-variant">
                          {user.email || 'Không có email'}
                        </span>
                      </div>
                    </div>

                    {/* Số token và chi phí */}
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {formatTokens(user.totalTokens)}
                      </span>
                      <span className="font-body-xs text-body-xs text-on-surface-variant">
                        {formatUsd(user.totalCostUsd)} • {user.requestCount} lượt
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
