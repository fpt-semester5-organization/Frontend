/**
 * SCR-30 · subscription/Pricing · `/vip`   (FN-SUB-01: GET /subscription-plans, công khai)
 * Giá, thời hạn và quyền lợi lấy từ API (Admin cấu hình, BR-ADM-PAY-001); không có số liệu cứng trong giao diện.
 */
import { Link } from 'react-router-dom';
import { formatVnd } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { selectIsVip, useAuthStore } from '@/stores/auth.store';
import { PageEmpty, PageError, PageSkeleton } from '../components/SubStates';
import { useMySubscription, usePlans } from '../hooks/useSubscription';
import { benefitRows, perThirtyDays, vipTierFromPlans } from '../lib/benefits';
import { usePublicSettings } from '@/features/system/hooks/usePublicSettings';

export function PricingPage() {
  const claimVip = useAuthStore(selectIsVip);
  const signedIn = useAuthStore((s) => !!s.user);
  // Backend chặn mua gói mới khi VIP còn hiệu lực (ERR_VIP_ALREADY_ACTIVE): trạng thái lấy từ server, JWT chỉ dùng khi chưa tải xong.
  const sub = useMySubscription({ enabled: signedIn });
  const isVip = sub.data ? sub.data.isVip : claimVip;
  const vipEndsAt = sub.data?.isVip ? sub.data.endsAt : null;
  const q = usePlans();
  const { data: publicSettings } = usePublicSettings();
  const plans = (q.data?.plans ?? []).filter((p) => p.isActive).sort((a, b) => a.durationDays - b.durationDays);
  const best = plans.length > 1 ? plans.reduce((a, b) => (perThirtyDays(b.priceVnd, b.durationDays) < perThirtyDays(a.priceVnd, a.durationDays) ? b : a)) : null;
  // Quyền lợi VIP theo hạn mức của gói đang bán (cái người mua nhận được), không theo cấu hình chung
  const rows = benefitRows({ free: q.data?.benefits?.free, vip: vipTierFromPlans(plans) ?? q.data?.benefits?.vip }, publicSettings);

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-space-xl px-margin-sm py-space-xl lg:px-margin">
        <header className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg text-primary">Gói VIP</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Mở rộng hạn mức AI. Thanh toán qua MoMo hoặc VietQR.</p>
          {isVip && (
            <p role="status" className="rounded-lg bg-secondary-fixed px-space-md py-space-sm font-body-sm text-body-sm text-on-secondary-fixed">
              Bạn đang có gói VIP còn hiệu lực{vipEndsAt ? ` đến ${formatServerDateTime(vipEndsAt)}` : ''}. Bạn có thể đăng ký gói mới sau khi gói hiện tại hết hạn.{' '}
              <Link to={PATHS.ME.SUBSCRIPTION} className="font-label-md text-label-md underline underline-offset-2">
                Xem gói của tôi
              </Link>
            </p>
          )}
        </header>

        {q.isLoading ? (
          <PageSkeleton />
        ) : q.isError ? (
          <PageError error={q.error} onRetry={() => void q.refetch()} />
        ) : plans.length === 0 ? (
          <PageEmpty title="Chưa có gói đang bán" hint="Các gói VIP sẽ hiển thị ở đây khi được mở bán." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
              {plans.map((p) => {
                const featured = best?.planId === p.planId;
                return (
                  <article key={p.planId} aria-label={p.planName} className={`flex flex-col gap-space-md rounded-xl p-space-lg ${featured ? 'bg-primary-container text-on-primary shadow-md' : 'bg-surface-container-lowest shadow-sm'}`}>
                    <div>
                      <h2 className={`font-headline-sm text-headline-sm ${featured ? 'text-on-primary' : 'text-primary'}`}>{p.planName}</h2>
                      <p className={`font-body-sm text-body-sm ${featured ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>{p.durationDays} ngày</p>
                      {featured && <span className="mt-1 inline-block rounded bg-secondary-container px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-container">Tiết kiệm nhất</span>}
                    </div>
                    <div>
                      <p className="font-headline-lg text-headline-lg">{formatVnd(p.priceVnd)}</p>
                      <p className={`font-body-sm text-body-sm ${featured ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>≈ {formatVnd(perThirtyDays(p.priceVnd, p.durationDays))} / 30 ngày</p>
                    </div>
                    {isVip ? (
                      <span aria-disabled="true" className={`mt-auto cursor-not-allowed rounded-lg px-4 py-3 text-center font-label-md text-label-md opacity-60 ${featured ? 'bg-surface-container-lowest text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        Đang dùng VIP
                      </span>
                    ) : (
                      <Link to={PATHS.SUBSCRIPTION.CHECKOUT(p.planId)} className={`mt-auto rounded-lg px-4 py-3 text-center font-label-md text-label-md transition-colors ${featured ? 'bg-surface-container-lowest text-primary hover:bg-surface-container' : 'bg-primary-container text-on-primary hover:bg-primary'}`}>
                        Chọn gói
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>

            <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
              <h2 className="mb-space-sm font-headline-sm text-headline-sm text-primary">Quyền lợi VIP</h2>
              <ul className="flex flex-col gap-2">
                {rows.vip.map(([label, vip], i) => (
                  <li key={label} className="flex items-start gap-2 font-body-md text-body-md text-on-surface">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-surface-tint">check_circle</span>
                    <span>
                      {label} {vip} <span className="text-on-surface-variant">(Thành viên: {rows.free[i][1]})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default PricingPage;
