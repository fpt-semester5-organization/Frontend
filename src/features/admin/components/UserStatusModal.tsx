import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Field } from '@/components/ui/forms';
import { ACTION_LABEL } from '../lib/labels';
import { USER_ACTIONS, toUserStatusBody, userStatusSchema, type UserStatusForm } from '../schemas/admin.schemas';
import type { UserStatusBody } from '../types/admin.types';
import { SelectField, TextArea } from './fields';
import { FormActions, FormModal, ServerError } from './FormModal';

export interface UserStatusTarget {
  userId: number;
  fullName?: string;
  email?: string;
  accountStatus?: string;
}

/** FN-ADM-02 · thang kỷ luật lũy tiến BR-ADM-USR-002. `durationDays` bắt buộc với SUSPEND / RESTRICT_COMMENT. */
export function UserStatusModal({ target, pending, error, onSubmit, onHide }: { target: UserStatusTarget | null; pending?: boolean; error?: string | null; onSubmit: (body: UserStatusBody) => void; onHide: () => void }) {
  return (
    <FormModal show={target !== null} onHide={onHide} title="Đổi trạng thái & kỷ luật tài khoản">
      {target && <StatusForm target={target} pending={pending} error={error} onSubmit={onSubmit} onHide={onHide} />}
    </FormModal>
  );
}

function StatusForm({ target, pending, error, onSubmit, onHide }: { target: UserStatusTarget; pending?: boolean; error?: string | null; onSubmit: (body: UserStatusBody) => void; onHide: () => void }) {
  const { register, handleSubmit, watch, formState } = useForm<UserStatusForm>({
    resolver: zodResolver(userStatusSchema),
    defaultValues: { action: 'WARN', durationDays: '', reason: '' },
  });
  const action = watch('action');
  const needsDays = action === 'SUSPEND' || action === 'RESTRICT_COMMENT';
  const actions = USER_ACTIONS.filter((a) => !(a === 'REACTIVATE' && target.accountStatus === 'ACTIVE'));
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(toUserStatusBody(v)))} noValidate className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Tài khoản <strong className="text-on-surface">{target.fullName || target.email || `#${target.userId}`}</strong>. Phiên đăng nhập của người bị xử lý sẽ bị thu hồi và hệ thống gửi email thông báo. Thao tác được ghi vào nhật ký kiểm toán.
      </p>
      <SelectField label="Hành động" required error={formState.errors.action?.message} {...register('action')}>
        {actions.map((a) => (
          <option key={a} value={a}>
            {ACTION_LABEL[a]}
          </option>
        ))}
      </SelectField>
      {needsDays && <Field label="Số ngày" required inputMode="numeric" placeholder="Ví dụ 3" error={formState.errors.durationDays?.message} hint={<span className="font-label-sm text-label-sm text-on-surface-variant">Thang gợi ý: 4–6 vi phạm khóa 3 ngày, 7–9 khóa 10 ngày, 10–12 khóa 30 ngày, từ 13 cấm.</span>} {...register('durationDays')} />}
      <TextArea label="Lý do" required maxLength={500} placeholder="10–500 ký tự" error={formState.errors.reason?.message} {...register('reason')} />
      <ServerError message={error} />
      <FormActions onCancel={onHide} submitLabel="Áp dụng" pending={pending} danger={action === 'BAN' || action === 'SUSPEND'} />
    </form>
  );
}
