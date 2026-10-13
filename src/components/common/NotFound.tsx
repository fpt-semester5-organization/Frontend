import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

/** Trạng thái 404 (spec 13 §1.1). */
export function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 pt-[72px] text-center">
      <span className="material-symbols-outlined text-[56px] text-outline">search_off</span>
      <h1 className="font-headline-lg text-headline-lg text-primary">Không tìm thấy trang</h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">Đường dẫn không tồn tại hoặc nội dung đã bị gỡ.</p>
      <Link to={PATHS.HOME} className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary">
        Về trang chủ
      </Link>
    </main>
  );
}
