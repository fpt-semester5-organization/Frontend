import React, { useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { POST_TITLE_MAX, postFormSchema, type PostFormValues } from '../types/community.schemas';
import { AttachmentInput } from './AttachmentInput';

export type PostSubmitIntent = 'draft' | 'publish' | 'save';

export interface PostFormSubmission {
  values: PostFormValues;
  /** Field người dùng đã sửa (khi sửa bài chỉ gửi các field này). */
  dirty: Partial<Record<keyof PostFormValues, boolean>>;
  file: File | null;
  intent: PostSubmitIntent;
}

export interface PostFormHelpers {
  setError: UseFormSetError<PostFormValues>;
  setFileError: (message: string) => void;
}

interface PostFormProps {
  mode: 'create' | 'edit';
  defaultValues: PostFormValues;
  submittingIntent: PostSubmitIntent | null;
  onSubmit: (submission: PostFormSubmission, helpers: PostFormHelpers) => void;
  onCancel: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Công khai', hint: 'Mọi người đều xem được sau khi qua kiểm duyệt.' },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', hint: 'Chỉ bạn xem được bài viết này.' },
] as const;

/** Form đăng/sửa bài (SCR-27): tiêu đề 10–150 ký tự, nội dung không rỗng, PUBLIC | PRIVATE. */
export const PostForm: React.FC<PostFormProps> = ({ mode, defaultValues, submittingIntent, onSubmit, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PostFormValues>({ resolver: zodResolver(postFormSchema), defaultValues });

  const titleLength = watch('title')?.length ?? 0;
  const busy = submittingIntent !== null;

  const submitWith = (intent: PostSubmitIntent) =>
    handleSubmit((values) => {
      setFileError(undefined);
      onSubmit({ values, dirty: dirtyFields, file, intent }, { setError, setFileError });
    });

  const visibilityOptions =
    mode === 'edit'
      ? [{ value: 'KEEP', label: 'Giữ nguyên', hint: 'Không đổi chế độ hiển thị hiện tại.' }, ...VISIBILITY_OPTIONS]
      : VISIBILITY_OPTIONS;

  const inputClass =
    'w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-600 focus:outline-none';

  return (
    <form onSubmit={submitWith(mode === 'edit' ? 'save' : 'publish')} noValidate className="space-y-5">
      <div>
        <label htmlFor="post-title" className="mb-1 block text-sm font-medium text-gray-900">
          Tiêu đề <span className="text-red-600">*</span>
        </label>
        <input
          id="post-title"
          type="text"
          maxLength={POST_TITLE_MAX}
          placeholder="Ví dụ: Một tuần ăn chay đầu tiên của tôi"
          {...register('title')}
          aria-invalid={!!errors.title}
          aria-describedby="post-title-hint"
          className={cn(inputClass, errors.title && 'ring-red-500')}
        />
        <div id="post-title-hint" className="mt-1 flex justify-between gap-2 text-xs">
          <span className="text-red-600">{errors.title?.message}</span>
          <span className="text-gray-500">
            {titleLength}/{POST_TITLE_MAX}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="post-content" className="mb-1 block text-sm font-medium text-gray-900">
          Nội dung <span className="text-red-600">*</span>
        </label>
        <textarea
          id="post-content"
          rows={10}
          placeholder="Chia sẻ kinh nghiệm, câu chuyện hoặc mẹo nấu ăn chay của bạn..."
          {...register('content')}
          aria-invalid={!!errors.content}
          aria-describedby="post-content-error"
          className={cn(inputClass, 'resize-y', errors.content && 'ring-red-500')}
        />
        <p id="post-content-error" className="mt-1 text-xs text-red-600">
          {errors.content?.message}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-900">Chế độ hiển thị</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {visibilityOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg bg-white p-3 ring-1 ring-gray-200 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-600"
            >
              <input
                type="radio"
                value={option.value}
                {...register('visibility')}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                <span className="block text-xs text-gray-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.visibility && <p className="mt-1 text-xs text-red-600">{errors.visibility.message}</p>}
      </fieldset>

      <AttachmentInput
        value={file}
        onChange={(next) => {
          setFile(next);
          setFileError(undefined);
        }}
        serverError={fileError}
        disabled={busy}
      />

      <p className="text-xs text-gray-500">
        Bài viết được AI kiểm duyệt trước khi hiển thị công khai. Sửa nội dung bài đã công khai sẽ được kiểm
        duyệt lại.
      </p>

      <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Hủy
        </Button>
        {mode === 'create' ? (
          <>
            <Button
              variant="secondary"
              onClick={submitWith('draft')}
              loading={submittingIntent === 'draft'}
              disabled={busy}
            >
              Lưu nháp
            </Button>
            <Button type="submit" loading={submittingIntent === 'publish'} disabled={busy}>
              Đăng bài
            </Button>
          </>
        ) : (
          <Button type="submit" loading={submittingIntent === 'save'} disabled={busy}>
            Lưu thay đổi
          </Button>
        )}
      </div>
    </form>
  );
};
