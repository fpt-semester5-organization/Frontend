import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { PATHS } from '@/routes/paths';

export interface QuotaDialogState {
  code: string;
  message: string;
  /** free: mời nâng cấp VIP; none: chỉ thông báo (VIP hoặc giới hạn áp dụng cả hai gói). */
  offer: 'upgrade' | 'none';
}

const TITLE: Record<string, string> = {
  ERR_QUOTA_AI_EXCEEDED: 'Bạn đã dùng hết lượt AI',
  ERR_QUOTA_BARCODE_EXCEEDED: 'Bạn đã dùng hết lượt quét mã vạch',
  ERR_QUOTA_MAP_EXCEEDED: 'Bạn đã dùng hết lượt tìm quán',
  ERR_QUOTA_MEAL_PLAN_EXCEEDED: 'Đã hết hạn mức thực đơn tuần này',
  ERR_QUOTA_MEAL_SWAP_EXCEEDED: 'Đã hết lượt đổi món',
  ERR_VIP_REQUIRED: 'Tính năng dành cho thành viên VIP',
};

/** Hộp mời nâng cấp VIP cho Thành viên Free khi gặp `ERR_QUOTA_*` / `ERR_VIP_REQUIRED` (Khách dùng SignupPromptModal toàn cục). */
export function QuotaDialog({ state, onClose }: { state: QuotaDialogState | null; onClose: () => void }) {
  return (
    <Modal show={!!state} onHide={onClose} bare size="sm">
      {state && (
        <div className="flex flex-col items-center gap-space-md p-space-lg text-center" role="alertdialog" aria-labelledby="quota-dialog-title">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed text-on-secondary-fixed">
            <span className="material-symbols-outlined">workspace_premium</span>
          </div>
          <h2 id="quota-dialog-title" className="font-headline-sm text-headline-sm text-primary">{TITLE[state.code] ?? 'Đã chạm giới hạn sử dụng'}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{state.message}</p>
          <div className="flex w-full flex-col gap-space-sm">
            {state.offer === 'upgrade' && (
              <Link to={PATHS.VIP.ROOT} onClick={onClose} className="rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary">
                Nâng cấp VIP
              </Link>
            )}
            <button type="button" onClick={onClose} className="rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
              Đóng
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
