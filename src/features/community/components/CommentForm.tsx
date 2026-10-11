import React, { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { notifyApiError } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { COMMENT_MAX, commentFormSchema, type CommentFormValues } from '../types/community.schemas';

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
  onCancel?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  submitLabel,
  label,
  initialContent = '',
  placeholder = 'Chia sẻ suy nghĩ của bạn...',
  cooldownSeconds = 0,
  autoFocus,
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

  const length = watch('content')?.length ?? 0;

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
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-2">
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        maxLength={COMMENT_MAX}
        autoFocus={autoFocus}
        placeholder={placeholder}
        {...register('content')}
        aria-invalid={!!errors.content}
        aria-describedby={`${fieldId}-hint`}
        className={cn(
          'w-full resize-y rounded-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-600 focus:outline-none',
          errors.content && 'ring-red-500'
        )}
      />
      <div id={`${fieldId}-hint`} className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-red-600">{errors.content?.message}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {length}/{COMMENT_MAX}
          </span>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </Button>
          )}
          <Button type="submit" size="sm" loading={isSubmitting} disabled={coolingDown}>
            {coolingDown ? `Chờ ${cooldownSeconds} giây` : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};
