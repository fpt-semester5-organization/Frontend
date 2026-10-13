import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
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
  cancelTo: string;
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Công khai', hint: 'Mọi người xem được sau khi qua kiểm duyệt.' },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', hint: 'Chỉ bạn xem được bài viết này.' },
] as const;

const CARD = 'rounded-xl bg-surface-container-lowest p-space-lg shadow-card';

/** Form đăng/sửa bài (SCR-27): tiêu đề 10–150 ký tự, nội dung không rỗng, PUBLIC | PRIVATE, tệp đính kèm. */
export const PostForm: React.FC<PostFormProps> = ({ mode, defaultValues, submittingIntent, onSubmit, cancelTo }) => {
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

  return (
    <form
      onSubmit={submitWith(mode === 'edit' ? 'save' : 'publish')}
      noValidate
      className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12"
    >
      <section className="flex flex-col gap-space-lg lg:col-span-8">
        <div className={cn(CARD, 'space-y-space-md')}>
          <div className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="post-title" className="font-label-sm text-label-sm text-outline">
                Tiêu đề bài viết <span className="text-secondary">*</span>
              </label>
              <span className="font-label-sm text-label-sm text-outline">
                {titleLength} / {POST_TITLE_MAX}
              </span>
            </div>
            <input
              id="post-title"
              type="text"
              maxLength={POST_TITLE_MAX}
              placeholder="Nhập tiêu đề bài viết (10–150 ký tự)"
              {...register('title')}
              aria-invalid={!!errors.title}
              className={cn(INPUT_CLASS, 'font-headline-md text-headline-md', errors.title && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.title?.message}</FieldError>
          </div>
          <div className="space-y-space-xs">
            <label htmlFor="post-content" className="font-label-sm text-label-sm text-outline">
              Nội dung <span className="text-secondary">*</span>
            </label>
            <textarea
              id="post-content"
              rows={14}
              placeholder="Chia sẻ kinh nghiệm ẩm thực chay của bạn tại đây…"
              {...register('content')}
              aria-invalid={!!errors.content}
              className={cn(INPUT_CLASS, 'resize-y font-body-lg text-body-lg leading-relaxed', errors.content && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.content?.message}</FieldError>
          </div>
        </div>

        <div className={cn(CARD, 'space-y-space-sm')}>
          <h2 className="font-headline-sm text-headline-sm text-primary">Tệp đính kèm</h2>
          <AttachmentInput
            value={file}
            onChange={(next) => {
              setFile(next);
              setFileError(undefined);
            }}
            serverError={fileError}
            disabled={busy}
          />
        </div>
      </section>

      <aside className="flex flex-col gap-space-lg lg:sticky lg:top-24 lg:col-span-4">
        <fieldset className={cn(CARD, 'space-y-space-md')}>
          <legend className="float-left mb-space-md flex w-full items-center gap-space-xs text-primary">
            <Icon name="visibility" className="text-[20px]" />
            <span className="font-headline-sm text-[16px] text-on-surface">Cài đặt hiển thị</span>
          </legend>
          {visibilityOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-space-sm rounded-lg bg-surface-container-low p-space-sm hover:bg-surface-container has-[:checked]:bg-primary-fixed"
            >
              <input type="radio" value={option.value} {...register('visibility')} className="mt-1 accent-primary" />
              <span>
                <span className="block font-label-md text-label-md text-on-surface">{option.label}</span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">{option.hint}</span>
              </span>
            </label>
          ))}
          <FieldError>{errors.visibility?.message}</FieldError>
        </fieldset>

        <div className={cn(CARD, 'space-y-space-sm shadow-card-hover')}>
          <Button type="submit" size="lg" className="w-full" loading={submittingIntent === (mode === 'edit' ? 'save' : 'publish')} disabled={busy}>
            {submittingIntent === null && <Icon name="send" className="text-[18px]" />}
            {mode === 'edit' ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
          </Button>
          {mode === 'create' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={submitWith('draft')}
              loading={submittingIntent === 'draft'}
              disabled={busy}
            >
              {submittingIntent !== 'draft' && <Icon name="save" className="text-[18px] text-outline" />}
              Lưu bản nháp
            </Button>
          )}
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Bài mới được AI kiểm duyệt; sửa bài đã đăng sẽ được kiểm duyệt lại. Giới hạn đăng: 02 bài/ngày (tài khoản dưới 3
            ngày), sau đó 10 bài/ngày.
          </p>
          <Link
            to={cancelTo}
            className="block w-full rounded-lg px-space-lg py-2 text-center font-label-sm text-label-sm text-outline no-underline hover:text-on-surface"
          >
            Hủy và quay lại
          </Link>
        </div>
      </aside>
    </form>
  );
};
