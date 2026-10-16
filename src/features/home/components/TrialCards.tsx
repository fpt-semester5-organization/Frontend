import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';

interface TrialCardProps {
  icon: string;
  iconClass: string;
  title: string;
  description: string;
  to: string;
  cta: string;
}

const TrialCard: React.FC<TrialCardProps> = ({ icon, iconClass, title, description, to, cta }) => (
  <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:flex-row sm:items-center">
    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
      <Icon name={icon} className="text-[28px]" />
    </span>
    <div className="min-w-0 flex-1">
      <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
    </div>
    <Link
      to={to}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
    >
      {cta}
      <Icon name="arrow_forward" className="text-[18px]" />
    </Link>
  </div>
);

/** Hai lối vào tiện ích AI; Khách thấy số lượt dùng thử còn lại (GET /guest/quota, BR-GUEST-02, BR-GUEST-07). */
export const TrialCards: React.FC = () => {
  const isGuest = useAuthStore((state) => !state.user);
  const quota = useGuestStore((state) => state.quota);

  const barcode = quota?.barcodeDaily;
  const ai = quota?.ai;
  const scanText = !isGuest
    ? 'Đối chiếu phụ gia E-numbers và cảnh báo dị ứng của bạn.'
    : barcode
      ? `Khách dùng thử miễn phí: còn ${Math.max(0, barcode.remaining)}/${barcode.limit} lượt hôm nay.`
      : 'Khách dùng thử miễn phí 3 lượt mỗi ngày, không cần đăng ký.';
  const chatText = !isGuest
    ? 'Hỏi đáp dinh dưỡng chay, câu trả lời có nguồn tham khảo.'
    : ai
      ? `Khách dùng thử: còn ${Math.max(0, ai.remaining)}/${ai.limit} lượt AI trong phiên.`
      : 'Khách dùng thử 3 lượt AI trong phiên, không cần đăng ký.';

  return (
    <section aria-label="Tiện ích dùng thử" className="grid gap-space-md md:grid-cols-2">
      <TrialCard
        icon="barcode_scanner"
        iconClass="bg-primary-fixed text-on-primary-fixed-variant"
        title="Quét mã vạch & phụ gia"
        description={scanText}
        to={PATHS.SCANNER.ROOT}
        cta="Quét ngay"
      />
      <TrialCard
        icon="auto_awesome"
        iconClass="bg-secondary-fixed text-on-secondary-fixed-variant"
        title="Hỏi trợ lý dinh dưỡng AI"
        description={chatText}
        to={PATHS.CHAT.ROOT}
        cta="Hỏi thử"
      />
    </section>
  );
};
