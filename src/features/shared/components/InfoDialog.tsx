import { Modal } from '@/components/ui/Modal';

/** Hộp thoại giải thích với `message` của server (spec: "Hộp thoại xác nhận/giải thích với message của server"). */
export function InfoDialog({ show, title, message, onClose, actions }: { show: boolean; title: string; message: string; onClose: () => void; actions?: React.ReactNode }) {
  return (
    <Modal show={show} onHide={onClose} bare size="sm">
      <div className="flex flex-col gap-space-md p-space-lg" role="alertdialog" aria-labelledby="info-dialog-title">
        <h2 id="info-dialog-title" className="font-headline-sm text-headline-sm text-primary">{title}</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{message}</p>
        <div className="flex flex-wrap justify-end gap-space-sm">
          {actions}
          <button type="button" onClick={onClose} className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
