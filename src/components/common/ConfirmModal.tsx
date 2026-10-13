import { Modal } from '@/components/ui/Modal';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  /** Nêu rõ hậu quả của thao tác (NFR UI-10). */
  consequence: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận cho thao tác nhạy cảm: xóa, kỷ luật người dùng, hoàn tiền, xóa danh mục. */
export function ConfirmModal({ show, title, consequence, confirmLabel = 'Xác nhận', danger = true, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal show={show} onHide={onCancel} title={title} size="sm">
      <div className="flex flex-col gap-5 p-space-lg">
        <p className="font-body-md text-body-md text-on-surface-variant">{consequence}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 font-label-md text-label-md text-on-primary ${danger ? 'bg-error hover:opacity-90' : 'bg-primary-container hover:bg-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
