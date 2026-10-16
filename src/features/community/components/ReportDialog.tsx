import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/forms';
import { Modal } from '@/components/ui/Modal';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { notifyApiError, notifyInfo, notifySuccess } from '@/lib/notify';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { useCreateReport } from '../hooks/useReport';
import {
  REPORT_EVIDENCE_MAX,
  REPORT_EVIDENCE_MIN,
  VIOLATION_TYPE_OPTIONS,
  reportFormSchema,
  type ReportFormValues,
} from '../types/community.schemas';
import type { ContentRef, ReportTargetType } from '../types/community.types';

interface ReportDialogProps {
  show: boolean;
  /** Bài viết/công thức đang xem (để làm mới đúng dữ liệu sau khi báo cáo). */
  content: ContentRef;
  target: { type: ReportTargetType; id: number } | null;
  onClose: () => void;
  /** Gọi sau khi báo cáo thành công: nội dung đích đã bị ẩn (BR-INT-REPORT-01). */
  onReported?: () => void;
}

const TARGET_LABEL: Record<ReportTargetType, string> = {
  POST: 'bài viết',
  RECIPE: 'công thức',
  VIDEO: 'video',
  COMMENT: 'bình luận',
};

/** Báo cáo vi phạm (FN-COMM-05): loại vi phạm + mô tả 10–500 ký tự. */
export const ReportDialog: React.FC<ReportDialogProps> = ({ show, content, target, onClose, onReported }) => {
  const report = useCreateReport(content);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { evidenceSummary: '' },
  });

  useEffect(() => {
    if (show) reset({ evidenceSummary: '' });
  }, [show, reset]);

  const evidenceLength = watch('evidenceSummary')?.trim().length ?? 0;

  const onSubmit = (values: ReportFormValues) => {
    if (!target) return;
    report.mutate(
      { targetType: target.type, targetId: target.id, ...values },
      {
        onSuccess: (res) => {
          notifySuccess(res.message);
          onClose();
          onReported?.();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (applyServerFieldErrors(error, setError, ['violationType', 'evidenceSummary'])) return;
          if (apiError.errorCode === 'ERR_REPORT_DUPLICATE') {
            notifyInfo(apiError.message || 'Bạn đã báo cáo nội dung này.');
            onClose();
            return;
          }
          notifyApiError(error);
        },
      }
    );
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      title={`Báo cáo ${target ? TARGET_LABEL[target.type] : 'vi phạm'}`}
      size="sm"
      locked={report.isPending}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-space-sm p-space-lg">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Nội dung bị báo cáo được ẩn ngay để quản trị viên xem xét.
        </p>
        <fieldset className="flex flex-col gap-space-sm">
          <legend className="sr-only">Loại vi phạm</legend>
          {VIOLATION_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-space-sm rounded-lg bg-surface-container-low p-space-sm hover:bg-surface-container has-[:checked]:bg-primary-fixed"
            >
              <input type="radio" value={option.value} {...register('violationType')} className="mt-1 accent-primary" />
              <span>
                <span className="block font-body-md text-body-md text-on-surface">{option.label}</span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">{option.hint}</span>
              </span>
            </label>
          ))}
          <FieldError>{errors.violationType?.message}</FieldError>
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="report-evidence" className="sr-only">
            Mô tả vi phạm
          </label>
          <textarea
            id="report-evidence"
            rows={3}
            maxLength={REPORT_EVIDENCE_MAX}
            {...register('evidenceSummary')}
            aria-invalid={!!errors.evidenceSummary}
            placeholder={`Mô tả chi tiết vi phạm (${REPORT_EVIDENCE_MIN}–${REPORT_EVIDENCE_MAX} ký tự)…`}
            className={cn(
              'w-full resize-none rounded-lg bg-surface-container-low p-space-sm font-body-sm text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary',
              errors.evidenceSummary && 'ring-1 ring-error focus:ring-error'
            )}
          />
          <div className="flex justify-between gap-2">
            <FieldError>{errors.evidenceSummary?.message}</FieldError>
            <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant">
              {evidenceLength}/{REPORT_EVIDENCE_MAX}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-space-sm pt-space-sm">
          <Button variant="ghost" onClick={onClose} disabled={report.isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="accent" loading={report.isPending}>
            Gửi báo cáo
          </Button>
        </div>
      </form>
    </Modal>
  );
};
