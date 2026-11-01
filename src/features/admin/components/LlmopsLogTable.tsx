import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell } from './AdminUi';
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
          Nhật ký cuộc gọi AI (Request Logs)
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Tra cứu chi tiết từng lượt gọi AI, mức tiêu thụ token, chi phí và thông tin lỗi hệ thống.
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
              : 'Chưa có lượt gọi AI nào phát sinh trong khoảng thời gian đã chọn.'
          }
        />
      ) : (
        <>
          <TableShell
            label="Nhật ký cuộc gọi AI"
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
                    className="transition-colors hover:bg-surface-container-lowest"
                  >
                    {/* Thời gian */}
                    <td className={`${TD} whitespace-nowrap font-mono text-body-xs`}>
                      {formatServerDateTime(item.createdAt)}
                    </td>

                    {/* Người thực hiện */}
                    <td className={TD}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {item.userId > 0 ? (
                            <Link
                              to={PATHS.ADMIN.USER_DETAIL(item.userId)}
                              className="font-label-md text-label-md font-semibold text-primary hover:underline"
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
                        <span className="font-body-xs text-body-xs text-on-surface-variant">
                          {item.userEmail || '—'}
                        </span>
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
                        onClick={() => setSelectedLog(item)}
                        className="h-8 px-2 text-primary hover:bg-primary/10"
                        aria-label={`Xem chi tiết lượt gọi ${item.logId}`}
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
                <span className="font-semibold text-on-surface">{formatNumber(logs.data.total)}</span> lượt gọi
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

      {/* Modal Chi tiết bản ghi gọi AI */}
      <Modal
        show={Boolean(selectedLog)}
        onHide={() => setSelectedLog(null)}
        title={
          <div className="flex items-center gap-2">
            <Icon name="info" className="text-primary text-[22px]" />
            <span>Chi tiết lượt gọi AI #{selectedLog?.logId}</span>
          </div>
        }
        size="lg"
      >
        {selectedLog && (
          <div className="flex flex-col gap-space-md">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Thời gian thực thi</span>
                <span className="font-body-sm font-semibold text-on-surface">
                  {formatServerDateTime(selectedLog.createdAt)}
                </span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Trạng thái</span>
                <div className="mt-1">
                  <StatusBadge tone={llmopsStatusLabel(selectedLog.requestStatus).tone}>
                    {llmopsStatusLabel(selectedLog.requestStatus).label}
                  </StatusBadge>
                </div>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Người thực hiện</span>
                <span className="font-body-sm font-semibold text-on-surface">
                  {selectedLog.userFullName || `User #${selectedLog.userId}`}
                </span>
                <span className="font-body-xs text-on-surface-variant">{selectedLog.userEmail} ({selectedLog.userRole})</span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tính năng AI</span>
                <span className="font-body-sm font-semibold text-on-surface">
                  {featureLabel(selectedLog.featureCode)} ({selectedLog.featureCode})
                </span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Token tiêu thụ</span>
                <span className="font-body-sm font-semibold text-on-surface">
                  {formatNumber(selectedLog.tokensConsumed)} token (~ {formatTokens(selectedLog.tokensConsumed)})
                </span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Chi phí ước tính</span>
                <span className="font-body-sm font-semibold text-secondary">
                  {formatUsd(selectedLog.costEstimateUsd)}
                </span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Thời gian xử lý</span>
                <span className="font-body-sm font-semibold text-on-surface">
                  {selectedLog.executionTimeMs} ms
                </span>
              </div>

              <div className="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Mã bản ghi (Log ID)</span>
                <span className="font-mono text-body-sm text-on-surface">
                  {selectedLog.logId}
                </span>
              </div>
            </div>

            {/* Chi tiết lỗi nếu có */}
            {selectedLog.errorMessage && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-error/30 bg-error-container/40 p-3">
                <span className="flex items-center gap-1.5 font-label-md text-label-md font-semibold text-on-error-container">
                  <Icon name="error" className="text-[18px] text-error" />
                  Thông báo lỗi hệ thống
                </span>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-container-lowest p-2.5 font-mono text-body-xs text-on-error-container border border-error/20">
                  {selectedLog.errorMessage}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
