import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FieldError } from '@/components/ui/forms';
import { ATTACHMENT_ACCEPT, getAttachmentKind, validateAttachment } from '../types/community.schemas';

export interface AttachmentInputProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** URL ảnh hiện tại đã lưu trên máy chủ (chế độ sửa bài). */
  initialImageUrl?: string | null;
  /** URL video hiện tại đã lưu trên máy chủ (chế độ sửa bài). */
  initialVideoUrl?: string | null;
  /** Cờ đánh dấu tệp hiện tại đã bị người dùng chọn xóa. */
  isInitialRemoved?: boolean;
  /** Callback khi người dùng xóa tệp hiện tại. */
  onRemoveInitial?: () => void;
  /** Callback khi người dùng hoàn tác việc xóa tệp hiện tại. */
  onRestoreInitial?: () => void;
  /** Cờ báo hiệu nội dung/ảnh bài viết đang bị kiểm duyệt/tạm ẩn */
  isQuarantined?: boolean;
  /** Lỗi từ server (413 quá dung lượng, 422 sai thời lượng video) hiện ngay tại ô chọn tệp. */
  serverError?: string;
  disabled?: boolean;
}

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

/** Ảnh JPEG/PNG/WEBP ≤ 5 MB hoặc video MP4/MOV ≤ 100 MB, 10 giây–5 phút (FN-POST-08). */
export const AttachmentInput: React.FC<AttachmentInputProps> = ({
  value,
  onChange,
  initialImageUrl,
  initialVideoUrl,
  isInitialRemoved,
  onRemoveInitial,
  onRestoreInitial,
  isQuarantined,
  serverError,
  disabled,
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const kind = value ? getAttachmentKind(value) : null;
  const imagePreviewUrl = useMemo(() => (value && kind === 'image' ? URL.createObjectURL(value) : null), [value, kind]);
  const videoPreviewUrl = useMemo(() => (value && kind === 'video' ? URL.createObjectURL(value) : null), [value, kind]);

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    },
    [imagePreviewUrl, videoPreviewUrl]
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setChecking(true);
    const error = await validateAttachment(file);
    setChecking(false);
    setLocalError(error);
    onChange(error ? null : file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const error = localError ?? serverError;
  const hasInitialMedia = Boolean((initialImageUrl || initialVideoUrl) && !isInitialRemoved);

  return (
    <div className="space-y-space-sm">
      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
        Đính kèm hình ảnh (JPEG, PNG, WEBP tối đa 5 MB) hoặc video ngắn nấu ăn (MP4, MOV tối đa 100 MB, dài 10 giây – 5 phút) để chia sẻ thêm sinh động.
      </p>

      {/* Trường hợp 1: Người dùng đã chọn một tệp mới (video hoặc ảnh) từ máy */}
      {value ? (
        kind === 'video' ? (
          /* 1A. GIAO DIỆN PHÁT VIDEO ĐẦY ĐỦ CHO VIDEO MỚI CHỌN */
          <div className="space-y-space-sm rounded-xl border border-primary/30 bg-surface-container-low p-space-md shadow-sm">
            <div className="relative overflow-hidden rounded-xl bg-black shadow-inner flex items-center justify-center">
              <video
                key={videoPreviewUrl ?? ''}
                src={videoPreviewUrl ?? ''}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full max-h-[400px] object-contain bg-black"
              >
                Trình duyệt của bạn không hỗ trợ phát video này.
              </video>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
                  <Icon name="movie" className="text-[18px] text-primary shrink-0" />
                  <span className="truncate font-semibold">{value.name}</span>
                  <span className="rounded-full bg-primary-fixed text-on-primary-fixed px-2 py-0.5 text-xs font-medium shrink-0">
                    Video {formatSize(value.size)}
                  </span>
                </div>
                <p className="mt-0.5 font-body-sm text-body-sm text-primary">
                  Video đã sẵn sàng phát thử. Tệp sẽ được lưu cùng bài viết khi bạn bấm hoàn tất.
                </p>
              </div>

              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || checking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="upload_file" className="text-[16px]" />
                  <span>Chọn video khác</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onChange(null);
                  }}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 bg-error-container/20 px-3 py-1.5 font-label-sm text-label-sm text-error hover:bg-error-container/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="close" className="text-[16px]" />
                  <span>Hủy video</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 1B. GIAO DIỆN XEM TRƯỚC ẢNH MỚI CHỌN */
          <div className="space-y-space-sm rounded-xl border border-primary/30 bg-surface-container-low p-space-md shadow-sm">
            <div className="relative overflow-hidden rounded-xl bg-black/5 flex items-center justify-center">
              <img
                src={imagePreviewUrl ?? ''}
                alt="Ảnh mới đã chọn"
                className="max-h-[320px] w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
                  <Icon name="image" className="text-[18px] text-primary shrink-0" />
                  <span className="truncate font-semibold">{value.name}</span>
                  <span className="rounded-full bg-primary-fixed text-on-primary-fixed px-2 py-0.5 text-xs font-medium shrink-0">
                    Ảnh {formatSize(value.size)}
                  </span>
                </div>
                <p className="mt-0.5 font-body-sm text-body-sm text-primary">
                  Ảnh đã sẵn sàng. Tệp sẽ được lưu cùng bài viết khi bạn bấm hoàn tất.
                </p>
              </div>

              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || checking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="upload_file" className="text-[16px]" />
                  <span>Chọn ảnh khác</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onChange(null);
                  }}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 bg-error-container/20 px-3 py-1.5 font-label-sm text-label-sm text-error hover:bg-error-container/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="close" className="text-[16px]" />
                  <span>Hủy ảnh</span>
                </button>
              </div>
            </div>
          </div>
        )
      ) : hasInitialMedia ? (
        /* Trường hợp 2: Chưa chọn tệp mới, hiển thị tệp hiện tại của bài viết */
        initialVideoUrl ? (
          /* 2A. GIAO DIỆN PHÁT VIDEO ĐẦY ĐỦ CHO VIDEO ĐANG CÓ */
          <div className="space-y-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md shadow-sm">
            <div className="relative overflow-hidden rounded-xl bg-black shadow-inner flex items-center justify-center">
              <video
                key={initialVideoUrl}
                src={initialVideoUrl}
                poster={initialImageUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full max-h-[400px] object-contain bg-black"
              >
                Trình duyệt của bạn không hỗ trợ phát video này.
              </video>
              {isQuarantined && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded bg-error px-2 py-0.5 font-label-xs text-label-xs text-on-error shadow-sm pointer-events-none">
                  <Icon name="warning" className="text-[14px]" />
                  <span>Vi phạm</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
                  <Icon name="movie" className="text-[18px] text-primary shrink-0" />
                  <span className="font-semibold">Video đính kèm hiện tại</span>
                </div>
                {isQuarantined ? (
                  <p className="mt-0.5 font-body-sm text-body-sm text-error">
                    Video này đã bị hệ thống tạm ẩn. Bạn có thể xóa video hoặc chọn video khác thay thế để bài viết được kiểm duyệt lại.
                  </p>
                ) : (
                  <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                    Video đang gắn với bài viết. Bạn có thể xem thử, xóa video hoặc chọn video khác thay thế.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || checking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name={checking ? 'progress_activity' : 'upload_file'} className={checking ? 'animate-spin text-[16px]' : 'text-[16px]'} />
                  <span>Thay đổi video</span>
                </button>
                {onRemoveInitial && (
                  <button
                    type="button"
                    onClick={onRemoveInitial}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 bg-error-container/20 px-3 py-1.5 font-label-sm text-label-sm text-error hover:bg-error-container/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-[16px]" />
                    <span>Xóa video</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 2B. GIAO DIỆN HIỂN THỊ ẢNH HIỆN TẠI */
          <div className="flex flex-col sm:flex-row sm:items-start gap-space-md rounded-xl border border-outline-variant bg-surface-container-low p-space-md">
            <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-surface-container border border-outline-variant/60">
              <img
                src={initialImageUrl!}
                alt="Ảnh hiện tại của bài viết"
                className="h-full w-full object-cover"
              />
              {isQuarantined && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-error px-2 py-0.5 font-label-xs text-label-xs text-on-error shadow-sm">
                  <Icon name="warning" className="text-[14px]" />
                  <span>Vi phạm</span>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-space-xs self-stretch">
              <div>
                <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
                  <Icon name="image" className="text-[18px] text-primary" />
                  <span>Ảnh đính kèm hiện tại</span>
                </div>
                {isQuarantined ? (
                  <p className="mt-1 font-body-sm text-body-sm text-error">
                    Ảnh này đã bị hệ thống đánh dấu vi phạm tiêu chuẩn cộng đồng. Bạn có thể <strong>xóa ảnh</strong> hoặc <strong>chọn ảnh khác thay thế</strong> để bài viết được kiểm duyệt lại.
                  </p>
                ) : (
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    Ảnh phương tiện đang gắn với bài viết. Bạn có thể xóa ảnh này hoặc chọn ảnh mới để thay thế.
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || checking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon name={checking ? 'progress_activity' : 'upload_file'} className={checking ? 'animate-spin text-[16px]' : 'text-[16px]'} />
                  <span>Thay đổi ảnh</span>
                </button>
                {onRemoveInitial && (
                  <button
                    type="button"
                    onClick={onRemoveInitial}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 bg-error-container/20 px-3 py-1.5 font-label-sm text-label-sm text-error hover:bg-error-container/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-[16px]" />
                    <span>Xóa ảnh</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      ) : isInitialRemoved ? (
        /* Trường hợp 3: Người dùng đã xóa tệp cũ và chưa chọn tệp mới */
        <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl border border-dashed border-error/40 bg-error-container/10 p-space-md">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-error">
            <Icon name="delete" className="text-[20px]" />
            <span>Đã đánh dấu xóa tệp cũ. Bài viết sẽ không còn tệp đính kèm khi bạn bấm Cập nhật.</span>
          </div>
          <div className="flex items-center gap-space-sm">
            {onRestoreInitial && (
              <button
                type="button"
                onClick={onRestoreInitial}
                className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
              >
                <Icon name="undo" className="text-[16px]" />
                <span>Khôi phục</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || checking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Icon name="upload_file" className="text-[16px]" />
              <span>Chọn tệp khác</span>
            </button>
          </div>
        </div>
      ) : (
        /* Trường hợp 4: Chưa có tệp nào */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || checking}
          className="flex w-fit items-center gap-1.5 rounded-lg bg-surface-container px-space-md py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-60 cursor-pointer"
        >
          <Icon name={checking ? 'progress_activity' : 'upload_file'} className={checking ? 'animate-spin text-[18px]' : 'text-[18px]'} />
          <span>{checking ? 'Đang kiểm tra tệp…' : 'Chọn tệp'}</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Chọn ảnh hoặc video đính kèm"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <FieldError id={`${inputId}-error`}>{error}</FieldError>
    </div>
  );
};
