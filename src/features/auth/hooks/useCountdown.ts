import { useEffect, useState } from 'react';

/** Đếm ngược tới mốc thời gian (ms epoch). Trả về số giây còn lại (0 khi hết hoặc chưa đặt). */
export function useCountdown(untilMs: number | null): number {
  const calc = () => (untilMs ? Math.max(0, Math.ceil((untilMs - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!untilMs) return;
    const t = window.setInterval(() => {
      const v = calc();
      setLeft(v);
      if (v === 0) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [untilMs]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}

export const formatMmSs = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
