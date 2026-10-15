import { useUiStore, type ToastKind } from '@/stores/ui.store';

const STYLE: Record<ToastKind, { box: string; icon: string }> = {
  success: { box: 'bg-[#3d5c47] text-white', icon: 'check_circle' },
  error: { box: 'bg-[#c62828] text-white', icon: 'error' },
  warning: { box: 'bg-[#94532f] text-white', icon: 'warning' },
  info: { box: 'bg-[#2f332d] text-[#f2f0ea]', icon: 'info' },
};

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1090] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl cursor-pointer transition-all ${STYLE[t.kind].box}`}
        >
          <span className="material-symbols-outlined text-[20px]">{STYLE[t.kind].icon}</span>
          <span className="text-[13px] font-sans">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
