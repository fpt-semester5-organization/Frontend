/**
 * SCR-31 · subscription/Checkout · `/vip/checkout/:planId`   (FN-SUB-02: POST /subscriptions/checkout, guard RequireAuth)
 * Tạo đơn khi người dùng bấm thanh toán (cổng là trường của form), đếm ngược theo `expiresAt` của server (5 phút, BR-PAY-TXN-01).
 * Kết quả thanh toán do webhook IPN quyết định: trang này chỉ theo dõi GET /users/me/subscription, không tin tham số từ cổng.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiErrorCode, apiErrorMessage, apiErrorStatus, apiFieldErrors } from '@/api/http';
import { Modal } from '@/components/ui/Modal';
import { FormAlert } from '@/components/ui/forms';
import { formatVnd } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { selectIsVip, useAuthStore } from '@/stores/auth.store';
import { toast, useUiStore } from '@/stores/ui.store';
import { PageEmpty, PageError, PageSkeleton } from '../components/SubStates';
import { useCheckout, useMySubscription, usePlans } from '../hooks/useSubscription';
import { isQrImageUrl, readPendingOrder, safePayUrl, savePendingOrder, type PendingOrder } from '../lib/pendingOrder';
import { checkoutSchema, parsePlanId, type CheckoutForm } from '../schemas/checkout.schemas';
import type { Gateway } from '../types/subscription.types';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function useCountdown(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000)) : null;
}

export function CheckoutPage() {
  const planId = parsePlanId(useParams().planId);
  const plans = usePlans();
  const plan = plans.data?.plans.find((p) => p.planId === planId && p.isActive);
  const user = useAuthStore((s) => s.user);
  const isVip = useAuthStore(selectIsVip);
  const [order, setOrder] = useState<PendingOrder | null>(() => {
    const saved = readPendingOrder(user?.userId);
    return saved && saved.planId === planId && new Date(saved.expiresAt).getTime() > Date.now() ? saved : null;
  });

  return (
    <main className="min-h-screen w-full bg-background pt-[72px]">
      <div className="mx-auto w-full max-w-[1000px] px-margin-sm py-space-xl lg:px-margin">
        {plans.isLoading ? (
          <PageSkeleton />
        ) : plans.isError ? (
          <PageError error={plans.error} onRetry={() => void plans.refetch()} />
        ) : !planId || !plan ? (
          <PageEmpty title="Không tìm thấy gói" hint="Gói không tồn tại hoặc đã ngừng bán (ERR_PLAN_NOT_FOUND).">
            <Link to={PATHS.SUBSCRIPTION.PRICING} className="mt-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary">Xem các gói VIP</Link>
          </PageEmpty>
        ) : (
          <div className="grid w-full grid-cols-1 gap-gutter lg:grid-cols-5">
            {order ? <PayPanel order={order} onExpired={() => setOrder(null)} /> : <GatewayForm planId={plan.planId} planName={plan.planName} onCreated={setOrder} />}
            <aside className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-2">
              <h2 className="font-headline-sm text-headline-sm text-primary">Đơn hàng</h2>
              <div className="flex items-baseline justify-between">
                <span className="font-body-md text-body-md">{plan.planName}</span>
                <span className="font-headline-sm text-headline-sm text-primary">{formatVnd(plan.priceVnd)}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Tài khoản: {user?.email}
                {isVip ? ', đang là VIP, thời hạn mới được cộng dồn' : ''}
              </p>
              <Link to={PATHS.SUBSCRIPTION.PRICING} className="text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Chọn gói khác</Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- Bước 1: chọn cổng + tạo đơn ---------- */
