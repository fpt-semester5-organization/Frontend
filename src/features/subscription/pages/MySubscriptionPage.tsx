/**
 * SCR-33 · subscription/MySubscription · `/me/subscription`   (FN-SUB-04: GET /users/me/subscription, guard RequireAuth)
 * Trạng thái VIP, hạn dùng, lịch sử giao dịch từ server; hạn mức Free/VIP lấy từ `benefits` của GET /subscription-plans.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { PageEmpty, PageError, PageSkeleton } from '../components/SubStates';
import { useMySubscription, useNow, usePlans, useVipClaimSync } from '../hooks/useSubscription';
import { benefitRows } from '../lib/benefits';
import { displayStatus, readPendingOrder, secondsLeft } from '../lib/pendingOrder';
import { GATEWAY_LABEL, statusInfo } from '../types/subscription.types';

const PENDING_POLL_MS = 15000;
const TONE = { ok: 'bg-primary-fixed text-on-primary-fixed', wait: 'bg-secondary-fixed text-on-secondary-fixed', bad: 'bg-error-container text-on-error-container' };

export function MySubscriptionPage() {
  const [polling, setPolling] = useState(false);
  const q = useMySubscription({ pollMs: polling ? PENDING_POLL_MS : false });
  const plans = usePlans();
  const userId = useAuthStore((s) => s.user?.userId);
  const d = q.data;
  useVipClaimSync(d?.isVip);
  const rows = benefitRows(plans.data?.benefits);
  const quotas = d?.isVip ? rows.vip : rows.free;
  const txs = [...(d?.transactions ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  // Đơn đã lưu chỉ thôi theo dõi khi server báo kết thúc: danh sách có thể chưa có đơn vừa tạo (Backend cache 5 phút).
  const stored = useMemo(() => readPendingOrder(userId), [userId]);
  const storedOpen = !!stored && !txs.some((t) => t.transactionId === stored.transactionId && t.status !== 'PENDING');
  // Đơn đang chờ: tự làm mới và đổi sang Hết hạn đúng lúc, không phải tải lại trang.
  const watching = storedOpen || txs.some((t) => t.status === 'PENDING');
  useEffect(() => setPolling(watching), [watching]);
  const now = useNow(watching);
  const resumable = stored && storedOpen && secondsLeft(stored.expiresAt, now) > 0 ? stored : null;

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-space-lg px-margin-sm py-space-xl lg:px-margin">
        <h1 className="font-headline-lg text-headline-lg text-primary">Gói của tôi</h1>

        {q.isLoading ? (
          <PageSkeleton />
        ) : q.isError ? (
          <PageError error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant">{d?.isVip ? 'Đang hoạt động' : 'Chưa có gói VIP'}</p>
                <h2 className="font-headline-md text-headline-md text-primary">{d?.isVip ? (d.plan?.planName ?? 'VIP') : 'Thành viên'}</h2>
                {d?.isVip && d.endsAt && <p className="font-body-sm text-body-sm text-on-surface-variant">Hết hạn lúc {formatServerDateTime(d.endsAt)}</p>}
              </div>
              <Link to={PATHS.SUBSCRIPTION.PRICING} className="rounded-lg bg-primary-container px-5 py-2.5 text-center font-label-md text-label-md text-on-primary hover:bg-primary">{d?.isVip ? 'Gia hạn' : 'Nâng cấp VIP'}</Link>
            </section>

            {resumable && (
              <section className="flex flex-col gap-space-sm rounded-xl bg-secondary-fixed p-space-md text-on-secondary-fixed sm:flex-row sm:items-center sm:justify-between">
                <p className="font-body-md text-body-md">Đơn #{resumable.transactionId} ({resumable.planName}) đang chờ thanh toán.</p>
                <Link to={PATHS.SUBSCRIPTION.CHECKOUT(resumable.planId)} className="rounded-lg bg-secondary px-4 py-2 text-center font-label-md text-label-md text-on-secondary hover:opacity-90">Tiếp tục thanh toán</Link>
              </section>
            )}

            <section aria-label="Hạn mức hiện tại" className="grid grid-cols-1 gap-gutter sm:grid-cols-3">
              {quotas.map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                  <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
                  <p className="font-headline-sm text-headline-sm text-primary">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
              <h2 className="px-space-lg pt-space-lg font-headline-sm text-headline-sm text-primary">Lịch sử giao dịch</h2>
              {txs.length === 0 ? (
                <PageEmpty title="Chưa có giao dịch" hint="Các lần nâng cấp VIP của bạn sẽ hiển thị ở đây." />
              ) : (
                <div className="overflow-x-auto p-space-sm">
                  <table className="w-full min-w-[560px] text-left font-body-sm text-body-sm">
                    <thead className="font-label-sm text-label-sm text-on-surface-variant">
                      <tr>{['Mã', 'Ngày', 'Cổng', 'Số tiền', 'Trạng thái'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {txs.map((t) => {
                        const s = statusInfo(displayStatus(t, now));
                        return (
                          <tr key={t.transactionId}>
                            <td className="px-3 py-3 font-mono">#{t.transactionId}</td>
                            <td className="px-3 py-3">{formatServerDateTime(t.createdAt)}</td>
                            <td className="px-3 py-3">{GATEWAY_LABEL[t.gateway] ?? t.gateway}</td>
                            <td className="px-3 py-3 font-semibold">{formatVnd(t.amountVnd)}</td>
                            <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-0.5 font-label-sm text-label-sm ${TONE[s.tone]}`}>{s.text}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default MySubscriptionPage;
