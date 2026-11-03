import React, { useEffect, useRef, useState } from 'react';
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
  /** Cờ đánh dấu người dùng đã chọn xóa ảnh/video hiện tại của bài viết. */
  removeExistingMedia?: boolean;
  intent: PostSubmitIntent;
}

export interface PostFormHelpers {
  setError: UseFormSetError<PostFormValues>;
  setFileError: (message: string) => void;
}

interface PostFormProps {
  mode: 'create' | 'edit';
  defaultValues: PostFormValues;
  initialImageUrl?: string | null;
  initialVideoUrl?: string | null;
  initialVisibility?: 'PUBLIC' | 'PRIVATE' | null;
  isQuarantined?: boolean;
  submittingIntent: PostSubmitIntent | null;
  onSubmit: (submission: PostFormSubmission, helpers: PostFormHelpers) => void;
  cancelTo: string;
}

interface VisibilityOption {
  value: 'KEEP' | 'PUBLIC' | 'PRIVATE';
  icon: string;
  label: string;
  currentBadge?: string;
}

const CARD = 'rounded-2xl bg-surface-container-lowest p-space-lg shadow-card border border-outline-variant/30';

/** Form đăng/sửa bài (SCR-27): tiêu đề 10–150 ký tự, nội dung không rỗng, PUBLIC | PRIVATE, tệp đính kèm. */
export const PostForm: React.FC<PostFormProps> = ({
  mode,
  defaultValues,
  initialImageUrl,
  initialVideoUrl,
  initialVisibility,
  isQuarantined,
  submittingIntent,
  onSubmit,
  cancelTo,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [removeExistingMedia, setRemoveExistingMedia] = useState<boolean>(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PostFormValues>({ resolver: zodResolver(postFormSchema), defaultValues });

  const titleLength = watch('title')?.length ?? 0;
  const contentValue = watch('content');
  const busy = submittingIntent !== null;

  // Tự động co giãn chiều cao của textarea theo nội dung ("text to tới đâu tab nội dung to tới đó")
  useEffect(() => {
    const el = contentTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(96, el.scrollHeight)}px`;
  }, [contentValue]);

  const submitWith = (intent: PostSubmitIntent) =>
    handleSubmit((values) => {
      setFileError(undefined);
      onSubmit({ values, dirty: dirtyFields, file, removeExistingMedia, intent }, { setError, setFileError });
    });

  const currentVisibilityLabel = initialVisibility === 'PRIVATE' ? 'Chỉ mình tôi' : 'Công khai';
  const visibilityOptions: VisibilityOption[] =
    mode === 'edit'
      ? [
          {
            value: 'KEEP',
            icon: 'restore',
            label: 'Giữ nguyên',
            currentBadge: currentVisibilityLabel,
          },
          {
            value: 'PUBLIC',
            icon: 'public',
            label: 'Chia sẻ công khai',
          },
          {
            value: 'PRIVATE',
            icon: 'lock',
            label: 'Lưu riêng tư',
          },
        ]
      : [
          {
            value: 'PUBLIC',
            icon: 'public',
            label: 'Chia sẻ công khai',
          },
          {
            value: 'PRIVATE',
            icon: 'lock',
            label: 'Lưu riêng tư',
          },
        ];

  const { ref: formContentRef, ...contentRegister } = register('content');

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
              <label htmlFor="post-title" className="flex items-center gap-1.5 font-label-md text-label-md font-medium text-on-surface">
                <span>Tiêu đề bài viết</span>
                <span className="font-normal text-on-surface-variant text-xs">(Không bắt buộc)</span>
              </label>
              <span className="font-label-sm text-label-sm text-outline">
                {titleLength} / {POST_TITLE_MAX}
              </span>
            </div>
            <input
              id="post-title"
              type="text"
              maxLength={POST_TITLE_MAX}
              placeholder="Một cái tên gợi nhớ cho món ăn hoặc khoảnh khắc hôm nay..."
              {...register('title')}
              aria-invalid={!!errors.title}
              className={cn(INPUT_CLASS, 'font-headline-md text-headline-md placeholder:text-on-surface-variant/40', errors.title && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.title?.message}</FieldError>
          </div>
          <div className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="post-content" className="flex items-center gap-1.5 font-label-md text-label-md font-medium text-on-surface">
                <span>Nội dung chia sẻ</span>
                <span className="font-semibold text-primary text-xs">• Bắt buộc</span>
              </label>
            </div>
            <textarea
              id="post-content"
              rows={3}
              placeholder="Kể cho cộng đồng về hương vị, bí quyết nấu hoặc câu chuyện ăn chay của bạn…"
              {...contentRegister}
              ref={(el) => {
                formContentRef(el);
                contentTextareaRef.current = el;
              }}
              aria-invalid={!!errors.content}
              className={cn(
                INPUT_CLASS,
                'min-h-[96px] resize-none overflow-hidden font-body-lg text-body-lg leading-relaxed placeholder:text-on-surface-variant/40 transition-[height] duration-75',
                errors.content && INPUT_ERROR_CLASS
              )}
            />
            <FieldError>{errors.content?.message}</FieldError>
          </div>
        </div>

        <div className={cn(CARD, 'space-y-space-sm')}>
          <div className="flex items-center gap-2 text-primary">
            <Icon name="perm_media" className="text-[20px]" />
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Ảnh hoặc Video món ăn</h2>
            <span className="font-label-xs text-label-xs text-outline font-normal">(Không bắt buộc)</span>
          </div>
          <AttachmentInput
            value={file}
            onChange={(next) => {
              setFile(next);
              setFileError(undefined);
            }}
            initialImageUrl={initialImageUrl}
            initialVideoUrl={initialVideoUrl}
            isInitialRemoved={removeExistingMedia}
            onRemoveInitial={() => setRemoveExistingMedia(true)}
            onRestoreInitial={() => setRemoveExistingMedia(false)}
            isQuarantined={isQuarantined}
            serverError={fileError}
            disabled={busy}
          />
        </div>
      </section>

      <aside className="flex flex-col gap-space-lg lg:sticky lg:top-24 lg:col-span-4">
        <fieldset className={cn(CARD, 'space-y-space-md')}>
          <legend className="float-left mb-space-sm flex w-full items-center gap-space-xs text-primary">
            <Icon name="visibility" className="text-[20px]" />
            <span className="font-headline-sm text-[16px] font-semibold text-on-surface">Cài đặt hiển thị</span>
          </legend>
          <div className="space-y-space-xs">
            {visibilityOptions.map((option) => (
              <label
                key={option.value}
                className="group flex cursor-pointer items-center gap-space-sm rounded-xl border border-outline-variant/40 bg-surface-container-low px-space-sm py-2.5 transition-all hover:border-primary/40 hover:bg-surface-container has-[:checked]:border-primary has-[:checked]:bg-primary-fixed/20"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register('visibility')}
                  className="accent-primary cursor-pointer shrink-0"
                />
                <span className="flex flex-1 flex-wrap items-center gap-1.5 font-label-md text-label-md font-medium text-on-surface">
                  <Icon name={option.icon} className="text-[16px] text-primary/80 group-has-[:checked]:text-primary shrink-0" />
                  <span>{option.label}</span>
                  {option.currentBadge && (
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant font-normal">
                      Hiện tại: {option.currentBadge}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <FieldError>{errors.visibility?.message}</FieldError>
        </fieldset>

        <div className={cn(CARD, 'space-y-space-md shadow-card-hover')}>
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
            loading={submittingIntent === (mode === 'edit' ? 'save' : 'publish')}
            disabled={busy}
          >
            {submittingIntent === null && (
              <Icon name={mode === 'edit' ? 'check_circle' : 'send'} className="text-[18px]" />
            )}
            {submittingIntent === (mode === 'edit' ? 'save' : 'publish') &&
            file &&
            (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov)$/i))
              ? 'Đang tải & AI duyệt video...'
              : mode === 'edit'
              ? 'Lưu thay đổi'
              : 'Chia sẻ bài viết'}
          </Button>

          {mode === 'create' && (
            <Button
              variant="outline"
              className="w-full active:scale-[0.98] transition-all cursor-pointer"
              onClick={submitWith('draft')}
              loading={submittingIntent === 'draft'}
              disabled={busy}
            >
              {submittingIntent !== 'draft' && <Icon name="save" className="text-[18px] text-outline" />}
              Lưu bản nháp
            </Button>
          )}

          <Link
            to={cancelTo}
            className="block w-full rounded-lg py-2 text-center font-label-sm text-label-sm text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors no-underline cursor-pointer"
          >
            Hủy và quay lại
          </Link>
        </div>
      </aside>
    </form>
  );
};
