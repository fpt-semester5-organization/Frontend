import React, { useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { notifyApiError, notifyInfo, notifySuccess } from '@/lib/notify';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { useCreateReport } from '../hooks/useReport';
import {
  REPORT_EVIDENCE_MAX,
  VIOLATION_TYPE_OPTIONS,
  reportFormSchema,
  type ReportFormValues,
} from '../types/community.schemas';
import type { ReportTargetType } from '../types/community.types';

interface ReportDialogProps {
  show: boolean;
  postId: number;
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
export const ReportDialog: React.FC<ReportDialogProps> = ({ show, postId, target, onClose, onReported }) => {
  const report = useCreateReport(postId);
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

  const evidenceLength = watch('evidenceSummary')?.length ?? 0;

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

  const label = target ? TARGET_LABEL[target.type] : 'nội dung';

  return (
    <Modal show={show} onHide={report.isPending ? undefined : onClose} centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Header closeButton={!report.isPending} closeLabel="Đóng">
          <Modal.Title as="h2" className="text-lg font-semibold">
            Báo cáo {label}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <p className="text-sm text-gray-600">
            Nội dung bị báo cáo sẽ được ẩn ngay để quản trị viên xem xét. Mỗi ngày bạn gửi được tối đa 10
            báo cáo.
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-900">Loại vi phạm</legend>
            <div className="space-y-2">
              {VIOLATION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 ring-gray-200 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-600"
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('violationType')}
                    className="mt-1 accent-brand-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors.violationType && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.violationType.message}
              </p>
            )}
          </fieldset>
          <div>
            <label htmlFor="report-evidence" className="mb-1 block text-sm font-medium text-gray-900">
              Mô tả vi phạm
            </label>
            <textarea
              id="report-evidence"
              rows={3}
              maxLength={REPORT_EVIDENCE_MAX}
              {...register('evidenceSummary')}
              aria-invalid={!!errors.evidenceSummary}
              aria-describedby="report-evidence-hint"
              placeholder="Ví dụ: bài viết gắn nhãn thuần chay nhưng dùng nước mắm."
              className={cn(
                'w-full rounded-md bg-white px-3 py-2 text-sm ring-1 ring-gray-300 focus:ring-2 focus:ring-brand-600 focus:outline-none',
                errors.evidenceSummary && 'ring-red-500'
              )}
            />
            <div id="report-evidence-hint" className="mt-1 flex justify-between gap-2 text-xs">
              <span className="text-red-600">{errors.evidenceSummary?.message}</span>
              <span className="text-gray-500">
                {evidenceLength}/{REPORT_EVIDENCE_MAX}
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={report.isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" loading={report.isPending}>
            Gửi báo cáo
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};
