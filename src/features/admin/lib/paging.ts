/** Dãy số trang rút gọn: 1 … 4 5 6 … 20 (null = dấu ba chấm). */
export function windowed(page: number, pages: number): (number | null)[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
