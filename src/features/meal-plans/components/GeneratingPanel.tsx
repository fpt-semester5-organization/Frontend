import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Các việc AI làm khi sinh thực đơn (FN-MEAL-01), mốc thời gian chỉ để minh họa tiến trình. */
const STEPS: { label: string; from: number }[] = [
  { label: 'Đọc hồ sơ sức khỏe, trường phái và dị ứng của bạn', from: 0 },
  { label: 'Lọc các món phù hợp trong kho công thức', from: 1.5 },
  { label: 'Xếp 21 bữa theo mức ngân sách', from: 3 },
  { label: 'Cân đối calo từng ngày với mục tiêu', from: 5 },
];
/** Quá mốc này thì báo AI đang bận hơn thường lệ (AI ≤ 8 giây theo FN-MEAL-01). */
const SLOW_AFTER_SECONDS = 12;

/** Trạng thái chờ AI khi POST /meal-plans đang chạy. */
export const GeneratingPanel: React.FC<{ summary: string }> = ({ summary }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => window.clearInterval(timer);
  }, []);

  const activeIndex = STEPS.reduce((last, step, index) => (elapsed >= step.from ? index : last), 0);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center gap-space-lg rounded-xl border border-surface-container bg-surface-container-lowest px-space-lg py-space-2xl text-center shadow-card"
    >
      <span className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary-fixed opacity-60 motion-reduce:animate-none" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary">
          <Icon name="auto_awesome" filled className="text-[32px]" />
        </span>
      </span>

      <div className="flex flex-col gap-space-xs">
        <h2 className="font-headline-md text-headline-md text-on-surface">AI đang lên thực đơn 21 bữa cho bạn</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{summary}</p>
      </div>

      <ol className="flex w-full max-w-[440px] flex-col gap-space-sm text-left">
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={step.label} className="flex items-center gap-space-sm font-body-md text-body-md">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  done && 'bg-primary text-on-primary',
                  active && 'bg-primary-fixed text-primary',
                  !done && !active && 'bg-surface-container text-outline'
                )}
              >
                <Icon
                  name={done ? 'check' : active ? 'progress_activity' : 'radio_button_unchecked'}
                  className={cn('text-[16px]', active && 'animate-spin')}
                />
              </span>
              <span className={cn(done || active ? 'text-on-surface' : 'text-outline')}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {elapsed < SLOW_AFTER_SECONDS
          ? 'Thường mất dưới 10 giây. Vui lòng không đóng trang.'
          : 'AI đang bận hơn thường lệ, hệ thống vẫn đang xử lý. Vui lòng chờ thêm một chút.'}
      </p>
    </section>
  );
};
