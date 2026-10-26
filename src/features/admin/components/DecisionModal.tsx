import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { moderationDecisionSchema, type ModerationDecisionForm } from '../schemas/admin.schemas';
import { CheckField, TextArea } from './fields';
import { FormActions, FormModal, ServerError } from './FormModal';

export interface DecisionTarget {
  reportId: number;
  decision: 'UPHOLD' | 'DISMISS';
  label: string;
}

/** FN-ADM-05: quyết định UPHOLD (xác nhận vi phạm) / DISMISS (bác bỏ) kèm ghi chú 10–500 ký tự, tùy chọn áp dụng kỷ luật. */
export function DecisionModal({ target, pending, error, onSubmit, onHide }: { target: DecisionTarget | null; pending?: boolean; error?: string | null; onSubmit: (v: { note: string; applySanction: boolean }) => void; onHide: () => void }) {
  const uphold = target?.decision === 'UPHOLD';
  return (
    <FormModal show={target !== null} onHide={onHide} title={uphold ? 'Xác nhận vi phạm?' : 'Bác bỏ báo cáo?'} size="sm">
      {target && <DecisionForm target={target} pending={pending} error={error} onSubmit={onSubmit} onHide={onHide} />}
    </FormModal>
  );
}

function DecisionForm({ target, pending, error, onSubmit, onHide }: { target: DecisionTarget; pending?: boolean; error?: string | null; onSubmit: (v: { note: string; applySanction: boolean }) => void; onHide: () => void }) {
  const uphold = target.decision === 'UPHOLD';
  const { register, handleSubmit, formState } = useForm<ModerationDecisionForm>({
    resolver: zodResolver(moderationDecisionSchema),
    defaultValues: { note: '', applySanction: false },
  });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit({ note: v.note, applySanction: uphold ? !!v.applySanction : false }))} noValidate className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        {uphold
          ? `Báo cáo #${target.reportId} (${target.label}): nội dung bị gỡ theo loại đối tượng và vi phạm được ghi cho tác giả. Quyết định của Admin ghi đè kết quả AI và được lưu vào nhật ký kiểm toán.`
          : `Báo cáo #${target.reportId} (${target.label}): nội dung được khôi phục hiển thị. Quyết định được lưu vào nhật ký kiểm toán.`}
      </p>
      <TextArea label="Ghi chú quyết định" required maxLength={500} error={formState.errors.note?.message} placeholder="10–500 ký tự" {...register('note')} />
      {uphold && <CheckField label="Áp dụng kỷ luật cho tác giả" hint="Tính theo thang kỷ luật lũy tiến (BR-ADM-USR-002): cảnh cáo, khóa tạm thời hoặc cấm theo số vi phạm đã xác nhận." {...register('applySanction')} />}
      <ServerError message={error} />
      <FormActions onCancel={onHide} pending={pending} danger={uphold} submitLabel={uphold ? 'Xác nhận vi phạm' : 'Bác bỏ báo cáo'} />
    </form>
  );
}
