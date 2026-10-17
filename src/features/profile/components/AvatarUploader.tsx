import React, { useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { toApiError } from '@/lib/apiError';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { useUploadAvatar } from '../hooks/useProfile';
import { AVATAR_TYPES, validateAvatar } from '../types/profile.schemas';

/** Ảnh đại diện + nút đổi ảnh (SCR-07). 400/413 báo tại chỗ; 502 Cloudinary cho thử lại với tệp vừa chọn. */
export const AvatarUploader: React.FC<{ name: string; avatarUrl: string | null }> = ({ name, avatarUrl }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const [error, setError] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);

  const send = (file: File) => {
    setError(null);
    setRetryFile(null);
    upload.mutate(file, {
      onSuccess: (res) => notifySuccess(res.message || 'Đã cập nhật ảnh đại diện.'),
      onError: (err) => {
        const { status } = toApiError(err);
        if (status === 400 || status === 413) setError(getErrorMessage(err));
        else if (status === 502) {
          setError('Kho ảnh đang gián đoạn, bạn có thể thử lại.');
          setRetryFile(file);
        } else notifyApiError(err);
      },
    });
  };

  const handleFile = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const invalid = validateAvatar(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    send(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`Ảnh đại diện của ${name}`} width={112} height={112} className="h-28 w-28 rounded-full object-cover" />
        ) : (
          <Avatar name={name} className="h-28 w-28 text-headline-md" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          aria-label="Đổi ảnh đại diện"
          className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-card hover:bg-surface-container disabled:opacity-60"
        >
          <Icon name={upload.isPending ? 'progress_activity' : 'photo_camera'} className={upload.isPending ? 'animate-spin text-[18px]' : 'text-[18px]'} />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Chọn ảnh đại diện"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <p className="font-label-sm text-label-sm text-on-surface-variant">JPEG, PNG, WEBP · tối đa 5 MB</p>
      <FieldError>{error}</FieldError>
      {retryFile && (
        <Button size="sm" variant="outline" onClick={() => send(retryFile)} loading={upload.isPending}>
          Thử lại
        </Button>
      )}
    </div>
  );
};
