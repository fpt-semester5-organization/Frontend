import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { ROLE_LABEL } from '@/constants/roles';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { AdminQueryError, CARD, StatRow, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { SanctionDialog } from '../components/SanctionDialog';
import { useAdminUserContents } from '../hooks/useAdminUsers';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { isNotFound } from '../lib/endpoint';
import { ACCOUNT_STATUS, CONTENT_TYPE_LABEL, contentStatus } from '../lib/labels';
import { recommendSanction } from '../lib/sanctions';
import { formatServerDateTime } from '@/lib/serverDate';
import type { AdminUser, AdminUserContentItem, ContentType } from '../types/admin.types';

const PAGE_SIZE = 20;
const TYPES: ContentType[] = ['POST', 'RECIPE', 'VIDEO', 'COMMENT'];

/** Link xem nội dung ở trang công khai; bình luận không có trang riêng. */
function contentLink(item: AdminUserContentItem): string | null {
  if (item.type === 'POST') return PATHS.COMMUNITY.POST_DETAIL(item.id);
  if (item.type === 'RECIPE') return PATHS.RECIPES.DETAIL(item.id);
  if (item.type === 'VIDEO') return PATHS.VIDEOS.DETAIL(item.id);
  return null;
}

/**
 * SCR-39 admin/UserDetail · `/admin/users/:id` — FN-ADM-03 nội dung & lịch sử vi phạm, FN-ADM-02 xử phạt.
 * Họ tên/email đi theo state từ danh sách (GET /admin/users/{id} chưa có trong API); mở trực tiếp bằng link thì hiện mã người dùng.
 */
const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const location = useLocation();
  const fromList = (location.state as { user?: AdminUser } | null)?.user;
  const listUser = fromList?.userId === userId ? fromList : undefined;
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const { get, set, page } = useUrlFilters();
  const type = (TYPES as string[]).includes(get('type')) ? (get('type') as ContentType) : undefined;
  const contents = useAdminUserContents(userId, { type, page, size: PAGE_SIZE });
  const [sanctionOpen, setSanctionOpen] = useState(false);

  const backLink = (
    <Link
      to={PATHS.ADMIN.USERS}
      className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant no-underline hover:text-primary"
    >
      <Icon name="arrow_back" className="text-[18px]" />
      Danh sách người dùng
    </Link>
  );

  if (!Number.isInteger(userId) || userId <= 0 || (contents.isError && isNotFound(contents.error))) {
    return (
      <div className="flex flex-col gap-space-lg">
        {backLink}
        <div className={CARD}>
          <EmptyState icon="person_off" title="Không tìm thấy người dùng" description="Tài khoản không tồn tại hoặc mã người dùng không đúng." />
        </div>
      </div>
    );
  }

  const data = contents.data;
  const accountStatus = data?.accountStatus ?? listUser?.accountStatus;
  const lockedUntil = data ? data.lockedUntil : listUser?.lockedUntil;
  const violations = data?.countViolationReports ?? listUser?.countViolationReports ?? 0;
  const statusInfo = accountStatus ? ACCOUNT_STATUS[accountStatus] : null;
  const recommendation = recommendSanction(violations);
  const title = listUser?.fullName || listUser?.email || `Người dùng #${userId}`;

  return (
    <div className="flex flex-col gap-space-lg">
      {backLink}

      <section className={cn(CARD, 'flex flex-col gap-space-md p-space-lg')} aria-labelledby="user-title">
        <div className="flex flex-wrap items-start justify-between gap-space-md">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 id="user-title" className="break-words font-headline-md text-headline-md text-on-surface">
              {title}
            </h1>
            {listUser?.fullName && <p className="break-all font-body-md text-body-md text-on-surface-variant">{listUser.email}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {statusInfo && <StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>}
              {listUser && <StatusBadge tone="neutral">{ROLE_LABEL[listUser.role] ?? listUser.role}</StatusBadge>}
              {lockedUntil && (
                <span className="font-body-sm text-body-sm text-on-surface-variant">Hạn khóa: {formatServerDateTime(lockedUntil)}</span>
              )}
            </div>
          </div>
          <Button onClick={() => setSanctionOpen(true)} disabled={!accountStatus}>
            <Icon name="gavel" className="text-[18px]" />
            Xử lý tài khoản
          </Button>
        </div>

        <dl className="grid gap-x-space-xl font-body-sm text-body-sm sm:grid-cols-2 lg:grid-cols-4">
          <StatRow label="Mã người dùng">#{userId}</StatRow>
          <StatRow label="Vi phạm đã xác nhận">{violations}</StatRow>
          <StatRow label="Báo cáo được duyệt">{data?.violationSummary.resolved ?? '–'}</StatRow>
          <StatRow label="Báo cáo bị bác bỏ">{data?.violationSummary.dismissed ?? '–'}</StatRow>
          {listUser && <StatRow label="Ngày tạo">{formatServerDateTime(listUser.createdAt)}</StatRow>}
          {listUser && <StatRow label="Trường phái">{listUser.dietarySchoolName || 'Chưa chọn'}</StatRow>}
        </dl>
        {recommendation && (
          <p className="flex items-start gap-2 rounded-xl bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface">
            <Icon name="info" className="mt-0.5 text-[18px] text-primary" />
            Theo thang kỷ luật: {recommendation.rule.toLowerCase()}.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-space-md" aria-labelledby="contents-title">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <h2 id="contents-title" className="font-headline-sm text-headline-sm text-on-surface">
            Nội dung đã tạo
          </h2>
          <div role="group" aria-label="Loại nội dung" className="flex flex-wrap gap-2">
            {[undefined, ...TYPES].map((option) => (
              <button
                key={option ?? 'ALL'}
                type="button"
                aria-pressed={type === option}
                onClick={() => set({ type: option })}
                className={cn(
                  'rounded-full border px-3 py-1 font-label-md text-label-md transition-colors',
                  type === option ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'
                )}
              >
                {option ? CONTENT_TYPE_LABEL[option] : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        {contents.isPending ? (
          <TableSkeleton label="Đang tải nội dung của người dùng" />
        ) : contents.isError && !data ? (
          <AdminQueryError error={contents.error} onRetry={() => void contents.refetch()} retrying={contents.isRefetching} />
        ) : !data || data.items.length === 0 ? (
          <div className={CARD}>
            <EmptyState
              icon="draft"
              title={type ? `Chưa có ${CONTENT_TYPE_LABEL[type].toLowerCase()} nào` : 'Người dùng chưa tạo nội dung nào'}
              description={type ? 'Chọn "Tất cả" để xem các loại nội dung khác.' : undefined}
              action={type ? <Button variant="outline" onClick={() => set({ type: undefined })}>Xem tất cả</Button> : undefined}
            />
          </div>
        ) : (
          <>
            <TableShell label="Nội dung của người dùng" busy={contents.isPlaceholderData}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>Loại</th>
                  <th scope="col" className={TH}>Nội dung</th>
                  <th scope="col" className={TH}>Trạng thái</th>
                  <th scope="col" className={TH}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const status = contentStatus(item.status);
                  const link = contentLink(item);
                  const label = item.title?.trim() || `${CONTENT_TYPE_LABEL[item.type] ?? 'Nội dung'} #${item.id}`;
                  return (
                    <tr key={`${item.type}-${item.id}`}>
                      <td className={`${TD} whitespace-nowrap`}>{CONTENT_TYPE_LABEL[item.type] ?? 'Khác'}</td>
                      <td className={`${TD} max-w-[360px]`}>
                        {link ? (
                          <Link to={link} target="_blank" rel="noopener noreferrer" className="line-clamp-2 break-words text-primary underline-offset-2 hover:underline">
                            {label}
                          </Link>
                        ) : (
                          <span className="line-clamp-2 break-words">{label}</span>
                        )}
                      </td>
                      <td className={TD}>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{formatServerDateTime(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination page={page} size={PAGE_SIZE} total={data.meta.total} onPageChange={(next) => set({ page: next })} />
          </>
        )}
      </section>

      {accountStatus && (
        <SanctionDialog
          show={sanctionOpen}
          onClose={() => setSanctionOpen(false)}
          currentUserId={currentUserId}
          target={{
            userId,
            email: listUser?.email,
            fullName: listUser?.fullName,
            role: listUser?.role,
            accountStatus,
            countViolationReports: violations,
          }}
        />
      )}
    </div>
  );
};

export default AdminUserDetailPage;
