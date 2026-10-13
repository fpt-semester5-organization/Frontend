import { verdictMeta } from '../lib/verdict';

/** Chấm màu + nhãn kết luận Xanh/Vàng/Đỏ (GREEN/YELLOW/RED). */
export function VerdictBadge({ verdict, className = '' }: { verdict: string; className?: string }) {
  const m = verdictMeta(verdict);
  return (
    <span className={`inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold ${m.text} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}
