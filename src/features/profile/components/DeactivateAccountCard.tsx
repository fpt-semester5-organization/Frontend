import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Modal } from '@/components/ui/Modal';
import { toApiError } from '@/lib/apiError';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useDeleteAccount } from '../hooks/useProfile';
import { REASON_MAX, deleteAccountSchema, type DeleteAccountValues } from '../types/profile.schemas';

/**
 * Vô hiệu hóa tài khoản (SCR-07, FN-PROF-07): SOFT_DELETED, có 30 ngày để khôi phục bằng cách đăng nhập lại.
 * UNSPECIFIED: tài khoản chỉ dùng Google cần googleIdToken thay mật khẩu, nhưng GET /users/me không cho biết cách đăng nhập
 * của tài khoản; hiện chỉ hỗ trợ xác nhận bằng mật khẩu (người dùng chọn 17/10/2026).
 */
export const DeactivateAccountCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useDeleteAccount();
  const logoutOnLeave = useRef(false);

  // Server đã thu hồi mọi phiên: dọn phiên ở trình duyệt khi đã rời /me. Xóa phiên trước khi rời trang thì guard RequireAuth
  // của /me chuyển sang trang đăng nhập thay vì trang chủ (điều hướng của data router không đồng bộ).
  useEffect(
    () => () => {
      if (!logoutOnLeave.current) return;
      useAuthStore.getState().logout();
      queryClient.clear();
    },
    [queryClient]
  );
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { confirmPassword: '', reason: '' }, mode: 'onTouched' });
  const reasonLength = watch('reason')?.length ?? 0;

  const close = () => {
    if (remove.isPending) return;
    reset();
    setOpen(false);
  };

  const onSubmit = (values: DeleteAccountValues) =>
    remove.mutate(
      { confirmPassword: values.confirmPassword, ...(values.reason ? { reason: values.reason } : {}) },
      {
        onSuccess: (res) => {
          const deadline = res.data.restoreDeadline ? ` Hạn khôi phục: ${formatDateTime(res.data.restoreDeadline)}.` : '';
          notifySuccess(`${res.message || 'Tài khoản đã được vô hiệu hóa.'}${deadline}`);
          logoutOnLeave.current = true;
          navigate(PATHS.HOME, { replace: true });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.errorCode === 'ERR_AUTH_INVALID_CREDENTIALS') {
            setError('confirmPassword', { type: 'server', message: apiError.message || 'Mật khẩu không đúng.' });
            return;
          }
          if (!applyServerFieldErrors(error, setError, ['confirmPassword', 'reason'])) notifyApiError(error);
        },
      }
    );

  return (
    <section aria-labelledby="deactivate-title" className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <h2 id="deactivate-title" className="font-headline-sm text-headline-sm text-on-surface">
        Vô hiệu hóa tài khoản
      </h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Tài khoản bị khóa ngay và mọi phiên đăng nhập kết thúc. Trong 30 ngày, đăng nhập lại để khôi phục; quá hạn dữ liệu cá nhân sẽ bị ẩn danh hóa.
      </p>
      <Button variant="secondary" className="w-fit text-error" onClick={() => setOpen(true)}>
        Vô hiệu hóa tài khoản
      </Button>

      <Modal show={open} onHide={close} title="Vô hiệu hóa tài khoản?" size="sm" locked={remove.isPending}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Nhập mật khẩu để xác nhận. Bạn có 30 ngày để khôi phục tài khoản.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deactivate-password" className="font-label-md text-label-md text-on-surface">
              Mật khẩu <span className="text-secondary">*</span>
            </label>
            <input
              id="deactivate-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.confirmPassword || undefined}
              {...register('confirmPassword')}
              className={cn(INPUT_CLASS, 'h-11', errors.confirmPassword && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="deactivate-reason" className="font-label-md text-label-md text-on-surface">
                Lý do (không bắt buộc)
              </label>
              <span className="font-label-sm text-label-sm text-outline tabular-nums">
                {reasonLength}/{REASON_MAX}
              </span>
            </div>
            <textarea
              id="deactivate-reason"
              rows={3}
              maxLength={REASON_MAX}
              aria-invalid={!!errors.reason || undefined}
              {...register('reason')}
              className={cn(INPUT_CLASS, 'resize-none', errors.reason && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.reason?.message}</FieldError>
          </div>
          <div className="flex justify-end gap-space-sm">
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>
              Hủy
            </Button>
            <Button type="submit" variant="danger" loading={remove.isPending}>
              Vô hiệu hóa
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
