/**
 * SCR-33 · subscription/MySubscription · `/me/subscription`   (FN-SUB-04: GET /users/me/subscription, guard RequireAuth)
 * Trạng thái VIP, hạn dùng, lịch sử giao dịch từ server; hạn mức Free/VIP lấy từ `benefits` của GET /subscription-plans.
 */
import { Link } from 'react-router-dom';
import { formatDateTime, formatVnd } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { PageEmpty, PageError, PageSkeleton } from '../components/SubStates';
import { useMySubscription, usePlans } from '../hooks/useSubscription';
import { benefitRows } from '../lib/benefits';
import { GATEWAY_LABEL, statusInfo } from '../types/subscription.types';

const TONE = { ok: 'bg-primary-fixed text-on-primary-fixed', wait: 'bg-secondary-fixed text-on-secondary-fixed', bad: 'bg-error-container text-on-error-container' };

export function MySubscriptionPage() {
  const q = useMySubscription();
  const plans = usePlans();
  const d = q.data;
  const rows = benefitRows(plans.data?.benefits);
  const quotas = d?.isVip ? rows.vip : rows.free;
  const txs = [...(d?.transactions ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <main className="min-h-screen w-full bg-background pt-[72px]">
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
                {d?.isVip && d.endsAt && <p className="font-body-sm text-body-sm text-on-surface-variant">Hết hạn lúc {formatDateTime(d.endsAt)}</p>}
              </div>
              <Link to={PATHS.SUBSCRIPTION.PRICING} className="rounded-lg bg-primary-container px-5 py-2.5 text-center font-label-md text-label-md text-on-primary hover:bg-primary">{d?.isVip ? 'Gia hạn' : 'Nâng cấp VIP'}</Link>
            </section>

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
                        const s = statusInfo(t.status);
                        return (
                          <tr key={t.transactionId}>
                            <td className="px-3 py-3 font-mono">#{t.transactionId}</td>
                            <td className="px-3 py-3">{formatDateTime(t.createdAt)}</td>
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
