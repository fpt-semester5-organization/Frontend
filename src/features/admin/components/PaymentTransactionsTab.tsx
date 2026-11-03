import React, { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { AdminQueryError, CARD, CONTROL, StatusBadge, TD, TH, TableShell, TableSkeleton } from './AdminUi';
import { SearchBox } from './SearchBox';
import { useAdminPayments } from '../hooks/useAdminBilling';
import type { Tone } from '../lib/labels';
import type { AdminPaymentFilters, AdminPaymentTransaction } from '../types/admin.types';

const PAGE_SIZE = 15;

const STATUS_TONES: Record<string, Tone> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  EXPIRED: 'neutral',
  REFUNDED: 'info',
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: 'Thành công',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  REFUNDED: 'Đã hoàn tiền',
};

export const PaymentTransactionsTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [gateway, setGateway] = useState<string>('');

  const filters: AdminPaymentFilters = {
    page,
    size: PAGE_SIZE,
    keyword: keyword || undefined,
    status: status || undefined,
    gateway: gateway || undefined,
  };

  const { data, isPending, isError, error, refetch, isRefetching } = useAdminPayments(filters);

  const transactions = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-container pb-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Lịch sử giao dịch</h2>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefetching}>
          <Icon name="refresh" className={cn('text-[18px]', isRefetching && 'animate-spin')} />
          Làm mới
        </Button>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className={cn(CARD, 'grid gap-space-sm p-space-md sm:grid-cols-2 lg:grid-cols-4')}>
        <div className="sm:col-span-2">
          <SearchBox
            value={keyword}
            onSearch={(val) => {
              setKeyword(val);
              setPage(1);
            }}
            placeholder="Tìm theo email, họ tên hoặc mã giao dịch..."
            label="Tìm kiếm giao dịch"
            maxLength={100}
          />
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo trạng thái"
            className={CONTROL}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán (PENDING)</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
            <option value="EXPIRED">Hết hạn (EXPIRED)</option>
            <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
          </select>
        </div>

        <div>
          <select
            value={gateway}
            onChange={(e) => {
              setGateway(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo cổng thanh toán"
            className={CONTROL}
          >
            <option value="">Tất cả cổng thanh toán</option>
            <option value="MOMO">Ví MoMo</option>
            <option value="VIETQR">VietQR / Chuyển khoản</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách giao dịch */}
      {isPending ? (
        <TableSkeleton rows={5} label="Đang tải danh sách giao dịch" />
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : transactions.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="receipt_long"
            title="Không tìm thấy giao dịch nào"
            description="Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa để tra cứu giao dịch khác."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          <TableShell label="Danh sách giao dịch thanh toán" minWidth="min-w-[860px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Mã GD</th>
                <th scope="col" className={TH}>Khách hàng</th>
                <th scope="col" className={TH}>Gói dịch vụ</th>
                <th scope="col" className={`${TH} text-right`}>Số tiền</th>
                <th scope="col" className={TH}>Cổng</th>
                <th scope="col" className={TH}>Thời gian</th>
                <th scope="col" className={TH}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((rawTx) => {
                const tx = {
                  transactionId: rawTx.transactionId ?? (rawTx as any).TransactionId,
                  partnerTransactionCode: rawTx.partnerTransactionCode ?? (rawTx as any).PartnerTransactionCode,
                  userId: rawTx.userId ?? (rawTx as any).UserId,
                  userFullName: rawTx.userFullName ?? (rawTx as any).UserFullName,
                  userEmail: rawTx.userEmail ?? (rawTx as any).UserEmail,
                  planName: rawTx.planName ?? (rawTx as any).PlanName,
                  planDurationDays: rawTx.planDurationDays ?? (rawTx as any).PlanDurationDays,
                  amountVnd: rawTx.amountVnd ?? (rawTx as any).AmountVnd,
                  gatewayProvider: rawTx.gatewayProvider ?? (rawTx as any).GatewayProvider,
                  transactionStatus: rawTx.transactionStatus ?? (rawTx as any).TransactionStatus,
                  createdAt: rawTx.createdAt ?? (rawTx as any).CreatedAt,
                } as AdminPaymentTransaction;

                const tone = STATUS_TONES[tx.transactionStatus] || 'neutral';
                const label = STATUS_LABELS[tx.transactionStatus] || tx.transactionStatus;

                return (
                  <tr key={tx.transactionId} className="hover:bg-surface-container-low">
                    <td className={`${TD} font-mono text-body-xs font-semibold`}>
                      #{tx.transactionId}
                      {tx.partnerTransactionCode && (
                        <div className="font-sans text-[11px] text-on-surface-variant">
                          Ref: {tx.partnerTransactionCode}
                        </div>
                      )}
                    </td>
                    <td className={TD}>
                      <div className="font-label-md text-label-md font-medium text-on-surface">
                        {tx.userFullName || 'Chưa đặt tên'}
                      </div>
                      <div className="font-body-xs text-body-xs text-on-surface-variant">
                        {tx.userEmail} (ID: {tx.userId})
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="font-label-md text-label-md text-on-surface">{tx.planName}</div>
                      <div className="font-body-xs text-body-xs text-on-surface-variant">
                        {tx.planDurationDays} ngày
                      </div>
                    </td>
                    <td className={`${TD} text-right font-medium tabular-nums text-on-surface`}>
                      {formatVnd(tx.amountVnd)}
                    </td>
                    <td className={TD}>
                      <span className="rounded bg-surface-container-high px-2 py-0.5 font-label-xs text-label-xs font-semibold">
                        {tx.gatewayProvider}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-body-xs text-body-xs text-on-surface-variant`}>
                      {formatServerDateTime(tx.createdAt)}
                    </td>
                    <td className={TD}>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>

          {total > PAGE_SIZE && (
            <div className="flex justify-center">
              <Pagination
                page={page}
                size={PAGE_SIZE}
                total={total}
                onPageChange={(next) => setPage(next)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
