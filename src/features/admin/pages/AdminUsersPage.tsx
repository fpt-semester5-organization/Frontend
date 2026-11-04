import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ROLE_LABEL } from '@/constants/roles';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import { PATHS } from '@/routes/paths';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { SearchBox } from '../components/SearchBox';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { ACCOUNT_STATUS, ACCOUNT_STATUSES } from '../lib/labels';
import { formatServerDateTime } from '@/lib/serverDate';
import type { AccountStatus, AdminUserFilters } from '../types/admin.types';

const PAGE_SIZE = 20;
const ROLES_FILTER = ['MEMBER', 'ADMIN'] as const;

/**
 * SCR-39 admin/Users · `/admin/users` — FN-ADM-01 tra cứu người dùng.
 * Lọc theo từ khóa (email/họ tên), trạng thái (7 trạng thái BR-ADM-USR-002), vai trò, trường phái; phân trang theo meta.
 */
const AdminUsersPage: React.FC = () => {
  const { get, set, page, hasFilters, clear } = useUrlFilters();
  const schools = useDietarySchools();

  const status = get('accountStatus') as AccountStatus | '';
  const role = get('role') as AdminUserFilters['role'] | '';
  const schoolId = Number(get('dietarySchoolId')) || undefined;
  const filters: AdminUserFilters = {
    keyword: get('keyword') || undefined,
    accountStatus: status || undefined,
    role: role || undefined,
    dietarySchoolId: schoolId,
    page,
    size: PAGE_SIZE,
  };
  const users = useAdminUsers(filters);
  const items = users.data?.items ?? [];
  const total = users.data?.meta.total ?? 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Người dùng"
        description="Tra cứu tài khoản, xem nội dung và lịch sử vi phạm, xử lý kỷ luật theo thang lũy tiến."
      />

      <div className={`${CARD} grid gap-space-sm p-space-md sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]`}>
        <SearchBox
          value={get('keyword')}
          onSearch={(keyword) => set({ keyword })}
          label="Tìm theo email hoặc họ tên"
          placeholder="Email hoặc họ tên"
          maxLength={100}
          className="sm:col-span-2 lg:col-span-1"
        />
        <select aria-label="Trạng thái tài khoản" value={status} onChange={(e) => set({ accountStatus: e.target.value })} className={CONTROL}>
          <option value="">Mọi trạng thái</option>
          {ACCOUNT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ACCOUNT_STATUS[value].label}
            </option>
          ))}
        </select>
        <select aria-label="Vai trò" value={role} onChange={(e) => set({ role: e.target.value })} className={CONTROL}>
          <option value="">Mọi vai trò</option>
          {ROLES_FILTER.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABEL[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Trường phái ăn chay"
          value={schoolId ?? ''}
          onChange={(e) => set({ dietarySchoolId: e.target.value })}
          className={CONTROL}
        >
          <option value="">Mọi trường phái</option>
          {(schools.data ?? []).map((school) => (
            <option key={school.dietarySchoolId} value={school.dietarySchoolId}>
              {school.schoolName}
            </option>
          ))}
        </select>
      </div>

      {users.isPending ? (
        <TableSkeleton label="Đang tải danh sách người dùng" />
      ) : users.isError && !users.data ? (
        <AdminQueryError error={users.error} onRetry={() => void users.refetch()} retrying={users.isRefetching} />
      ) : items.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="person_search"
            title={hasFilters ? 'Không có người dùng phù hợp' : 'Chưa có người dùng'}
            description={hasFilters ? 'Thử bỏ bớt điều kiện lọc hoặc tìm bằng từ khóa khác.' : 'Tài khoản mới đăng ký sẽ hiện ở đây.'}
            action={hasFilters ? <Button variant="outline" onClick={clear}>Xóa bộ lọc</Button> : undefined}
          />
        </div>
      ) : (
        <>
          <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">
            {total} tài khoản
          </p>
          <TableShell label="Danh sách người dùng" busy={users.isPlaceholderData} minWidth="min-w-[860px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Người dùng</th>
                <th scope="col" className={TH}>Vai trò</th>
                <th scope="col" className={TH}>Trạng thái</th>
                <th scope="col" className={TH}>Trường phái</th>
                <th scope="col" className={`${TH} text-right`}>Vi phạm</th>
                <th scope="col" className={TH}>Ngày tạo</th>
                <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const info = ACCOUNT_STATUS[user.accountStatus] ?? { label: 'Không rõ', tone: 'neutral' as const };
                return (
                  <tr key={user.userId} className="hover:bg-surface-container-low">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName || user.email} src={user.avatarUrl} />
                        <div className="min-w-0">
                          <p className="font-label-md text-label-md text-on-surface">{user.fullName || 'Chưa đặt tên'}</p>
                          <p className="break-all text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>{ROLE_LABEL[user.role] ?? user.role}</td>
                    <td className={TD}>
                      <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                      {user.lockedUntil && (
                        <p className="mt-1 text-on-surface-variant">đến {formatServerDateTime(user.lockedUntil)}</p>
                      )}
                    </td>
                    <td className={TD}>{user.dietarySchoolName || <span className="text-on-surface-variant">Chưa chọn</span>}</td>
                    <td className={`${TD} text-right tabular-nums`}>{user.countViolationReports ?? 0}</td>
                    <td className={`${TD} whitespace-nowrap`}>{formatServerDateTime(user.createdAt)}</td>
                    <td className={`${TD} text-right`}>
                      <Link
                        to={PATHS.ADMIN.USER_DETAIL(user.userId)}
                        state={{ user }}
                        aria-label={`Chi tiết ${user.fullName || user.email}`}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 font-label-md text-label-md text-primary no-underline hover:bg-primary/10"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination page={page} size={PAGE_SIZE} total={total} onPageChange={(next) => set({ page: next })} />
        </>
      )}
    </div>
  );
};

export default AdminUsersPage;
