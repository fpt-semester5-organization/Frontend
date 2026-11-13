import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell } from './AdminUi';
import { LlmopsLogDetailSheet } from './LlmopsLogDetailSheet';
import { useLlmopsLogs } from '../hooks/useAdminAi';
import { FEATURE_LABEL, featureLabel, llmopsStatusLabel } from '../lib/labels';
import { formatTokens, formatUsd } from '../lib/llmops';
import type { LlmopsLogItem } from '../types/admin.types';

const PAGE_SIZE = 15;

interface LlmopsLogTableProps {
  from: string;
  to: string;
}

export const LlmopsLogTable: React.FC<LlmopsLogTableProps> = ({ from, to }) => {
  const [feature, setFeature] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<LlmopsLogItem | null>(null);

  // Gọi hook API
  const logs = useLlmopsLogs({
    from,
    to,
    feature: feature || undefined,
    status: status || undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFeature('');
    setStatus('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(feature || status || debouncedSearch);

  return (
    <div className={cn(CARD, 'flex flex-col gap-space-md p-space-md sm:p-space-lg')}>
      {/* Tiêu đề & Mô tả */}
      <div className="flex flex-col gap-1">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          Nhật ký truy vấn API AI
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Tra cứu chi tiết từng lượt truy vấn API AI, mức tiêu thụ token, chi phí và thông tin lỗi hệ thống.
        </p>
      </div>

      {/* Bộ lọc thanh công cụ (Faceted Filter) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="flex min-w-[240px] flex-1 items-center gap-2">
          <div className="relative w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email hoặc lỗi..."
              aria-label="Tìm kiếm nhật ký"
              className={cn(CONTROL, 'pl-9 text-body-sm')}
            />
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                aria-label="Xóa từ khóa"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" className="shrink-0">
            Tìm
          </Button>
        </form>

        {/* Lọc tính năng */}
        <label className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span className="shrink-0">Tính năng:</span>
          <select
            value={feature}
            onChange={(e) => {
              setFeature(e.target.value);
              setPage(1);
            }}
            className={cn(CONTROL, 'w-[180px] text-body-sm')}
            aria-label="Lọc theo tính năng"
          >
            <option value="">Tất cả tính năng</option>
            {Object.keys(FEATURE_LABEL).map((code) => (
              <option key={code} value={code}>
                {FEATURE_LABEL[code]}
              </option>
            ))}
          </select>
        </label>

        {/* Lọc trạng thái */}
        <label className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span className="shrink-0">Trạng thái:</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={cn(CONTROL, 'w-[160px] text-body-sm')}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công</option>
            <option value="QUOTA_EXCEEDED">Hết hạn mức</option>
            <option value="ERROR">Lỗi hệ thống</option>
          </select>
        </label>

        {/* Nút Xóa bộ lọc */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="restart_alt" className="text-[18px]" />
            Đặt lại
          </Button>
        )}
      </div>

      {/* Trạng thái lỗi tải dữ liệu */}
      {logs.isError && (
        <AdminQueryError
          error={logs.error}
          onRetry={() => void logs.refetch()}
          retrying={logs.isRefetching}
        />
      )}

      {/* Bảng dữ liệu */}
      {logs.isPending ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : logs.data?.items.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="Không tìm thấy nhật ký"
          description={
            hasActiveFilters
              ? 'Không có yêu cầu nào khớp với bộ lọc hiện tại. Thử xóa hoặc thay đổi điều kiện lọc.'
              : 'Chưa có lượt truy vấn API AI nào phát sinh trong khoảng thời gian đã chọn.'
          }
        />
      ) : (
        <>
          <TableShell
            label="Nhật ký truy vấn API AI"
            busy={logs.isPlaceholderData}
            minWidth="min-w-[800px]"
          >
            <thead>
              <tr className="bg-surface-container-low/50">
                <th scope="col" className={TH}>
                  Thời gian
                </th>
                <th scope="col" className={TH}>
                  Người thực hiện
                </th>
                <th scope="col" className={TH}>
                  Tính năng
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Token
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Chi phí
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Độ trễ
                </th>
                <th scope="col" className={TH}>
                  Trạng thái
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.data?.items.map((item) => {
                const statusInfo = llmopsStatusLabel(item.requestStatus);
                const isVip = item.userRole?.toUpperCase() === 'VIP';
                const isAdmin = item.userRole?.toUpperCase() === 'ADMIN';

                return (
                  <tr
                    key={item.logId}
                    onClick={() => setSelectedLog(item)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-surface-container-low/60',
                      selectedLog?.logId === item.logId && 'bg-primary/5 hover:bg-primary/10'
                    )}
                  >
                    {/* Thời gian */}
                    <td className={`${TD} whitespace-nowrap font-mono text-body-xs`}>
                      {formatServerDateTime(item.createdAt)}
                    </td>

                    {/* Người thực hiện */}
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={item.userFullName || `User #${item.userId}`}
                          src={item.userAvatarUrl}
                          size="sm"
                          className="shrink-0 ring-1 ring-surface-container"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {item.userId > 0 ? (
                              <Link
                                to={PATHS.ADMIN.USER_DETAIL(item.userId)}
                                onClick={(e) => e.stopPropagation()}
                                className="font-label-md text-label-md font-semibold text-primary hover:underline truncate"
                              >
                                {item.userFullName || `User #${item.userId}`}
                              </Link>
                            ) : (
                              <span className="font-label-md text-label-md font-semibold text-on-surface">
                                {item.userFullName || 'Hệ thống'}
                              </span>
                            )}
                            <StatusBadge
                              tone={isVip ? 'wait' : isAdmin ? 'info' : 'neutral'}
                              className="text-[10px]"
                            >
                              {item.userRole || 'MEMBER'}
                            </StatusBadge>
                          </div>
                          <span className="font-body-xs text-body-xs text-on-surface-variant truncate">
                            {item.userEmail || '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tính năng */}
                    <td className={TD}>
                      <span className="font-body-sm font-medium text-on-surface">
                        {featureLabel(item.featureCode)}
                      </span>
                    </td>

                    {/* Tokens */}
                    <td className={`${TD} text-right font-mono tabular-nums`}>
                      {formatNumber(item.tokensConsumed)}
                    </td>

                    {/* Chi phí */}
                    <td className={`${TD} text-right font-mono font-semibold tabular-nums text-on-surface`}>
                      {formatUsd(item.costEstimateUsd)}
                    </td>

                    {/* Độ trễ */}
                    <td className={`${TD} text-right font-mono tabular-nums text-on-surface-variant`}>
                      {item.executionTimeMs > 0 ? `${formatNumber(item.executionTimeMs)} ms` : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td className={TD}>
                      <StatusBadge tone={statusInfo.tone}>
                        {statusInfo.label}
                      </StatusBadge>
                    </td>

                    {/* Hành động */}
                    <td className={`${TD} text-right`}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(item);
                        }}
                        className="h-8 px-2 text-primary hover:bg-primary/10"
                        aria-label={`Xem chi tiết lượt truy vấn ${item.logId}`}
                      >
                        <Icon name="visibility" className="text-[18px]" />
                        <span className="sr-only">Xem chi tiết</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>

          {/* Phân trang */}
          {logs.data && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="font-body-xs text-body-xs text-on-surface-variant">
                Hiển thị {(logs.data.page - 1) * logs.data.pageSize + 1} -{' '}
                {Math.min(logs.data.page * logs.data.pageSize, logs.data.total)} trên tổng số{' '}
                <span className="font-semibold text-on-surface">{formatNumber(logs.data.total)}</span> lượt truy vấn
              </p>
              <Pagination
                page={logs.data.page}
                size={logs.data.pageSize}
                total={logs.data.total}
                onPageChange={(next) => setPage(next)}
              />
            </div>
          )}
        </>
      )}

      {/* Modal Dialog Chi tiết lượt truy vấn API AI căn giữa màn hình */}
      <LlmopsLogDetailSheet
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
