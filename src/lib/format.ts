/** Định dạng hiển thị theo chuẩn Việt Nam. */
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const formatVnd = (n: number) => vnd.format(n);
export const formatDate = (iso: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(typeof iso === 'string' ? new Date(iso) : iso);
export const formatDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(typeof iso === 'string' ? new Date(iso) : iso);
