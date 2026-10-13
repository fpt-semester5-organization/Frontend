import React from 'react';
import { cn } from '@/lib/cn';

interface IconProps {
  /** Tên icon Material Symbols Outlined, ví dụ "favorite", "chat_bubble" (fonts.google.com/icons). */
  name: string;
  className?: string;
  /** Icon tô đặc (ví dụ tim đã thả). */
  filled?: boolean;
  /** Nhãn cho trình đọc màn hình khi icon mang nghĩa; không có thì icon chỉ để trang trí. */
  label?: string;
}

const FILLED = { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" };

/** Icon Material Symbols của design system (font nạp ở index.html). */
export const Icon: React.FC<IconProps> = ({ name, className, filled = false, label }) => (
  <span
    className={cn('material-symbols-outlined shrink-0', className)}
    style={filled ? FILLED : undefined}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    {name}
  </span>
);
