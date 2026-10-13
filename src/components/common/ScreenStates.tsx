import type { ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { IS_MOCK } from '@/lib/env';
import { PATHS } from '@/routes/paths';

/** Ba trạng thái bắt buộc của mọi màn hình (NFR UI-3): đang tải, rỗng, lỗi. */

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] animate-pulse flex-col gap-4 px-gutter pb-12 pt-[96px]" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-1/3 rounded-lg bg-surface-container-high" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 rounded-xl bg-surface-container" />
      ))}
    </div>
  );
}

interface StateProps {
  icon: string;
  title: string;
  hint: string;
  children?: ReactNode;
}

function StateBox({ icon, title, hint, children }: StateProps) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-gutter pb-16 pt-[120px] text-center" role="status">
      <span className="material-symbols-outlined text-[48px] text-outline">{icon}</span>
      <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">{hint}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

const BTN = 'inline-flex items-center rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary';

export function EmptyState({ title, hint, actionLabel, actionTo }: { title: string; hint: string; actionLabel?: string; actionTo?: string }) {
  return (
    <StateBox icon="inbox" title={title} hint={hint}>
      {actionLabel && actionTo && (
        <Link to={actionTo} className={BTN}>
          {actionLabel}
        </Link>
      )}
    </StateBox>
  );
}

export function ErrorState({ message = 'Không tải được dữ liệu. Vui lòng thử lại.', onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <StateBox icon="cloud_off" title="Đã có lỗi xảy ra" hint={message}>
      <button type="button" onClick={onRetry} className={BTN}>
        Thử lại
      </button>
    </StateBox>
  );
}

/** Nội dung "rỗng" theo route: tiêu đề + hướng dẫn hành động tiếp theo (mặc định: về trang chủ). */
const EMPTY: Array<{ prefix: string; title: string; hint: string; label?: string; to?: string }> = [
  { prefix: '/me/recipes', title: 'Chưa có công thức nào', hint: 'Tạo công thức đầu tiên và gửi kiểm duyệt.', label: 'Tạo công thức', to: '/recipes/new' },
  { prefix: '/recipes', title: 'Không có công thức phù hợp', hint: 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.', label: 'Xóa bộ lọc', to: '/recipes' },
  { prefix: '/scanner/history', title: 'Chưa có lịch sử quét', hint: 'Quét mã vạch đầu tiên để xem thành phần sản phẩm.', label: 'Quét mã vạch', to: '/scanner' },
  { prefix: '/fridge', title: 'Tủ lạnh đang trống', hint: 'Chụp ảnh tủ lạnh để nhận gợi ý món chay.', label: 'Quét tủ lạnh', to: '/fridge' },
  { prefix: '/venues', title: 'Không tìm thấy quán chay', hint: 'Mở rộng bán kính hoặc chọn tỉnh/thành khác.', label: 'Gợi ý quán mới', to: '/venues/suggest' },
  { prefix: '/meal-plans', title: 'Chưa có thực đơn', hint: 'Tạo thực đơn tuần theo mục tiêu dinh dưỡng của bạn.', label: 'Tạo thực đơn', to: '/meal-plans/new' },
  { prefix: '/shopping-lists', title: 'Danh sách đi chợ trống', hint: 'Tạo thực đơn để sinh danh sách nguyên liệu.', label: 'Tạo thực đơn', to: '/meal-plans/new' },
  { prefix: '/me/posts', title: 'Bạn chưa đăng bài nào', hint: 'Chia sẻ trải nghiệm ẩm thực đầu tiên với cộng đồng.', label: 'Viết bài', to: '/community/posts/new' },
  { prefix: '/community', title: 'Chưa có bài viết', hint: 'Hãy là người đầu tiên chia sẻ với cộng đồng.', label: 'Viết bài', to: '/community/posts/new' },
  { prefix: '/chat', title: 'Chưa có cuộc trò chuyện', hint: 'Đặt câu hỏi đầu tiên cho trợ lý dinh dưỡng.', label: 'Bắt đầu', to: '/chat' },
  { prefix: '/admin', title: 'Không có dữ liệu', hint: 'Chưa có bản ghi nào khớp bộ lọc hiện tại.', label: 'Về tổng quan', to: '/admin' },
];

/**
 * Cổng trạng thái cho chế độ mock (chỉ khi IS_MOCK): `?state=loading|empty|error` thay nội dung trang bằng đúng trạng thái đó,
 * để kiểm tra 3 trạng thái (UI-3) trước khi nối API thật. Không có tham số thì hiển thị trang bình thường.
 */
export function ScreenStateGate({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const state = params.get('state');
  if (!IS_MOCK) return <>{children}</>; // cổng trạng thái giả chỉ bật cùng VITE_MOCK_AUTH=true, không che dữ liệu thật
  if (state === 'loading') return <ListSkeleton />;
  if (state === 'error') {
    return (
      <ErrorState
        onRetry={() => {
          const next = new URLSearchParams(params);
          next.delete('state');
          setParams(next, { replace: true });
        }}
      />
    );
  }
  if (state === 'empty') {
    const e = EMPTY.find((x) => pathname.startsWith(x.prefix));
    return <EmptyState title={e?.title ?? 'Chưa có dữ liệu'} hint={e?.hint ?? 'Nội dung sẽ xuất hiện ở đây khi có dữ liệu.'} actionLabel={e?.label ?? 'Về trang chủ'} actionTo={e?.to ?? PATHS.HOME} />;
  }
  return <>{children}</>;
}
