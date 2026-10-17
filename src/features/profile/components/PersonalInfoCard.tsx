import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { cn } from '@/lib/cn';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { useUpdateProfile } from '../hooks/useProfile';
import { FULL_NAME_MAX, profileFormSchema, type ProfileFormValues } from '../types/profile.schemas';
import type { CurrentUser } from '../types/profile.types';

const ROW = 'flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low px-space-md py-3';

/**
 * Thông tin tài khoản (SCR-07, FN-PROF-02): sửa họ tên, số điện thoại; email chỉ xem.
 * UNSPECIFIED: chưa rõ PATCH có nhận phoneNumber rỗng để xóa số; hiện chỉ gửi số điện thoại khi có nhập.
 */
export const PersonalInfoCard: React.FC<{ me: CurrentUser }> = ({ me }) => {
  const [editing, setEditing] = useState(false);
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: me.fullName, phoneNumber: me.phoneNumber ?? '' },
    mode: 'onTouched',
  });

  const cancel = () => {
    reset({ fullName: me.fullName, phoneNumber: me.phoneNumber ?? '' });
    setEditing(false);
  };

  const onSubmit = (values: ProfileFormValues) =>
    update.mutate(
      { fullName: values.fullName, ...(values.phoneNumber ? { phoneNumber: values.phoneNumber } : {}) },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã cập nhật thông tin.');
          reset({ fullName: res.data.fullName, phoneNumber: res.data.phoneNumber ?? '' });
          setEditing(false);
        },
        onError: (error) => {
          if (!applyServerFieldErrors(error, setError, ['fullName', 'phoneNumber'])) notifyApiError(error);
        },
      }
    );

  return (
    <section aria-labelledby="account-title" className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 id="account-title" className="font-headline-sm text-headline-sm text-on-surface">
          Thông tin tài khoản
        </h2>
        {!editing && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Icon name="edit" className="text-[16px]" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-fullName" className="font-label-md text-label-md text-on-surface">
              Họ và tên <span className="text-secondary">*</span>
            </label>
            <input
              id="profile-fullName"
              type="text"
              maxLength={FULL_NAME_MAX}
              autoComplete="name"
              aria-invalid={!!errors.fullName || undefined}
              {...register('fullName')}
              className={cn(INPUT_CLASS, 'h-11', errors.fullName && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.fullName?.message}</FieldError>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-phone" className="font-label-md text-label-md text-on-surface">
              Số điện thoại
            </label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              placeholder="09xxxxxxxx"
              aria-invalid={!!errors.phoneNumber || undefined}
              {...register('phoneNumber')}
              className={cn(INPUT_CLASS, 'h-11 tabular-nums', errors.phoneNumber && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.phoneNumber?.message}</FieldError>
          </div>
          <div className="flex flex-wrap gap-space-sm">
            <Button type="submit" loading={update.isPending} disabled={!isDirty}>
              Lưu thông tin
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={update.isPending}>
              Hủy
            </Button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col gap-2">
          <div className={ROW}>
            <dt className="font-label-md text-label-md text-on-surface-variant">Họ và tên</dt>
            <dd className="font-body-md text-body-md text-on-surface">{me.fullName}</dd>
          </div>
          <div className={ROW}>
            <dt className="font-label-md text-label-md text-on-surface-variant">Email</dt>
            <dd className="font-body-md text-body-md break-all text-on-surface">{me.email}</dd>
          </div>
          <div className={ROW}>
            <dt className="font-label-md text-label-md text-on-surface-variant">Số điện thoại</dt>
            <dd className="font-body-md text-body-md text-on-surface tabular-nums">{me.phoneNumber ?? 'Chưa cập nhật'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
};
