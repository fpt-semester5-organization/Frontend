import { formatDateTime, parseServerDate } from '@/lib/format';

export { parseServerDate };

/** dd/MM/yyyy HH:mm theo giờ Việt Nam (UI-2); rỗng nếu không có giá trị. */
export const formatServerDateTime = (value: string | null | undefined) => formatDateTime(value);
