/**
 * SCR-32 · subscription/PaymentResult · `/vip/result`   (FN-SUB-04: GET /users/me/subscription, guard RequireAuth)
 * Trạng thái đọc từ SERVER (poll mỗi 3 giây khi còn PENDING, tối đa ~5 phút). Mọi tham số cổng gắn trên URL
 * (status, resultCode, signature…) bị bỏ qua; chỉ `transactionId` được dùng làm khóa tra giao dịch CỦA CHÍNH người dùng.
 * POST /payments/{gateway}/ipn là webhook cổng gọi vào server (chữ ký HMAC): giao diện không bao giờ gọi.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime, formatVnd } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { PageError, PageSkeleton } from '../components/SubStates';
import { useMySubscription } from '../hooks/useSubscription';
import { clearPendingOrder, readPendingOrder } from '../lib/pendingOrder';
import { refreshVipSessionClaims } from '../lib/sessionClaims';
import { GATEWAY_LABEL, statusInfo } from '../types/subscription.types';

const POLL_MS = 3000;
const MAX_POLLS = 100; // ~5 phút: hơn thời hạn đơn (5 phút) để job EXPIRED kịp chạy

const ICON: Record<'ok' | 'wait' | 'bad', { icon: string; box: string }> = {
  ok: { icon: 'check_circle', box: 'bg-primary-container text-on-primary' },
  wait: { icon: 'hourglass_top', box: 'bg-secondary-fixed text-on-secondary-fixed' },
  bad: { icon: 'error', box: 'bg-error-container text-on-error-container' },
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
  // Không có mã trong URL/sessionStorage: dùng giao dịch mới nhất của người dùng (dữ liệu từ server).
  const tx = useMemo(() => {
    if (!txs?.length) return undefined;
    if (wantedId !== undefined) return txs.find((t) => t.transactionId === wantedId);
    return [...txs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  }, [txs, wantedId]);
  const pending = !tx || tx.status === 'PENDING';
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    polls.current += 1; // mỗi lần có kết quả mới (thành công hoặc lỗi) tính một lượt
    if (!pending) setPollMs(false);
    else if (polls.current >= MAX_POLLS) {
      setPollMs(false);
      setTimedOut(true);
    }
  }, [sub.dataUpdatedAt, sub.errorUpdatedAt, pending]);

  // Giao dịch thành công: làm mới JWT (role/isVip cũ vẫn là MEMBER) và dữ liệu phụ thuộc VIP.
  const synced = useRef(false);
  useEffect(() => {
    if (tx?.status !== 'SUCCESS' || synced.current) return;
    synced.current = true;
    void refreshVipSessionClaims().then(() => {
      clearPendingOrder();
      void qc.invalidateQueries();
    });
  }, [tx?.status, qc]);
  useEffect(() => {
    if (tx && tx.status !== 'PENDING' && tx.status !== 'SUCCESS') clearPendingOrder();
  }, [tx]);

  const info = tx ? statusInfo(tx.status) : statusInfo('PENDING');
  const tone = ICON[info.tone];
  const status = tx?.status ?? 'PENDING';
  const planName = stored && tx && stored.transactionId === tx.transactionId ? stored.planName : sub.data?.plan?.planName;

  return (
    <main className="min-h-screen w-full bg-background pt-[72px]">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-space-md px-margin-sm py-space-xl text-center">
        {sub.isLoading ? (
          <PageSkeleton />
        ) : sub.isError && !sub.data ? (
          <PageError error={sub.error} onRetry={() => void sub.refetch()} />
        ) : (
          <>
            <span className={`flex h-16 w-16 items-center justify-center rounded-full ${tone.box}`}>
              <span className={`material-symbols-outlined text-[36px] ${pending && !timedOut ? 'animate-pulse' : ''}`}>{tone.icon}</span>
            </span>
            <h1 className="font-headline-md text-headline-md text-primary" role="status">{tx ? info.text : 'Đang chờ giao dịch'}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {!tx && sub.data ? 'Chưa thấy giao dịch nào của bạn. Nếu vừa thanh toán, hệ thống sẽ cập nhật trong giây lát.' : (MESSAGE[status] ?? MESSAGE.PENDING)}
            </p>
            {timedOut && pending && (
              <p role="alert" className="rounded-lg bg-secondary-fixed px-space-md py-space-sm font-body-sm text-body-sm text-on-secondary-fixed">
                Chưa nhận được xác nhận từ cổng. Nếu bạn đã bị trừ tiền, hãy kiểm tra lại ở “Gói của tôi” hoặc liên hệ hỗ trợ kèm mã giao dịch.
              </p>
            )}
            {tx && (
              <dl className="w-full rounded-xl bg-surface-container-lowest p-space-md text-left shadow-sm">
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Mã giao dịch</dt><dd className="font-mono font-semibold">#{tx.transactionId}</dd></div>
                {planName && <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Gói</dt><dd className="font-semibold">{planName}</dd></div>}
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Cổng</dt><dd className="font-semibold">{GATEWAY_LABEL[tx.gateway] ?? tx.gateway}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Số tiền</dt><dd className="font-semibold">{formatVnd(tx.amountVnd)}</dd></div>
                {tx.status === 'SUCCESS' && sub.data?.endsAt && <div className="flex justify-between py-1.5"><dt className="text-on-surface-variant">Hiệu lực đến</dt><dd className="font-semibold">{formatDateTime(sub.data.endsAt)}</dd></div>}
              </dl>
            )}
            <div className="flex w-full flex-col gap-space-sm sm:flex-row">
              {timedOut && pending && (
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
