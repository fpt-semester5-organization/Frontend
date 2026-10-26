/** `data.failedCriteria` chưa có mẫu trong spec: chấp nhận mảng chuỗi hoặc mảng đối tượng {criterion|code|message}. */
export function formatFailedCriteria(data: unknown): string[] {
  const raw = (data as { failedCriteria?: unknown } | undefined)?.failedCriteria;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    if (typeof x === 'string') return x;
    const o = x as Record<string, unknown>;
    return String(o.message ?? o.criterion ?? o.code ?? JSON.stringify(x));
  });
}

