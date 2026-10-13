import { formatDate, formatDateTime } from '@/lib/format';

/** Định dạng ngày giờ nhưng không ném lỗi khi server trả chuỗi rỗng/không hợp lệ. */
export const safeDateTime = (iso?: string | null) => {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
  return formatDateTime(iso);
};
export const safeDate = (iso?: string | null) => {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
  return formatDate(iso);
};
