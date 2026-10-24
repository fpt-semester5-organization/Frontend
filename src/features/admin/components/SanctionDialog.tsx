import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { notifySuccess } from '@/lib/notify';
import { useUpdateUserStatus } from '../hooks/useAdminUsers';
import { ACCOUNT_STATUS } from '../lib/labels';
import { formatServerDateTime } from '@/lib/serverDate';
import {
  SANCTION_ACTIONS,
  SANCTION_LABEL,
  blockedReason,
  defaultDuration,
  isSevere,
  needsDuration,
  recommendSanction,
  sanctionConsequences,
  statusTransitionText,
  type SanctionTarget,
} from '../lib/sanctions';
import { handleWriteError } from '../lib/writeError';
import type { SanctionAction } from '../types/admin.types';
import { CONTROL, ServerMessageDialog } from './AdminUi';

const REASON_MIN = 10;
const REASON_MAX = 500;
const DURATION_PRESETS = [3, 7, 10, 30];

/** Luật validate theo SCR-39: action bắt buộc; durationDays bắt buộc khi SUSPEND/RESTRICT_COMMENT; reason 10–500 ký tự. */
const sanctionSchema = z
  .object({
    action: z.enum(['WARN', 'RESTRICT_COMMENT', 'SUSPEND', 'BAN', 'REACTIVATE']),
    durationDays: z.number({ invalid_type_error: 'Nhập số ngày' }).int('Số ngày phải là số nguyên').positive('Số ngày phải lớn hơn 0').optional(),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN, `Lý do cần ít nhất ${REASON_MIN} ký tự`)
      .max(REASON_MAX, `Lý do tối đa ${REASON_MAX} ký tự`),
  })
  .superRefine((value, ctx) => {
    if (needsDuration(value.action) && !value.durationDays)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationDays'], message: 'Nhập số ngày áp dụng (lớn hơn 0)' });
  });

type SanctionValues = z.infer<typeof sanctionSchema>;

interface SanctionDialogProps {
  show: boolean;
  onClose: () => void;
  target: SanctionTarget & { fullName?: string };
  /** Admin đang đăng nhập: không được tự xử phạt (BR-ADM-USR-001). */
  currentUserId?: number;
}

/**
 * Xử phạt / đổi trạng thái tài khoản (FN-ADM-02). Hai bước: chọn mức + lý do → xem lại hậu quả → mới gửi
 * PUT /admin/users/{id}/status. Hậu quả mô tả đúng việc Backend làm (lib/sanctions.ts).
 */
