import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { PROVINCES } from '@/constants/provinces';
import { cn } from '@/lib/cn';
import { notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { FormRow } from '../components/FormDialog';
import { SearchBox } from '../components/SearchBox';
import { useAdminVenues, useSyncVenues, useToggleVenue } from '../hooks/useAdminVenues';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { VENUE_SOURCE_LABEL, venueSourceLabel } from '../lib/labels';
import { handleWriteError } from '../lib/writeError';
import type { AdminVenue, VenueSource } from '../types/admin.types';

const PAGE_SIZE = 20;

/**
 * SCR-45 admin/Venues · `/admin/venues` — FN-ADM-14.
 * Quán chỉ lấy từ Google Places/HappyCow (BR-ADM-MAP-001): Admin không sửa nội dung, chỉ ẩn/hiện lại và xếp job đồng bộ nguồn.
 */
const AdminVenuesPage: React.FC = () => {
  const { get, set, page, hasFilters, clear } = useUrlFilters();
  const active = get('isActive');
  const source = get('source') as VenueSource | '';
  const list = useAdminVenues({
    keyword: get('keyword') || undefined,
    source: source || undefined,
    isActive: active === 'true' ? true : active === 'false' ? false : undefined,
    page,
    size: PAGE_SIZE,
  });
  const toggle = useToggleVenue();
  const [target, setTarget] = useState<AdminVenue | null>(null);
  const items = list.data?.items ?? [];
  const total = list.data?.meta.total ?? 0;

  const confirmToggle = () => {
    if (!target) return;
    toggle.mutate(
      { id: target.venueId, isActive: !target.isActive },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || (target.isActive ? 'Đã ẩn quán.' : 'Đã hiện lại quán.'));
          setTarget(null);
        },
        onError: (error) => {
          handleWriteError(error);
          setTarget(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Quán chay"
        description="Ẩn những quán sai địa chỉ, đã ngừng hoạt động hoặc không phục vụ món chay; hiện lại khi thông tin đã đúng."
      />

      <SyncCard />

      <div className={cn(CARD, 'grid gap-space-sm p-space-md sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]')}>
        <SearchBox
          value={get('keyword')}
          onSearch={(keyword) => set({ keyword })}
          label="Tìm quán theo tên"
          placeholder="Tên quán"
          maxLength={150}
          className="sm:col-span-2 lg:col-span-1"
        />
        <select aria-label="Trạng thái hiển thị" value={active} onChange={(e) => set({ isActive: e.target.value })} className={CONTROL}>
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang hiển thị</option>
          <option value="false">Đang ẩn</option>
        </select>
        <select aria-label="Nguồn dữ liệu" value={source} onChange={(e) => set({ source: e.target.value })} className={CONTROL}>
          <option value="">Mọi nguồn</option>
          {(Object.keys(VENUE_SOURCE_LABEL) as VenueSource[]).map((value) => (
            <option key={value} value={value}>
              {VENUE_SOURCE_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      {list.isPending ? (
        <TableSkeleton label="Đang tải danh sách quán" />
      ) : list.isError && !list.data ? (
        <AdminQueryError error={list.error} onRetry={() => void list.refetch()} retrying={list.isRefetching} />
      ) : items.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="storefront"
            title={hasFilters ? 'Không có quán phù hợp' : 'Chưa có quán nào trong hệ thống'}
            description={hasFilters ? 'Thử từ khóa khác hoặc bỏ bớt bộ lọc.' : 'Xếp job đồng bộ theo tỉnh/thành ở trên để lấy quán từ nguồn dữ liệu.'}
            action={hasFilters ? <Button variant="outline" onClick={clear}>Xóa bộ lọc</Button> : undefined}
          />
        </div>
      ) : (
        <>
          <TableShell label="Danh sách quán chay" busy={list.isPlaceholderData}>
            <thead>
              <tr>
                <th scope="col" className={TH}>Quán</th>
                <th scope="col" className={TH}>Nguồn</th>
                <th scope="col" className={TH}>Hiển thị</th>
                <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((venue) => (
                <tr key={venue.venueId} className="hover:bg-surface-container-low">
                  <td className={TD}>
                    {venue.isActive ? (
                      <Link to={PATHS.VENUES.DETAIL(venue.venueId)} target="_blank" rel="noopener noreferrer" className="font-label-md text-label-md text-primary underline-offset-2 hover:underline">
                        {venue.name}
                      </Link>
                    ) : (
                      <span className="font-label-md text-label-md">{venue.name}</span>
                    )}
                    <p className="text-on-surface-variant">#{venue.venueId}</p>
                  </td>
                  <td className={TD}>{venueSourceLabel(venue.source)}</td>
                  <td className={TD}>
                    <StatusBadge tone={venue.isActive ? 'success' : 'neutral'} icon={venue.isActive ? 'visibility' : 'visibility_off'}>
                      {venue.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                    </StatusBadge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <Button
                      variant={venue.isActive ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => setTarget(venue)}
                      aria-label={`${venue.isActive ? 'Ẩn quán' : 'Hiện lại'} ${venue.name}`}
                    >
                      {venue.isActive ? 'Ẩn quán' : 'Hiện lại'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination page={page} size={PAGE_SIZE} total={total} onPageChange={(next) => set({ page: next })} />
        </>
      )}

      <ConfirmDialog
        show={!!target}
        title={target?.isActive ? 'Ẩn quán khỏi bản đồ?' : 'Hiện lại quán?'}
        message={
          target?.isActive
            ? `"${target.name}" sẽ biến mất khỏi bản đồ, kết quả tìm kiếm và gợi ý quán; ai mở link chi tiết quán sẽ thấy "Không tìm thấy". Có thể hiện lại bất cứ lúc nào.`
            : `"${target?.name ?? ''}" sẽ xuất hiện lại trên bản đồ, kết quả tìm kiếm và gợi ý quán.`
        }
        confirmLabel={target?.isActive ? 'Ẩn quán' : 'Hiện lại'}
        danger={!!target?.isActive}
        loading={toggle.isPending}
        onConfirm={confirmToggle}
        onCancel={() => !toggle.isPending && setTarget(null)}
      />
    </div>
  );
};

/** POST /admin/venues/sync: xếp job đồng bộ quán theo tỉnh/thành; 503 khi nguồn ngoài không phản hồi (banner do http.ts hiện). */
const SyncCard: React.FC = () => {
  const sync = useSyncVenues();
  const [province, setProvince] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!province) {
      setError('Chọn tỉnh/thành cần đồng bộ.');
      return;
    }
    setError(null);
    sync.mutate(province, {
      onSuccess: (res) => {
        notifySuccess(res.message || 'Đã xếp job đồng bộ.');
        setJobId(res.data.jobId);
      },
      onError: (err) => {
        const apiError = handleWriteError(err);
        if (apiError.status === 400) setError(apiError.message || 'Tỉnh/thành không hợp lệ.');
      },
    });
  };

  return (
    <section aria-labelledby="sync-title" className={cn(CARD, 'flex flex-col gap-space-sm p-space-md')}>
      <h2 id="sync-title" className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface">
        <Icon name="sync" className="text-[20px] text-primary" />
        Đồng bộ quán từ nguồn
      </h2>
      <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-space-sm">
        <div className="min-w-[220px] flex-1">
          <FormRow id="sync-province" label="Tỉnh/thành" required error={error ?? undefined}>
            <select
              id="sync-province"
              value={province}
              aria-invalid={!!error}
              onChange={(e) => {
                setProvince(e.target.value);
                setError(null);
              }}
              className={CONTROL}
            >
              <option value="">Chọn tỉnh/thành</option>
              {PROVINCES.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormRow>
        </div>
        <Button type="submit" loading={sync.isPending}>
          Xếp job đồng bộ
        </Button>
      </form>
      {jobId && (
        <FormAlert tone="success">
          Đã xếp job <span className="font-label-md text-label-md">{jobId}</span>. Danh sách quán sẽ cập nhật khi job chạy xong.
        </FormAlert>
      )}
    </section>
  );
};

export default AdminVenuesPage;
