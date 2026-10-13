import { useUiStore } from '@/stores/ui.store';

/** Banner "Dịch vụ tạm gián đoạn" khi API trả 503 (spec 13 §1.1). */
export function ServiceBanner() {
  const message = useUiStore((s) => s.serviceBanner);
  const set = useUiStore((s) => s.setServiceBanner);
  if (!message) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-[72px] z-40 flex items-center justify-center gap-3 bg-secondary px-4 py-2 font-label-md text-label-md text-on-secondary">
      <span className="material-symbols-outlined text-[18px]">warning</span>
      {message}
      <button type="button" onClick={() => set(null)} className="underline">Thử lại</button>
    </div>
  );
}