export const SanctionDialog: React.FC<SanctionDialogProps> = ({ show, onClose, target, currentUserId }) => {
  const update = useUpdateUserStatus(target.userId);
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const recommendation = recommendSanction(target.countViolationReports);
  const firstAllowed = SANCTION_ACTIONS.find((action) => !blockedReason(action, target, currentUserId)) ?? 'WARN';
  const initialAction =
    recommendation && !blockedReason(recommendation.action, target, currentUserId) ? recommendation.action : firstAllowed;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<SanctionValues>({
    resolver: zodResolver(sanctionSchema),
    defaultValues: { action: initialAction, durationDays: defaultDuration(initialAction, target.countViolationReports), reason: '' },
  });

  // Mở lại hộp thoại: về bước 1 với mức đề xuất.
  useEffect(() => {
    if (!show) return;
    setStep('form');
    setFormError(null);
    reset({ action: initialAction, durationDays: defaultDuration(initialAction, target.countViolationReports), reason: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đặt lại khi mở
  }, [show]);

  const action = watch('action');
  const durationDays = watch('durationDays');
  const reason = watch('reason') ?? '';
  const consequences = useMemo(
    () => sanctionConsequences(action, target, needsDuration(action) ? durationDays : undefined),
    [action, durationDays, target]
  );

  const chooseAction = (next: SanctionAction) => {
    setValue('action', next, { shouldValidate: false });
    setValue('durationDays', defaultDuration(next, target.countViolationReports));
  };

  const close = () => {
    if (update.isPending) return;
    onClose();
  };

  const submit = (values: SanctionValues) => {
    setFormError(null);
    update.mutate(
      {
        action: values.action,
        reason: values.reason.trim(),
        ...(needsDuration(values.action) ? { durationDays: values.durationDays } : {}),
      },
      {
        onSuccess: (res) => {
          const until = res.data.lockedUntil ? ` Hạn: ${formatServerDateTime(res.data.lockedUntil)}.` : '';
          notifySuccess(`${res.message || 'Đã cập nhật trạng thái.'}${until}`);
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, {
            setError,
            fields: ['action', 'durationDays', 'reason'],
            onConflict: setConflict,
          });
          // 400 không kèm details[] (validator Backend chỉ trả message): hiện trong hộp thoại, giữ dữ liệu đã nhập.
          if (apiError.status === 400 && apiError.details.length === 0) {
            setFormError(apiError.message);
            setStep('form');
          }
        },
      }
    );
  };

  const name = target.fullName || target.email || `Người dùng #${target.userId}`;
  const confirmLabel =
    `Xác nhận ${SANCTION_LABEL[action].toLowerCase()}` + (needsDuration(action) && durationDays ? ` ${durationDays} ngày` : '');

  return (
    <>
      <Modal show={show} onHide={close} title={step === 'form' ? 'Xử lý tài khoản' : 'Xem lại trước khi xác nhận'} size="lg" locked={update.isPending}>
        <form onSubmit={handleSubmit(step === 'form' ? () => setStep('review') : submit)} noValidate className="flex max-h-[80vh] flex-col">
          <div className="flex flex-col gap-space-md overflow-y-auto p-space-lg">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-container-low px-4 py-3 font-body-sm text-body-sm">
              <span className="min-w-0 font-label-md text-label-md text-on-surface [overflow-wrap:anywhere]">{name}</span>
              <span className="text-on-surface-variant">Hiện tại: {ACCOUNT_STATUS[target.accountStatus].label}</span>
              <span className="text-on-surface-variant">Vi phạm đã xác nhận: {target.countViolationReports ?? 0}</span>
            </div>

            {formError && <FormAlert tone="error">{formError}</FormAlert>}

            {step === 'form' ? (
              <>
                {recommendation ? (
                  <FormAlert tone="info" title="Đề xuất theo thang kỷ luật">
                    {recommendation.rule}.{' '}
                    {action !== recommendation.action && !blockedReason(recommendation.action, target, currentUserId) && (
                      <button
                        type="button"
                        onClick={() => {
                          chooseAction(recommendation.action);
                          if (recommendation.durationDays) setValue('durationDays', recommendation.durationDays);
                        }}
                        className="font-label-md text-label-md text-primary underline underline-offset-2"
                      >
                        Dùng mức đề xuất
                      </button>
                    )}
                  </FormAlert>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Tài khoản chưa có vi phạm được xác nhận, thang kỷ luật chưa đề xuất mức nào.
                  </p>
                )}

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-label-md text-label-md text-on-surface">Mức xử lý</legend>
                  {SANCTION_ACTIONS.map((option) => {
                    const blocked = blockedReason(option, target, currentUserId);
                    return (
                      <label
                        key={option}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                          blocked ? 'cursor-not-allowed border-surface-container opacity-60' : 'cursor-pointer hover:bg-surface-container-low',
                          action === option && !blocked ? 'border-primary bg-primary/5' : 'border-surface-container'
                        )}
                      >
                        <input
                          type="radio"
                          name="sanction-action"
                          value={option}
                          checked={action === option}
                          disabled={!!blocked}
                          onChange={() => chooseAction(option)}
                          className="mt-1 accent-primary"
                        />
                        <span className="flex flex-col">
                          <span className="font-label-md text-label-md text-on-surface">{SANCTION_LABEL[option]}</span>
                          {blocked && <span className="font-body-sm text-body-sm text-on-surface-variant">{blocked}</span>}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {needsDuration(action) && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sanction-days" className="font-label-md text-label-md text-on-surface">
                      Số ngày áp dụng <span className="text-secondary">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="sanction-days"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        aria-invalid={!!errors.durationDays}
                        aria-describedby={errors.durationDays ? 'sanction-days-err' : undefined}
                        className={cn(CONTROL, 'w-28')}
                        {...register('durationDays', { setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)) })}
                      />
                      {DURATION_PRESETS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setValue('durationDays', days, { shouldValidate: true })}
                          aria-pressed={durationDays === days}
                          className={cn(
                            'rounded-full border px-3 py-1 font-label-sm text-label-sm transition-colors',
                            durationDays === days ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'
                          )}
                        >
                          {days} ngày
                        </button>
                      ))}
                    </div>
                    <FieldError id="sanction-days-err">{errors.durationDays?.message}</FieldError>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sanction-reason" className="font-label-md text-label-md text-on-surface">
                    Lý do <span className="text-secondary">*</span>
                  </label>
                  <textarea
                    id="sanction-reason"
                    rows={3}
                    maxLength={REASON_MAX}
                    aria-invalid={!!errors.reason}
                    aria-describedby="sanction-reason-hint"
                    placeholder="Lý do được gửi kèm email cho người dùng và ghi vào nhật ký kiểm toán"
                    className={cn(CONTROL, 'resize-y')}
                    {...register('reason')}
                  />
                  <p id="sanction-reason-hint" className="text-right font-label-sm text-label-sm text-on-surface-variant">
                    {reason.trim().length}/{REASON_MAX}
                  </p>
                  <FieldError>{errors.reason?.message}</FieldError>
                </div>
              </>
            ) : (
              <ConsequencePanel
                action={action}
                from={target.accountStatus}
                consequences={consequences}
                reason={reason.trim()}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-surface-container px-space-lg py-space-md">
            {step === 'form' ? (
              <>
                <Button variant="secondary" onClick={close}>
                  Hủy
                </Button>
                <Button type="submit" disabled={!!blockedReason(action, target, currentUserId)}>
                  Xem hậu quả
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setStep('form')} disabled={update.isPending}>
                  Quay lại sửa
                </Button>
                <Button type="submit" variant={isSevere(action) ? 'danger' : 'primary'} loading={update.isPending}>
                  {confirmLabel}
                </Button>
              </>
            )}
          </div>
        </form>
      </Modal>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

const ConsequencePanel: React.FC<{
  action: SanctionAction;
  from: SanctionTarget['accountStatus'];
  consequences: ReturnType<typeof sanctionConsequences>;
  reason: string;
}> = ({ action, from, consequences, reason }) => (
  <section aria-labelledby="consequence-title" className="flex flex-col gap-3">
    <h3 id="consequence-title" className="font-label-lg text-label-lg text-on-surface">
      Khi xác nhận “{SANCTION_LABEL[action]}”:
    </h3>
    <dl className="grid gap-2 rounded-xl border border-surface-container p-4 font-body-sm text-body-sm sm:grid-cols-2">
      <div>
        <dt className="text-on-surface-variant">Trạng thái tài khoản</dt>
        <dd className="font-label-md text-label-md text-on-surface">{statusTransitionText(from, consequences.nextStatus)}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Thời hạn</dt>
        <dd className="font-label-md text-label-md text-on-surface">
          {consequences.lockedUntil
            ? `Đến ${formatDateTime(consequences.lockedUntil)}`
            : action === 'BAN'
              ? 'Vĩnh viễn'
              : 'Không khóa'}
        </dd>
      </div>
    </dl>
    <ul className="flex flex-col gap-2">
      {consequences.effects.map((effect) => (
        <li key={effect} className="flex items-start gap-2 font-body-md text-body-md text-on-surface">
          <Icon name={effect.startsWith('Lưu ý') ? 'warning' : 'check'} className={cn('mt-0.5 text-[20px]', effect.startsWith('Lưu ý') ? 'text-warning' : 'text-primary')} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{effect}</span>
        </li>
      ))}
    </ul>
    <div className="rounded-xl bg-surface-container-low px-4 py-3 font-body-sm text-body-sm">
      <p className="text-on-surface-variant">Lý do gửi kèm</p>
      <p className="whitespace-pre-wrap break-words text-on-surface">{reason}</p>
    </div>
  </section>
);
