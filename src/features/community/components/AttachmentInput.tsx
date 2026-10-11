import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Film, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
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
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setChecking(true);
    const error = await validateAttachment(file);
    setChecking(false);
    setLocalError(error);
    onChange(error ? null : file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const clear = () => {
    setLocalError(null);
    onChange(null);
  };

  const error = localError ?? serverError;

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-900">Ảnh hoặc video (không bắt buộc)</span>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-gray-200">
          {previewUrl ? (
            <img src={previewUrl} alt="Ảnh đã chọn" className="h-16 w-24 rounded object-cover" />
          ) : (
            <span className="flex h-16 w-24 items-center justify-center rounded bg-gray-100">
              <Film className="h-6 w-6 text-gray-500" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{value.name}</p>
            <p className="text-xs text-gray-500">
              {kind === 'video' ? 'Video' : 'Ảnh'} · {formatSize(value.size)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={clear} disabled={disabled} aria-label="Bỏ tệp đã chọn">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-center hover:border-brand-600 hover:bg-brand-50',
            disabled && 'pointer-events-none opacity-60',
            error && 'border-red-400'
          )}
        >
          <ImagePlus className="h-7 w-7 text-gray-400" aria-hidden="true" />
          <span className="mt-2 text-sm font-medium text-gray-700">
            {checking ? 'Đang kiểm tra tệp...' : 'Chọn ảnh hoặc video'}
          </span>
          <span className="mt-1 text-xs text-gray-500">
            Ảnh JPG, PNG, WEBP tối đa 5 MB · Video MP4, MOV tối đa 100 MB, dài 10 giây–5 phút
          </span>
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
