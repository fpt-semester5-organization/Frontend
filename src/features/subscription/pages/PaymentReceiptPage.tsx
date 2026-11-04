/**
 * Biên lai thanh toán · `/vip/receipt/:transactionId`   (FN-SUB-04: GET /subscriptions/transactions/{id}/receipt, guard RequireAuth)
 * Trang dựng tờ biên lai từ JSON; nút "Tải biên lai PDF" lấy tệp do Backend dựng (receipt.pdf), nút "In" mở hộp thoại in của trình duyệt.
 * Global print CSS ẩn mọi thẻ header/footer/nav/aside/button, nên tờ biên lai dùng div cho phần đầu.
 */
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage, apiErrorStatus } from '@/api/http';
import { Icon } from '@/components/ui/Icon';
import { formatVnd } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { PATHS } from '@/routes/paths';
import { notifyApiError } from '@/lib/notify';
import { downloadReceiptPdf } from '../api/subscription.api';
import { PageEmpty, PageError, PageSkeleton } from '../components/SubStates';
import { usePaymentReceipt } from '../hooks/useSubscription';
import { GATEWAY_LABEL, statusInfo, type PaymentReceipt } from '../types/subscription.types';

const TONE = { ok: 'bg-primary-fixed text-on-primary-fixed', wait: 'bg-secondary-fixed text-on-secondary-fixed', bad: 'bg-error-container text-on-error-container' };
/** Kết quả cố định từ server, thử lại cũng không đổi. */
const FIXED_ERROR_TITLE: Record<number, string> = {
  400: 'Giao dịch này chưa có biên lai',
  403: 'Bạn không xem được biên lai này',
  404: 'Không tìm thấy biên lai',
};

/** Số biên lai làm tên file gợi ý khi lưu PDF; trả lại tiêu đề trang sau khi đóng hộp thoại in. */
function printReceipt(receiptNumber: string) {
  const pageTitle = document.title;
  window.addEventListener('afterprint', () => { document.title = pageTitle; }, { once: true });
  document.title = `Bien-lai-${receiptNumber}`;
  window.print();
}

function BackLink({ className = '' }: { className?: string }) {
  return (
    <Link to={PATHS.ME.SUBSCRIPTION} className={`inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:underline ${className}`}>
      <Icon name="arrow_back" className="text-[18px]" />
      Gói của tôi
    </Link>
  );
}

function Row({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-space-md py-1.5">
      <dt className="shrink-0 text-on-surface-variant">{label}</dt>
      <dd className={`min-w-0 break-words text-right font-semibold ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-outline-variant/40 py-space-md">
      <h2 id={id} className="mb-1 font-label-lg text-label-lg text-primary">{title}</h2>
      <dl className="font-body-sm text-body-sm">{children}</dl>
    </section>
  );
}

function ReceiptSheet({ receipt }: { receipt: PaymentReceipt }) {
  const status = statusInfo(receipt.status);
  return (
    <article aria-labelledby="receipt-title" className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm print:rounded-none print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-space-md border-b border-outline-variant/40 pb-space-md">
        <div>
          <p className="font-label-lg text-label-lg text-primary">VeggieLife</p>
          <h1 id="receipt-title" className="font-headline-md text-headline-md text-on-surface">Biên lai thanh toán</h1>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="font-mono font-semibold break-all">{receipt.receiptNumber}</p>
          <span className={`rounded-full px-2.5 py-0.5 font-label-sm text-label-sm ${TONE[status.tone]}`}>{status.text}</span>
        </div>
      </div>

      <Group id="receipt-buyer" title="Người thanh toán">
        <Row label="Họ và tên">{receipt.fullName}</Row>
        <Row label="Email">{receipt.email}</Row>
      </Group>

      <Group id="receipt-plan" title="Gói dịch vụ">
        <Row label="Tên gói">{receipt.planName}</Row>
        <Row label="Thời hạn">{receipt.durationDays} ngày</Row>
        <Row label="Hiệu lực từ">{formatServerDateTime(receipt.vipStartsAt)}</Row>
        <Row label="Hiệu lực đến">{formatServerDateTime(receipt.vipEndsAt)}</Row>
      </Group>

      <Group id="receipt-payment" title="Giao dịch">
        <Row label="Mã giao dịch" mono>#{receipt.transactionId}</Row>
        <Row label="Mã đơn hàng" mono>{receipt.orderCode}</Row>
        <Row label="Cổng thanh toán">{GATEWAY_LABEL[receipt.gateway] ?? receipt.gateway}</Row>
        <Row label="Thời gian thanh toán">{formatServerDateTime(receipt.paymentDate)}</Row>
        {receipt.note && <Row label="Nội dung">{receipt.note}</Row>}
      </Group>

      <div className="flex items-baseline justify-between gap-space-md pt-space-md">
        <span className="font-label-lg text-label-lg text-on-surface">Tổng thanh toán</span>
        <span className="font-headline-sm text-headline-sm text-primary">{formatVnd(receipt.amountVnd)}</span>
      </div>
    </article>
  );
}

export function PaymentReceiptPage() {
  const { transactionId } = useParams();
  const id = /^\d+$/.test(transactionId ?? '') ? Number(transactionId) : null;
  const q = usePaymentReceipt(id);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (txId: number, receiptNumber: string) => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(txId, `VeggieLife-${receiptNumber}.pdf`);
    } catch (error) {
      notifyApiError(error);
    } finally {
      setDownloading(false);
    }
  };
  const fixedErrorTitle = id === null ? FIXED_ERROR_TITLE[404] : FIXED_ERROR_TITLE[apiErrorStatus(q.error) ?? 0];

  return (
    <main className="min-h-screen w-full bg-background print:min-h-0 print:bg-white">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-space-md px-margin-sm py-space-xl print:max-w-full print:p-0">
        {fixedErrorTitle ? (
          <PageEmpty title={fixedErrorTitle} hint={id === null ? 'Đường dẫn biên lai không hợp lệ.' : apiErrorMessage(q.error, 'Vui lòng kiểm tra lại ở lịch sử giao dịch.')}>
            <BackLink className="mt-2" />
          </PageEmpty>
        ) : q.isLoading ? (
          <PageSkeleton />
        ) : q.isError || !q.data ? (
          <PageError error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-space-sm print:hidden">
              <BackLink />
              <div className="flex flex-wrap items-center gap-space-sm">
                <button type="button" disabled={downloading} onClick={() => void handleDownload(q.data.transactionId, q.data.receiptNumber)} className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary disabled:opacity-60">
                  <Icon name="picture_as_pdf" className="text-[20px]" />
                  {downloading ? 'Đang tải…' : 'Tải biên lai PDF'}
                </button>
                <button type="button" onClick={() => printReceipt(q.data.receiptNumber)} className="inline-flex items-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
                  <Icon name="print" className="text-[20px]" />
                  In
                </button>
              </div>
            </div>
            <ReceiptSheet receipt={q.data} />
            <p className="font-body-sm text-body-sm text-on-surface-variant print:hidden">
              Biên lai PDF cũng được gửi kèm email thanh toán của bạn. Nút “In” mở hộp thoại in của trình duyệt.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default PaymentReceiptPage;
