/**
 * Trang đích khi cổng thanh toán chuyển người dùng về: `/payment/success`, `/payment/cancel` (PayOS VietQR) và `/payment/callback` (MoMo).
 * Các đường dẫn này do Backend quy định (PaymentGatewayServiceStub, SubscriptionService), chưa có trong docs/11.
 *
 * Trang này KHÔNG quyết định kết quả: VIP chỉ kích hoạt qua webhook có chữ ký, nên mọi tham số cổng gắn trên URL (status, code…) không được tin.
 * Nó chỉ chuyển tiếp sang `/vip/result` (bỏ tham số của cổng) để đọc trạng thái thật từ server. Riêng khi cổng báo hủy đúng đơn đang chờ
 * của tài khoản này thì giải phóng đơn ngay để người dùng đổi gói/cổng, không phải chờ hết 5 phút.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { notifyApiError } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/ui.store';
import { useCancelPending } from '../hooks/useSubscription';
import { clearPendingOrder, isSameOrder, readPendingOrder } from '../lib/pendingOrder';

interface PaymentReturnPageProps {
  /** `cancel`: đường dẫn hủy của cổng (CancelUrl). */
  outcome: 'return' | 'cancel';
}

export function PaymentReturnPage({ outcome }: PaymentReturnPageProps) {
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.userId);
  const cancel = useCancelPending();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const stored = readPendingOrder(userId);
    const result = stored ? `${PATHS.SUBSCRIPTION.RESULT}?transactionId=${stored.transactionId}` : PATHS.SUBSCRIPTION.RESULT;
    const gatewayOrder = query.get('orderCode') ?? query.get('orderId');

    // Chỉ hủy khi mã đơn trên URL khớp đơn đang chờ đã lưu, để một đường link lạ không hủy được đơn của người dùng.
    if (outcome !== 'cancel' || !stored || !isSameOrder(stored, gatewayOrder)) {
      navigate(result, { replace: true });
      return;
    }
    cancel.mutate(undefined, {
      onSuccess: (res) => {
        clearPendingOrder();
        if (res.cancelled) {
          toast.info('Bạn đã hủy thanh toán. Có thể chọn lại gói hoặc cổng thanh toán.');
          navigate(PATHS.SUBSCRIPTION.PRICING, { replace: true });
        } else {
          navigate(result, { replace: true });
        }
      },
      onError: (error) => {
        notifyApiError(error);
        navigate(result, { replace: true });
      },
    });
  }, [outcome, query, navigate, userId, cancel]);

  return <PageLoader label="Đang kiểm tra kết quả thanh toán..." />;
}

export default PaymentReturnPage;
