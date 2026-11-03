/**
 * SCR-32 · subscription/PaymentResult · `/vip/result`   (FN-SUB-04: GET /users/me/subscription, guard RequireAuth)
 * Trạng thái đọc từ SERVER (poll mỗi 3 giây khi còn PENDING, tối đa ~5 phút). Mọi tham số cổng gắn trên URL
 * (status, resultCode, signature…) bị bỏ qua; chỉ `transactionId` được dùng làm khóa tra giao dịch CỦA CHÍNH người dùng.
 * POST /payments/{gateway}/ipn là webhook cổng gọi vào server (chữ ký HMAC): giao diện không bao giờ gọi.
 * Thành công thì làm mới JWT để tài khoản chuyển từ Thành viên sang VIP ngay (D104), không phải đăng nhập lại.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { FormAlert } from '@/components/ui/forms';
import { formatVnd } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { PageError, PageSkeleton } from '../components/SubStates';
import { useMySubscription, useNow, usePlans } from '../hooks/useSubscription';
import { VIP_EXCLUSIVE_FEATURES, benefitRows } from '../lib/benefits';
import { usePublicSettings } from '@/features/system/hooks/usePublicSettings';
import { clearPendingOrder, displayStatus, formatCountdown, readPendingOrder, secondsLeft } from '../lib/pendingOrder';
import { refreshVipSessionClaims } from '../lib/sessionClaims';
import { GATEWAY_LABEL, statusInfo } from '../types/subscription.types';

const POLL_MS = 3000;
const MAX_POLLS = 100; // ~5 phút kể từ khi mở trang, để nhận kịp xác nhận trễ của cổng

const ICON: Record<'ok' | 'wait' | 'bad', { icon: string; box: string }> = {
  ok: { icon: 'check_circle', box: 'bg-primary-container text-on-primary' },
  wait: { icon: 'hourglass_top', box: 'bg-secondary-fixed text-on-secondary-fixed' },
  bad: { icon: 'error', box: 'bg-error-container text-on-error-container' },
};
const HEADING: Record<string, string> = {
  SUCCESS: 'Thanh toán thành công',
  EXPIRED: 'Đơn hàng đã hết hạn',
};
const MESSAGE: Record<string, string> = {
  SUCCESS: 'VIP đã được kích hoạt.',
  PENDING: 'Chúng tôi đang chờ xác nhận từ cổng thanh toán. Trang này sẽ cập nhật khi có kết quả.',
  FAILED: 'Giao dịch không thành công.',
  CANCELLED: 'Bạn đã hủy giao dịch.',
  EXPIRED: 'Đơn hàng đã hết hạn sau 5 phút. Vui lòng tạo đơn mới.',
  REFUNDED: 'Giao dịch đã được hoàn tiền.',
};

export function PaymentResultPage() {
  const [query] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const stored = useMemo(() => readPendingOrder(user?.userId), [user?.userId]);
  const rawId = query.get('transactionId');
  const wantedId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : stored?.transactionId;

  const polls = useRef(0);
  const [pollMs, setPollMs] = useState<number | false>(POLL_MS);
  const sub = useMySubscription({ pollMs });
  const txs = sub.data?.transactions;
  // Không có mã trong URL/đơn đã lưu: dùng giao dịch mới nhất của người dùng (dữ liệu từ server).
  const tx = useMemo(() => {
    if (!txs?.length) return undefined;
    if (wantedId !== undefined) return txs.find((t) => t.transactionId === wantedId);
    return [...txs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  }, [txs, wantedId]);
  // Vẫn kiểm tra sau khi đơn hết hạn: cổng có thể xác nhận trễ (PayOS kích hoạt VIP cho đơn EXPIRED trong 30 phút từ lúc tạo).
  const awaiting = !tx || tx.status === 'PENDING' || tx.status === 'EXPIRED';
  const [timedOut, setTimedOut] = useState(false);
  const now = useNow(awaiting);
  const order = stored?.transactionId === wantedId ? stored : null;
  // Danh sách từ server có thể chưa có đơn vừa tạo (cache): khi đó dựa vào hạn của đơn đã lưu.
  const status = tx ? displayStatus(tx, now) : order && secondsLeft(order.expiresAt, now) === 0 ? 'EXPIRED' : 'PENDING';

  useEffect(() => {
    polls.current += 1; // mỗi lần có kết quả mới (thành công hoặc lỗi) tính một lượt
    if (!awaiting) setPollMs(false);
    else if (polls.current >= MAX_POLLS) {
      setPollMs(false);
      setTimedOut(true);
    }
  }, [sub.dataUpdatedAt, sub.errorUpdatedAt, awaiting]);

  // Giao dịch thành công: làm mới JWT (role/isVip cũ vẫn là MEMBER) và dữ liệu phụ thuộc VIP.
  const synced = useRef(false);
  const [claimsFailed, setClaimsFailed] = useState(false);
  const syncClaims = useCallback(() => {
    setClaimsFailed(false);
    void refreshVipSessionClaims().then((ok) => {
      setClaimsFailed(!ok);
      clearPendingOrder();
      void qc.invalidateQueries();
    });
  }, [qc]);
  useEffect(() => {
    if (tx?.status !== 'SUCCESS' || synced.current) return;
    synced.current = true;
    syncClaims();
  }, [tx?.status, syncClaims]);
  useEffect(() => {
    if (tx && tx.status !== 'PENDING' && tx.status !== 'SUCCESS') clearPendingOrder();
  }, [tx]);

  const detail = tx ?? order;
  const info = statusInfo(status);
  const tone = ICON[info.tone];
  // Giao dịch không trả tên gói; gói hiện tại của tài khoản chỉ đúng với đơn đã thành công.
  const planName = order?.planName ?? (status === 'SUCCESS' ? sub.data?.plan?.planName : undefined);
  const plans = usePlans();
  const { data: publicSettings } = usePublicSettings();
  const vipRows = benefitRows(plans.data?.benefits, publicSettings).vip;

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-space-md px-margin-sm py-space-xl text-center">
        {sub.isLoading ? (
          <PageSkeleton />
        ) : sub.isError && !sub.data ? (
          <PageError error={sub.error} onRetry={() => void sub.refetch()} />
        ) : (
          <>
            <span className={`flex h-16 w-16 items-center justify-center rounded-full ${tone.box}`}>
              <span aria-hidden="true" className={`material-symbols-outlined text-[36px] ${status === 'PENDING' && !timedOut ? 'animate-pulse' : ''}`}>{tone.icon}</span>
            </span>
            <h1 className="font-headline-md text-headline-md text-primary" role="status">{HEADING[status] ?? (detail ? info.text : 'Đang chờ giao dịch')}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {status === 'PENDING' && !detail && sub.data ? 'Chưa thấy giao dịch nào của bạn. Nếu vừa thanh toán, hệ thống sẽ cập nhật trong giây lát.' : (MESSAGE[status] ?? MESSAGE.PENDING)}
            </p>
            {status === 'EXPIRED' && !timedOut && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Nếu bạn đã chuyển khoản trước khi đơn hết hạn, hãy giữ trang này ít phút: hệ thống có thể vẫn nhận được xác nhận từ cổng và tự kích hoạt VIP.
              </p>
            )}
            {timedOut && awaiting && (
              <p role="alert" className="rounded-lg bg-secondary-fixed px-space-md py-space-sm font-body-sm text-body-sm text-on-secondary-fixed">
                Chưa nhận được xác nhận từ cổng. Nếu bạn đã bị trừ tiền, hãy kiểm tra lại ở “Gói của tôi” hoặc liên hệ hỗ trợ kèm mã giao dịch.
              </p>
            )}
            {detail && (
              <dl className="w-full rounded-xl bg-surface-container-lowest p-space-md text-left shadow-sm">
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Mã giao dịch</dt><dd className="font-mono font-semibold">#{detail.transactionId}</dd></div>
                {planName && <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Gói</dt><dd className="font-semibold">{planName}</dd></div>}
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Cổng</dt><dd className="font-semibold">{GATEWAY_LABEL[detail.gateway] ?? detail.gateway}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Số tiền</dt><dd className="font-semibold">{formatVnd(detail.amountVnd)}</dd></div>
                {status === 'SUCCESS' && sub.data?.endsAt && <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Hiệu lực đến</dt><dd className="font-semibold">{formatServerDateTime(sub.data.endsAt)}</dd></div>}
              </dl>
            )}
            {status === 'SUCCESS' && (
              <section aria-labelledby="vip-unlocked" className="w-full rounded-xl bg-surface-container-lowest p-space-md text-left shadow-sm">
                <h2 id="vip-unlocked" className="mb-space-sm font-label-lg text-label-lg text-primary">Quyền lợi VIP đã mở khóa</h2>
                <ul className="flex flex-col gap-1.5 font-body-sm text-body-sm">
                  {vipRows.map(([label, value]) => (
                    <li key={label} className="flex items-start gap-2">
                      <Icon name="check_circle" className="text-[18px] text-primary" />
                      <span className="min-w-0 flex-1">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </li>
                  ))}
                  {VIP_EXCLUSIVE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Icon name="check_circle" className="text-[18px] text-primary" />
                      <span className="min-w-0 flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {claimsFailed && (
              <FormAlert tone="warning" className="w-full text-left" title="Chưa cập nhật được tài khoản trên thiết bị này">
                Thanh toán đã ghi nhận nhưng phiên đăng nhập chưa chuyển sang VIP.{' '}
                <button type="button" onClick={syncClaims} className="font-label-md text-label-md underline underline-offset-2">Thử lại</button>
              </FormAlert>
            )}
            {status === 'PENDING' && order && (
              <Link to={PATHS.SUBSCRIPTION.CHECKOUT(order.planId)} className="w-full rounded-lg bg-secondary px-4 py-3 font-label-md text-label-md text-on-secondary hover:opacity-90">
                Quay lại mã thanh toán (còn {formatCountdown(secondsLeft(order.expiresAt, now))})
              </Link>
            )}
            <div className="flex w-full flex-col gap-space-sm sm:flex-row">
              {timedOut && awaiting && (
                <button type="button" onClick={() => { polls.current = 0; setTimedOut(false); setPollMs(POLL_MS); }} className="flex-1 rounded-lg bg-secondary px-4 py-3 font-label-md text-label-md text-on-secondary hover:opacity-90">Kiểm tra lại</button>
              )}
              <Link to={PATHS.ME.SUBSCRIPTION} className="flex-1 rounded-lg bg-primary-container px-4 py-3 font-label-md text-label-md text-on-primary hover:bg-primary">Gói của tôi</Link>
              <Link to={status === 'SUCCESS' ? PATHS.HOME : PATHS.SUBSCRIPTION.PRICING} className="flex-1 rounded-lg bg-surface-container px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">{status === 'SUCCESS' ? 'Về trang chủ' : status === 'PENDING' ? 'Xem các gói' : 'Thử lại'}</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default PaymentResultPage;