function GatewayForm({ planId, planName, onCreated }: { planId: number; planName: string; onCreated: (o: PendingOrder) => void }) {
  const user = useAuthStore((s) => s.user);
  const checkout = useCheckout();
  const { setValue, watch, handleSubmit, formState } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { planId, gateway: 'VIETQR' } });
  const gateway = watch('gateway');
  const [pendingDialog, setPendingDialog] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = handleSubmit((v) => {
    setFormError(null);
    checkout.mutate(v, {
      onSuccess: (res) => {
        const order: PendingOrder = { ...res, planId, planName, gateway: v.gateway, userId: user?.userId ?? 0 };
        savePendingOrder(order); // lưu TRƯỚC khi chuyển sang cổng để trang kết quả biết transactionId
        toast.success('Đã tạo đơn thanh toán.');
        onCreated(order);
        const url = safePayUrl(res.payUrl);
        if (v.gateway === 'MOMO' && url) window.location.assign(url);
      },
      onError: (e) => {
        const code = apiErrorCode(e);
        if (code === 'ERR_PAYMENT_PENDING_EXISTS') setPendingDialog(apiErrorMessage(e));
        else if (code === 'ERR_EXT_GATEWAY_FAILED') {
          useUiStore.getState().setServiceBanner('Dịch vụ tạm gián đoạn, vui lòng thử lại sau.');
          setFormError(apiErrorMessage(e));
        } else if (code === 'ERR_VALIDATION') setFormError(Object.values(apiFieldErrors(e)).join(' ') || apiErrorMessage(e));
        else if (code === 'ERR_PLAN_NOT_FOUND') setFormError(apiErrorMessage(e));
        else {
          const status = apiErrorStatus(e);
          if (status && status < 500 && !/^ERR_GUEST_/.test(code ?? '')) setFormError(apiErrorMessage(e));
        }
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-3">
      <h1 className="font-headline-md text-headline-md text-primary">Thanh toán</h1>
      <div className="grid grid-cols-2 gap-space-sm" role="radiogroup" aria-label="Cổng thanh toán">
        {([['VIETQR', 'VietQR'], ['MOMO', 'MoMo']] as [Gateway, string][]).map(([g, label]) => (
          <button key={g} type="button" role="radio" aria-checked={gateway === g} onClick={() => setValue('gateway', g)} className={`rounded-lg px-4 py-3 font-label-md text-label-md transition-colors ${gateway === g ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>
            {label}
          </button>
        ))}
      </div>
      {formState.errors.gateway && <p role="alert" className="font-label-sm text-label-sm text-error">{formState.errors.gateway.message}</p>}
      {formError && <FormAlert>{formError}</FormAlert>}
      <p className="font-label-sm text-label-sm text-on-surface-variant">Đơn có hiệu lực 5 phút. Hệ thống tự kích hoạt VIP sau khi nhận xác nhận từ cổng thanh toán.</p>
      <button type="submit" disabled={checkout.isPending} className="flex items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 font-label-md text-label-md text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60">
        {checkout.isPending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
        {gateway === 'MOMO' ? 'Thanh toán bằng MoMo' : 'Tạo mã VietQR'}
      </button>

      <Modal show={pendingDialog !== null} onHide={() => setPendingDialog(null)} title="Đang có đơn chờ thanh toán" size="sm">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{pendingDialog}</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPendingDialog(null)} className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">Đóng</button>
            <button type="button" onClick={() => navigate(PATHS.SUBSCRIPTION.RESULT)} className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary hover:bg-primary">Xem trạng thái đơn</button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

/* ---------- Bước 2: hiển thị đơn, theo dõi kết quả ---------- */
function PayPanel({ order, onExpired }: { order: PendingOrder; onExpired: () => void }) {
  const navigate = useNavigate();
  const left = useCountdown(order.expiresAt);
  const sub = useMySubscription({ pollMs: 3000 });
  const tx = useMemo(() => sub.data?.transactions.find((t) => t.transactionId === order.transactionId), [sub.data, order.transactionId]);
  const url = safePayUrl(order.payUrl);
  const qrImg = order.gateway === 'VIETQR' && isQrImageUrl(order.payUrl);
  const result = `${PATHS.SUBSCRIPTION.RESULT}?transactionId=${order.transactionId}`;

  // Cổng đã báo (IPN) hoặc đơn hết hạn: chuyển sang trang kết quả đọc trạng thái từ server.
  useEffect(() => {
    if (tx && tx.status !== 'PENDING') navigate(result, { replace: true });
  }, [tx, navigate, result]);
  useEffect(() => {
    if (left === 0) navigate(result, { replace: true });
  }, [left, navigate, result]);

  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success('Đã sao chép'), () => toast.error('Không sao chép được'));

  return (
    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-3" aria-live="polite">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary">{order.gateway === 'MOMO' ? 'Thanh toán MoMo' : 'Thanh toán VietQR'}</h1>
        {left !== null && (
          <span className={`rounded-full px-3 py-1 font-label-md text-label-md ${left < 60 ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed'}`}>Hết hạn sau {mmss(left)}</span>
        )}
      </div>
      <dl className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-space-md font-body-sm text-body-sm">
        <div><dt className="text-on-surface-variant">Số tiền</dt><dd className="font-headline-sm text-headline-sm text-primary">{formatVnd(order.amountVnd)}</dd></div>
        <div>
          <dt className="text-on-surface-variant">Mã đơn hàng</dt>
          <dd className="flex items-center gap-2 font-mono font-semibold text-secondary">
            {order.orderCode}
            <button type="button" aria-label="Sao chép mã đơn" onClick={() => copy(order.orderCode)} className="text-outline hover:text-on-surface"><span className="material-symbols-outlined text-[18px]">content_copy</span></button>
          </dd>
        </div>
      </dl>
      {qrImg && <img src={order.payUrl} alt="Mã QR VietQR" className="mx-auto h-56 w-56 rounded-lg bg-white object-contain p-2" />}
      {url ? (
        <a href={url} target={order.gateway === 'MOMO' ? '_self' : '_blank'} rel="noopener noreferrer" className="rounded-lg bg-secondary px-4 py-3 text-center font-label-md text-label-md text-on-secondary hover:opacity-90">
          {order.gateway === 'MOMO' ? 'Mở lại cổng MoMo' : 'Mở trang thanh toán VietQR'}
        </a>
      ) : (
        <FormAlert>Máy chủ không trả liên kết thanh toán hợp lệ. Hãy tạo lại đơn sau khi đơn hiện tại hết hạn.</FormAlert>
      )}
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {sub.isError ? 'Chưa kiểm tra được trạng thái đơn, đang thử lại…' : 'Đang chờ xác nhận từ cổng thanh toán (thường dưới 30 giây). Trang sẽ tự chuyển khi có kết quả.'}
      </p>
      <div className="flex flex-col gap-space-sm sm:flex-row">
        <button type="button" onClick={() => navigate(result)} className="flex-1 rounded-lg bg-primary-container px-4 py-3 font-label-md text-label-md text-on-primary hover:bg-primary">Kiểm tra trạng thái</button>
        <button type="button" onClick={onExpired} className="flex-1 rounded-lg bg-surface-container px-4 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">Quay lại chọn cổng</button>
      </div>
    </section>
  );
}

export default CheckoutPage;
