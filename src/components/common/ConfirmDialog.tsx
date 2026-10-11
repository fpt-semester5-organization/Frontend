import React from 'react';
import Modal from 'react-bootstrap/Modal';
import { Button } from '@/components/ui/Button';

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
  <Modal show={show} onHide={loading ? undefined : onCancel} centered>
    <Modal.Header closeButton={!loading} closeLabel="Đóng">
      <Modal.Title as="h2" className="text-lg font-semibold">
        {title}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="text-sm text-gray-700">{message}</Modal.Body>
    <Modal.Footer className="gap-2">
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </Modal.Footer>
  </Modal>
);
