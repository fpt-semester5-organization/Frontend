import React, { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { notifyApiError } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { COMMENT_MAX, COMMENT_MIN, commentFormSchema, type CommentFormValues } from '../types/community.schemas';

interface CommentFormProps {
  /** Gửi nội dung; reject khi lỗi để form giữ nguyên dữ liệu đã nhập. */
  onSubmit: (content: string) => Promise<unknown>;
  submitLabel: string;
  label: string;
  initialContent?: string;
  placeholder?: string;
  /** Số giây còn phải chờ giữa 2 bình luận (BR-USR-04); > 0 thì khóa nút gửi. */
  cooldownSeconds?: number;
  autoFocus?: boolean;
  rows?: number;
  onCancel?: () => void;
}

/** Hộp nhập bình luận / trả lời / sửa (content 2–500 ký tự). */
export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  submitLabel,
  label,
  initialContent = '',
  placeholder = 'Chia sẻ cảm nghĩ hoặc đặt câu hỏi…',
  cooldownSeconds = 0,
  autoFocus,
  rows = 3,
  onCancel,
}) => {
  const fieldId = useId();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: initialContent },
  });

  const length = watch('content')?.trim().length ?? 0;

  const submit = async (values: CommentFormValues) => {
    try {
      await onSubmit(values.content);
      reset({ content: '' });
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, ['content'])) notifyApiError(error);
    }
  };

  const coolingDown = cooldownSeconds > 0;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex w-full flex-col gap-space-xs">
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        maxLength={COMMENT_MAX}
        autoFocus={autoFocus}
        placeholder={placeholder}
        {...register('content')}
        aria-invalid={!!errors.content}
        aria-describedby={`${fieldId}-hint`}
        className={cn(
          'w-full resize-none rounded-lg bg-surface-container-lowest p-space-sm font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary',
          errors.content && 'ring-1 ring-error focus:ring-error'
        )}
      />
      <FieldError>{errors.content?.message}</FieldError>
      <div id={`${fieldId}-hint`} className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {length}/{COMMENT_MAX} (tối thiểu {COMMENT_MIN} ký tự)
          </span>
          {coolingDown && (
            <span className="inline-flex items-center gap-1 rounded bg-secondary-fixed/50 px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed-variant">
              <Icon name="schedule" className="text-[14px]" />
              Giãn cách spam: {cooldownSeconds}s
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-space-xs">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            disabled={coolingDown}
            className="bg-primary hover:bg-primary-container"
          >
            {coolingDown ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="hourglass_top" className="text-[15px] animate-spin" />
                Chờ {cooldownSeconds}s
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
