import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { moderationDecisionSchema, type ModerationDecisionForm } from '../schemas/admin.schemas';
import { CheckField, TextArea } from './fields';
import { FormActions, FormModal, ServerError } from './FormModal';
import { SOURCE_LABEL, TARGET_LABEL, VIOLATION_LABEL } from '../lib/labels';
import type { ModerationTargetType, ReportSource, ViolationType } from '../types/admin.types';

export interface DecisionTarget {
  reportId: number;
  decision: 'UPHOLD' | 'DISMISS';
  label: string;
  targetType?: ModerationTargetType;
  targetId?: number;
  authorName?: string;
  violationType?: ViolationType;
  targetTitle?: string;
  targetContent?: string;
  evidenceSummary?: string;
  reportSource?: ReportSource;
}

/** FN-ADM-05: quyết định UPHOLD (xác nhận vi phạm) / DISMISS (bác bỏ) kèm ghi chú 10–500 ký tự, tùy chọn áp dụng kỷ luật. */
export function DecisionModal({
  target,
  pending,
  error,
  onSubmit,
  onHide,
}: {
  target: DecisionTarget | null;
  pending?: boolean;
  error?: string | null;
  onSubmit: (v: { note: string; applySanction: boolean }) => void;
  onHide: () => void;
}) {
  const uphold = target?.decision === 'UPHOLD';
  return (
    <FormModal
      show={target !== null}
      onHide={onHide}
      title={uphold ? 'Xác nhận vi phạm nội dung' : 'Bác bỏ báo cáo'}
      size="lg"
    >
      {target && <DecisionForm target={target} pending={pending} error={error} onSubmit={onSubmit} onHide={onHide} />}
    </FormModal>
  );
}

function DecisionForm({
  target,
  pending,
  error,
  onSubmit,
  onHide,
}: {
  target: DecisionTarget;
  pending?: boolean;
  error?: string | null;
  onSubmit: (v: { note: string; applySanction: boolean }) => void;
  onHide: () => void;
}) {
  const uphold = target.decision === 'UPHOLD';
  const { register, handleSubmit, formState } = useForm<ModerationDecisionForm>({
    resolver: zodResolver(moderationDecisionSchema),
    defaultValues: { note: '', applySanction: false },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit({ note: v.note, applySanction: uphold ? !!v.applySanction : false }))}
      noValidate
      className="flex flex-col gap-4"
    >
      {/* Khối tóm tắt thông tin đối tượng được kiểm duyệt */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-container-high bg-surface-container-low/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-secondary">#RPT-{target.reportId}</span>
            {target.reportSource && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">
                  {target.reportSource === 'AI_SCAN' ? 'smart_toy' : 'group'}
                </span>
                {SOURCE_LABEL[target.reportSource] ?? target.reportSource}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-on-surface">
              {target.targetType ? `${TARGET_LABEL[target.targetType] ?? target.targetType} #${target.targetId}` : target.label}
            </span>
            {target.violationType && (
              <span className="rounded-md border border-error/30 bg-error-container/20 px-2 py-0.5 text-xs font-bold text-error">
                {VIOLATION_LABEL[target.violationType] ?? target.violationType}
              </span>
            )}
          </div>
        </div>

        {target.authorName && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-medium text-on-surface">Tác giả:</span>
            <span className="font-semibold text-primary">{target.authorName}</span>
          </div>
        )}

        {target.targetTitle && (
          <div className="text-sm font-semibold text-on-surface">
            {target.targetTitle}
          </div>
        )}

        {target.targetContent && (
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3 text-xs leading-relaxed text-on-surface italic">
            "{target.targetContent}"
          </div>
        )}

        {target.evidenceSummary && (
          <div className="flex items-start gap-1.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined mt-0.5 text-[15px] text-warning shrink-0">warning</span>
            <span>
              <strong className="font-semibold text-on-surface">Ghi nhận vi phạm:</strong> {target.evidenceSummary}
            </span>
          </div>
        )}
      </div>

      {/* Thông điệp định hướng kết quả */}
      <div
        className={`flex items-start gap-2.5 rounded-xl p-3 text-xs sm:text-sm ${
          uphold
            ? 'border border-error/20 bg-error-container/15 text-on-surface'
            : 'border border-primary/20 bg-primary/10 text-on-surface'
        }`}
      >
        <span
          className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] ${
            uphold ? 'text-error' : 'text-primary'
          }`}
        >
          {uphold ? 'report' : 'verified_user'}
        </span>
        <span className="leading-relaxed">
          {uphold
            ? 'Xác nhận vi phạm: Nội dung này sẽ bị gỡ bỏ khỏi cộng đồng và ghi nhận vi phạm cho tác giả.'
            : 'Bác bỏ báo cáo: Báo cáo không chính xác. Nội dung sẽ được giữ nguyên hoặc khôi phục hiển thị bình thường.'}
        </span>
      </div>

      {/* Nhập lý do xử lý */}
      <TextArea
        label="Ghi chú quyết định"
        required
        maxLength={500}
        rows={4}
        error={formState.errors.note?.message}
        placeholder="Nhập ghi chú hoặc lý do xử lý vi phạm (tối thiểu 10 ký tự)..."
        {...register('note')}
      />

      {/* Checkbox kỷ luật (chỉ hiện khi Uphold) */}
      {uphold && (
        <CheckField
          label="Áp dụng chế tài kỷ luật cho tác giả"
          hint="Tự động áp dụng mức kỷ luật tương ứng (cảnh cáo hoặc tạm khóa) theo số lần vi phạm của tài khoản."
          {...register('applySanction')}
        />
      )}

      <ServerError message={error} />
      <FormActions
        onCancel={onHide}
        pending={pending}
        danger={uphold}
        submitLabel={uphold ? 'Xác nhận vi phạm' : 'Bác bỏ báo cáo'}
      />
    </form>
  );
}
