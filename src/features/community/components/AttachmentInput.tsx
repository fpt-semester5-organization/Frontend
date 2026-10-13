import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FieldError } from '@/components/ui/forms';
import { ATTACHMENT_ACCEPT, getAttachmentKind, validateAttachment } from '../types/community.schemas';

interface AttachmentInputProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** Lỗi từ server (413 quá dung lượng, 422 sai thời lượng video) hiện ngay tại ô chọn tệp. */
  serverError?: string;
  disabled?: boolean;
}

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;

/** Ảnh JPEG/PNG/WEBP ≤ 5 MB hoặc video MP4/MOV ≤ 100 MB, 10 giây–5 phút (FN-POST-08). */
export const AttachmentInput: React.FC<AttachmentInputProps> = ({ value, onChange, serverError, disabled }) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const kind = value ? getAttachmentKind(value) : null;
  const previewUrl = useMemo(() => (value && kind === 'image' ? URL.createObjectURL(value) : null), [value, kind]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
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

  return (
    <div className="space-y-space-sm">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Ảnh JPEG/PNG/WEBP tối đa 5 MB; video MP4/MOV tối đa 100 MB, dài 10 giây–5 phút. Tệp được tải lên sau khi lưu bài.
      </p>
      {value ? (
        <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
          {previewUrl ? (
            <img src={previewUrl} alt="Ảnh đã chọn" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-container">
              <Icon name="movie" className="text-[24px] text-outline" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-label-md text-label-md text-on-surface">{value.name}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {kind === 'video' ? 'Video' : 'Ảnh'} · {formatSize(value.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              onChange(null);
            }}
            disabled={disabled}
            aria-label={`Bỏ tệp ${value.name}`}
            className="flex rounded-lg p-1 text-outline hover:text-error disabled:opacity-40"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || checking}
          className="flex w-fit items-center gap-1.5 rounded-lg bg-surface-container px-space-md py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-60"
        >
          <Icon name={checking ? 'progress_activity' : 'upload_file'} className={checking ? 'animate-spin text-[18px]' : 'text-[18px]'} />
          {checking ? 'Đang kiểm tra tệp…' : 'Chọn tệp'}
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
