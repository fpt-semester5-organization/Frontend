import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/ui/forms';
import { Modal } from '@/components/ui/Modal';
import { reasonOnlySchema, type ReasonOnlyForm } from '../schemas/admin.schemas';
import { TextArea } from './fields';
import { DANGER_BTN, GHOST_BTN, PRIMARY_BTN } from './Filters';

/** Vỏ hộp thoại cho form quản trị. Nội dung (form) tự quản lý state nên được dựng mới mỗi lần mở. */
export function FormModal({ show, title, onHide, size, children }: { show: boolean; title: string; onHide: () => void; size?: 'sm' | 'lg' | 'xl'; children: ReactNode }) {
  return (
    <Modal show={show} onHide={onHide} title={title} size={size}>
      <div className="flex flex-col gap-space-md p-space-lg">{children}</div>
    </Modal>
  );
}

export function ServerError({ message }: { message?: string | null }) {
  return message ? <FormAlert>{message}</FormAlert> : null;
}

export function FormActions({ onCancel, submitLabel, pending, danger, disabled }: { onCancel: () => void; submitLabel: string; pending?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-1">
      <button type="button" onClick={onCancel} disabled={pending} className={GHOST_BTN}>
        Hủy
      </button>
      <button type="submit" disabled={pending || disabled} className={danger ? DANGER_BTN : PRIMARY_BTN}>
        {pending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
        {submitLabel}
      </button>
    </div>
  );
}

/**
 * Xác nhận thao tác nhạy cảm (NFR UI-10): nêu rõ hậu quả + bắt buộc nhập lý do 10–500 ký tự.
 * Lỗi từ server (409 …) hiện ngay trong hộp thoại và giữ nguyên lý do đã nhập.
 */
export function ReasonConfirmModal({
  show,
  title,
  consequence,
  confirmLabel = 'Xác nhận',
  reasonLabel = 'Lý do',
  danger = true,
  pending,
  error,
  onConfirm,
  onHide,
}: {
  show: boolean;
  title: string;
  consequence: ReactNode;
  confirmLabel?: string;
  reasonLabel?: string;
  danger?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onHide: () => void;
}) {
  return (
    <FormModal show={show} title={title} onHide={onHide} size="sm">
      <ReasonForm consequence={consequence} confirmLabel={confirmLabel} reasonLabel={reasonLabel} danger={danger} pending={pending} error={error} onConfirm={onConfirm} onHide={onHide} />
    </FormModal>
  );
}

function ReasonForm({ consequence, confirmLabel, reasonLabel, danger, pending, error, onConfirm, onHide }: { consequence: ReactNode; confirmLabel: string; reasonLabel: string; danger: boolean; pending?: boolean; error?: string | null; onConfirm: (reason: string) => void; onHide: () => void }) {
  const { register, handleSubmit, formState } = useForm<ReasonOnlyForm>({ resolver: zodResolver(reasonOnlySchema), defaultValues: { reason: '' } });
  return (
    <form onSubmit={handleSubmit((v) => onConfirm(v.reason))} noValidate className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">{consequence}</p>
      <TextArea label={reasonLabel} required maxLength={500} placeholder="Nêu rõ căn cứ (10–500 ký tự); nội dung được ghi vào nhật ký kiểm toán." error={formState.errors.reason?.message} {...register('reason')} />
      <ServerError message={error} />
      <FormActions onCancel={onHide} submitLabel={confirmLabel} pending={pending} danger={danger} />
    </form>
  );
}

/** Xác nhận đơn giản (không cần lý do) cho thao tác có hậu quả: nêu rõ hậu quả, báo lỗi server ngay trong hộp thoại. */
export function ConfirmDialog({
  show,
  title,
  consequence,
  confirmLabel = 'Xác nhận',
  danger = true,
  pending,
  error,
  onConfirm,
  onHide,
}: {
  show: boolean;
  title: string;
  consequence: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onHide: () => void;
}) {
  return (
    <FormModal show={show} title={title} onHide={onHide} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
        className="flex flex-col gap-space-md"
      >
        <p className="font-body-md text-body-md text-on-surface-variant">{consequence}</p>
        <ServerError message={error} />
        <FormActions onCancel={onHide} submitLabel={confirmLabel} pending={pending} danger={danger} />
      </form>
    </FormModal>
  );
}
