import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Các bước xử lý chuẩn theo yêu cầu của hệ thống AI */
const STEPS: { label: string; from: number }[] = [
  { label: 'Gửi lưu ý thô lên API AI', from: 0 },
  { label: 'AI tổng hợp thành context có cấu trúc (số người, dị ứng, khẩu vị, ngân sách)', from: 1.5 },
  { label: 'Backend dùng context truy vấn database món ăn phù hợp', from: 3.5 },
  { label: 'Cân đối calo & hoàn tất thực đơn dinh dưỡng', from: 5.5 },
];

const SLOW_AFTER_SECONDS = 12;

export const GeneratingPanel: React.FC<{ summary: string; daysCount?: number }> = ({
  summary,
  daysCount = 7,
}) => {
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
      className="mx-auto flex w-full max-w-[620px] flex-col items-center gap-space-lg rounded-3xl border border-surface-container bg-surface-container-lowest p-6 sm:p-10 text-center shadow-card animate-fadeIn"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20 opacity-75 motion-reduce:animate-none" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md">
          <Icon name="auto_awesome" filled className="text-[32px] text-on-primary animate-pulse" />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-serif font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
          AI đang lên thực đơn {daysCount} ngày ({daysCount * 3} bữa) cho bạn
        </h2>
        <div className="inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-primary-fixed text-on-primary-fixed border border-primary/20 px-3.5 py-1 font-label-sm text-xs font-semibold shadow-2xs">
          <Icon name="event" className="text-[15px] text-primary" />
          <span>{summary}</span>
        </div>
      </div>

      <ol className="flex w-full max-w-[480px] flex-col gap-2.5 rounded-2xl border border-surface-container bg-surface-container-low p-4 sm:p-5 text-left shadow-2xs">
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={step.label} className="flex items-center gap-3 font-body-md text-body-md">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
                  done && 'bg-primary text-on-primary shadow-2xs',
                  active && 'bg-primary-container text-on-primary ring-2 ring-primary/40',
                  !done && !active && 'bg-surface-container text-outline'
                )}
              >
                <Icon
                  name={done ? 'check' : active ? 'progress_activity' : 'radio_button_unchecked'}
                  className={cn('text-[15px]', active && 'animate-spin text-on-primary')}
                />
              </span>
              <span className={cn(done ? 'text-on-surface font-medium' : active ? 'text-primary font-bold' : 'text-outline')}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-1.5">
        <Icon name="hourglass_empty" className="text-[16px] text-secondary" />
        <span>
          {elapsed < SLOW_AFTER_SECONDS
            ? 'Hệ thống đang truy vấn database và cân bằng calo. Vui lòng chờ trong giây lát.'
            : 'AI đang phân tích sâu ngữ cảnh thực đơn, vui lòng chờ thêm một chút.'}
        </span>
      </p>
    </section>
  );
};
