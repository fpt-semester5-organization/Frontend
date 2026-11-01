import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { ADMIN_NAV } from '@/config/nav';
import { PATHS } from '@/routes/paths';

const EXTRA_ADMIN_COMMANDS = [
  { label: 'Phân tích Chi phí AI', to: PATHS.ADMIN.AI_ANALYTICS, icon: 'analytics' },
  { label: 'Nhật ký cuộc gọi AI (Logs)', to: PATHS.ADMIN.AI_LOGS, icon: 'receipt_long' },
  { label: 'Kho tri thức RAG (Qdrant)', to: PATHS.ADMIN.AI_RAG, icon: 'database' },
  { label: 'Chất lượng AI & SLA', to: PATHS.ADMIN.AI_QUALITY, icon: 'verified' },
];

/** Menu lệnh Ctrl+K: nhảy nhanh tới các màn Admin (dựng bằng react-bootstrap Modal). */
export function CommandPalette({ show, onHide }: { show: boolean; onHide: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  const allCommands = useMemo(() => [...ADMIN_NAV, ...EXTRA_ADMIN_COMMANDS], []);
  const items = useMemo(() => allCommands.filter((i) => norm(i.label).includes(norm(q))), [allCommands, q]);
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
      <div
        role="dialog"
        aria-label="Tìm trang quản trị"
        className="flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === 'Enter' && items[active]) go(items[active].to);
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="material-symbols-outlined text-[20px] text-outline">search</span>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            aria-label="Tìm trang"
            placeholder="Chuyển tới trang..."
            className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto border-t border-outline-variant/30 p-1" role="listbox">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              Không có trang phù hợp
            </li>
          )}
          {items.map((i, idx) => (
            <li key={i.to} role="option" aria-selected={idx === active}>
              <button
                type="button"
                onClick={() => go(i.to)}
                onMouseEnter={() => setActive(idx)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-label-md text-label-md ${
                  idx === active
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant'
                }`}
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
