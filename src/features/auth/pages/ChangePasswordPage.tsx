/**
 * @handwritten
 * SCR-06 · auth/ChangePassword · `/auth/change-password`   (guard RequireAuth)
 * FN: FN-AUTH-13 · Nguyễn Văn Minh Tâm · Sprint 5
 */
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorCode } from '@/api/http';
import { FormAlert, PasswordField, StrengthBar, SubmitButton } from '@/components/ui/forms';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { AuthCard } from '../components/AuthCard';
import { useApiFormErrors } from '../components/useApiFormErrors';
import { useChangePassword } from '../hooks/useAuth';
import { changePasswordSchema, passwordStrength, type ChangePasswordForm } from '../schemas/auth.schemas';

export function ChangePasswordPage() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { formError, handle, clear } = useApiFormErrors(form.setError);
  const strength = passwordStrength(form.watch('newPassword') ?? '');
  const submit = form.handleSubmit((v) => {
    clear();
    change.mutate(v, {
      onSuccess: () => {
        toast.success('Đổi mật khẩu thành công');
        form.reset();
      },
      onError: (err) => {
        // 401 ERR_AUTH_INVALID_CREDENTIALS = mật khẩu hiện tại sai -> báo đúng ô, không đăng xuất
        if (apiErrorCode(err) === 'ERR_AUTH_INVALID_CREDENTIALS') form.setError('currentPassword', { message: 'Mật khẩu hiện tại không đúng' });
        else handle(err);
      },
    });
  });
  return (
    <AuthCard
      icon="shield_lock"
      title="Đổi mật khẩu"
      width={520}
      footer={
        <Link to={PATHS.PROFILE.ROOT} className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Về hồ sơ cá nhân
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-md">
        {formError && <FormAlert>{formError}</FormAlert>}
        <PasswordField label="Mật khẩu hiện tại" required autoComplete="current-password" error={form.formState.errors.currentPassword?.message} {...form.register('currentPassword')} />
        <PasswordField label="Mật khẩu mới" required autoComplete="new-password" error={form.formState.errors.newPassword?.message} hint={<StrengthBar {...strength} />} {...form.register('newPassword')} />
        <PasswordField label="Nhập lại mật khẩu mới" required autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <div className="flex gap-space-sm">
          <button type="button" onClick={() => form.reset()} className="rounded-lg bg-surface-container px-5 py-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-high">Đặt lại</button>
          <div className="flex-1"><SubmitButton loading={change.isPending} icon="check">Cập nhật mật khẩu</SubmitButton></div>
        </div>
      </form>
    </AuthCard>
  );
}
