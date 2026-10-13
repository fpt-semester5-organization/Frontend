/** Thanh hạn mức. Chỉ vẽ `used` khi server đã trả về; nếu chưa có thì chỉ ghi giới hạn (không bịa số đã dùng). */
export function QuotaMeter({ label, used, limit, unit, className = '' }: { label: string; used?: number | null; limit: number; unit: string; className?: string }) {
  const known = typeof used === 'number';
  const pct = known ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
        <span className="font-label-md text-label-md font-semibold tabular-nums text-on-surface">
          {known ? `${used}/${limit} ${unit}` : `Tối đa ${limit} ${unit}`}
        </span>
      </div>
      {known && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label={label}>
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-error' : 'bg-secondary'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
