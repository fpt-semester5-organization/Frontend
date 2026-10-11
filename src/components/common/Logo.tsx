import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

/** Logo VeggieLife dùng chung cho mọi giao diện (nguồn: public/logo.png, nền trong suốt). */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return <img src="/logo.png" width={size} height={size} alt="VeggieLife" className={`shrink-0 object-contain ${className}`} />;
}

interface LogoProps {
  to?: string;
  size?: number;
  /** Dòng phụ dưới tên thương hiệu (vd. "Ẩm thực chay", "Quản trị"). */
  tagline?: string;
  onClick?: () => void;
  className?: string;
  /** Chỉ hiện biểu tượng (sidebar thu gọn). */
  markOnly?: boolean;
}

export function Logo({ to = PATHS.HOME, size = 36, tagline, onClick, className = '', markOnly }: LogoProps) {
  return (
    <Link to={to} onClick={onClick} aria-label="VeggieLife" className={`flex items-center gap-space-sm ${className}`}>
      <LogoMark size={size} />
      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span className="font-headline-sm text-headline-sm tracking-tight text-primary">VeggieLife</span>
          {tagline && <span className="mt-0.5 hidden font-label-sm text-label-sm text-on-surface-variant sm:block">{tagline}</span>}
        </span>
      )}
    </Link>
  );
}
