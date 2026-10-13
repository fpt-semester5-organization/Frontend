import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { ADMIN_NAV } from '@/config/nav';

/** Menu lệnh Ctrl+K: nhảy nhanh tới 12 màn Admin (mẫu command menu của shadcn-admin, dựng bằng react-bootstrap Modal). */
export function CommandPalette({ show, onHide }: { show: boolean; onHide: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  const items = useMemo(() => ADMIN_NAV.filter((i) => norm(i.label).includes(norm(q))), [q]);
  useEffect(() => {
    if (show) {
      setQ('');
      setActive(0);
    }
  }, [show]);
  const go = (to: string) => {
    onHide();
    navigate(to);
  };
  return (
    <Modal show={show} onHide={onHide} bare size="sm" className="!mt-12">
      <div role="dialog" aria-label="Tìm trang quản trị" className="flex flex-col" onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        if (e.key === 'Enter' && items[active]) go(items[active].to);
      }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="material-symbols-outlined text-[20px] text-outline">search</span>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            aria-label="Tìm trang"
            placeholder="Chuyển tới trang..."
            className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto border-t border-outline-variant/30 p-1" role="listbox">
          {items.length === 0 && <li className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">Không có trang phù hợp</li>}
          {items.map((i, idx) => (
            <li key={i.to} role="option" aria-selected={idx === active}>
              <button
                type="button"
                onClick={() => go(i.to)}
                onMouseEnter={() => setActive(idx)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-label-md text-label-md ${idx === active ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{i.icon}</span>
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
