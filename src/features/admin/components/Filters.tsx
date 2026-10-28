import { useEffect, useState, type ReactNode } from 'react';
import { useDebounced } from '../hooks/useListState';

const BOX = 'flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2';
const CTRL = 'bg-transparent font-label-md text-label-md text-on-surface outline-none';

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm lg:flex-row lg:flex-wrap lg:items-center">{children}</div>;
}

export function SelectFilter<T extends string>({ label, value, onChange, options, allLabel = 'Tất cả' }: { label: string; value: T | undefined; onChange: (v: T | undefined) => void; options: readonly (readonly [T, string])[]; allLabel?: string }) {
  return (
    <label className={BOX}>
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <select aria-label={label} value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)} className={`${CTRL} cursor-pointer pr-1`}>
        <option value="">{allLabel}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Ô tìm kiếm có debounce; `onSearch` chỉ chạy khi người dùng ngừng gõ. */
export function SearchFilter({ value, onSearch, placeholder, maxLength = 100, label }: { value: string; onSearch: (v: string) => void; placeholder: string; maxLength?: number; label: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebounced(text);
  useEffect(() => {
    if (debounced !== value) onSearch(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  // Đồng bộ khi bộ lọc bị đặt lại từ bên ngoài ("Đặt lại").
  useEffect(() => {
    if (value !== text.trim()) setText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className="relative flex w-full items-center lg:w-80">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 text-[20px] text-outline">search</span>
      <input type="search" aria-label={label} value={text} maxLength={maxLength} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="w-full rounded-lg bg-surface-container-low py-2 pl-10 pr-3 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline focus:bg-surface-container" />
    </label>
  );
}

export function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label
      className={`${BOX} cursor-pointer select-none`}
      onClick={(e) => {
        const input = e.currentTarget.querySelector('input') as HTMLInputElement | null;
        if (input && typeof input.showPicker === 'function' && e.target !== input) {
          try {
            input.showPicker();
          } catch {
            // ignore
          }
        }
      }}
    >
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // ignore
          }
        }}
        className={`${CTRL} cursor-pointer`}
      />
    </label>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-lg bg-surface-container-highest px-3 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-variant">
      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
      Đặt lại
    </button>
  );
}

export const PRIMARY_BTN = 'inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-space-md py-2 font-label-md text-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
export const GHOST_BTN = 'inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-space-md py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60';
export const DANGER_BTN = 'inline-flex items-center gap-1.5 rounded-xl bg-error px-space-md py-2 font-label-md text-label-md text-on-error shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
