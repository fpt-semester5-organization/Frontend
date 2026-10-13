import { createContext, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const CloseCtx = createContext<() => void>(() => {});

/** Menu ba chấm cho thao tác phụ của một hàng bảng (mẫu "row actions" của shadcn-admin). Vẽ qua portal để không bị bảng cuộn ngang cắt. */
export function RowMenu({ children, label = 'Thao tác khác' }: { children: ReactNode; label?: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = () => setPos(null);
  useEffect(() => {
    if (!pos) return;
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('[data-rowmenu]')) return;
      close();
    };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', off);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', off);
      document.removeEventListener('keydown', off);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect();
          if (r) setPos(pos ? null : { top: r.bottom + 4, right: window.innerWidth - r.right });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
      </button>
      {pos &&
        createPortal(
          <CloseCtx.Provider value={close}>
            <div data-rowmenu role="menu" style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-[1060] min-w-[180px] rounded-xl bg-surface-container-lowest py-1 shadow-xl">
              {children}
            </div>
          </CloseCtx.Provider>,
          document.body,
        )}
    </>
  );
}

export function RowMenuItem({ danger, children, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  const close = useContext(CloseCtx);
  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      className={`block w-full px-4 py-2 text-left font-label-md text-label-md hover:bg-surface-container ${danger ? 'text-error' : 'text-on-surface'}`}
    >
      {children}
    </button>
  );
}
