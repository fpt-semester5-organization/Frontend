import { useEffect, useState } from 'react';

/** Số giây còn lại tới mốc `until` (ms), tự cập nhật mỗi giây; 0 khi đã qua mốc. */
export function useCountdown(until: number | null): number {
  const compute = () => (until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    setSeconds(compute());
    if (!until) return;
    const timer = window.setInterval(() => {
      const next = compute();
      setSeconds(next);
      if (next === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  return seconds;
}
