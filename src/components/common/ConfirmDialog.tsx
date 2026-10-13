import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  /** Nêu rõ hậu quả của thao tác (UI-10). */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận cho thao tác nhạy cảm: xóa bài, xóa bình luận... */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  show,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal show={show} onHide={onCancel} title={title} size="sm" locked={loading}>
    <div className="flex flex-col gap-5 p-space-lg">
      <div className="font-body-md text-body-md text-on-surface-variant">{message}</div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
