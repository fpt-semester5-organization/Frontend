import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber, formatVnd } from '@/lib/format';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, ServerMessageDialog, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { FormDialog, FormRow } from '../components/FormDialog';
import { useAdminPlans, useCreatePlan, useReconcilePayment, useUpdatePlan } from '../hooks/useAdminBilling';
import { RECONCILE_ACTION } from '../lib/labels';
import { formatServerDateTime } from '@/lib/serverDate';
import { handleWriteError } from '../lib/writeError';
import type { AdminPlan, ReconcileAction, ReconcileResult } from '../types/admin.types';

const positiveInt = (message: string) =>
  z.number({ invalid_type_error: message }).int('Phải là số nguyên').positive('Phải lớn hơn 0');
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** POST /admin/subscription-plans: planName ≤ 100 (duy nhất), durationDays > 0, priceVnd > 0. */
const createPlanSchema = z.object({
  planName: z.string().trim().min(1, 'Nhập tên gói').max(100, 'Tên gói tối đa 100 ký tự'),
  durationDays: positiveInt('Nhập số ngày'),
  priceVnd: positiveInt('Nhập giá'),
});
type CreatePlanValues = z.infer<typeof createPlanSchema>;

/** PUT /admin/subscription-plans/{id}: priceVnd > 0. */
const priceSchema = z.object({ priceVnd: positiveInt('Nhập giá') });

/** POST /admin/payments/{id}/reconcile: action COMPENSATE/REFUND, reason 10–500 ký tự. */
const reconcileSchema = z.object({
  transactionId: positiveInt('Nhập mã giao dịch'),
  action: z.enum(['COMPENSATE', 'REFUND'], { errorMap: () => ({ message: 'Chọn cách xử lý' }) }),
  reason: z.string().trim().min(10, 'Lý do cần ít nhất 10 ký tự').max(500, 'Lý do tối đa 500 ký tự'),
});
type ReconcileValues = z.infer<typeof reconcileSchema>;

/** Việc Backend làm khi đối soát (AdminSubscriptionService.ReconcilePaymentAsync, develop 45999c2). */
const RECONCILE_EFFECTS: Record<ReconcileAction, string[]> = {
  COMPENSATE: [
    'Giao dịch đã thành công: cộng thêm một kỳ VIP bằng thời hạn của gói, tính từ ngày hết hạn hiện tại.',
    'Giao dịch lỗi, hết hạn hoặc bị hủy: chuyển thành công và cấp kỳ VIP mới, nối tiếp kỳ VIP đang còn (nếu có).',
    'Tài khoản được nâng lên VIP (trừ tài khoản Quản trị viên).',
  ],
  REFUND: [
    'Giao dịch chuyển sang Đã hoàn tiền, kỳ VIP của giao dịch này kết thúc ngay.',
    'Không còn giao dịch VIP nào khác đang hiệu lực thì tài khoản trở về Thành viên.',
    'Việc chuyển tiền hoàn cho người dùng làm thủ công ngoài hệ thống (trong 03 ngày làm việc).',
  ],
};

/**
 * SCR-44 admin/SubscriptionPlans + Reconcile · `/admin/subscription-plans` — FN-ADM-13.
 * Thêm gói, đổi giá (chỉ áp dụng cho đơn mới, BR-ADM-PAY-001), ẩn/hiện gói, đối soát giao dịch lỗi (BR-ADM-PAY-002).
 */
const AdminSubscriptionPlansPage: React.FC = () => {
  const plans = useAdminPlans();
  const update = useUpdatePlan();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [toggling, setToggling] = useState<AdminPlan | null>(null);

  const confirmToggle = () => {
    if (!toggling) return;
    update.mutate(
      { id: toggling.planId, body: { isActive: !toggling.isActive } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || (toggling.isActive ? 'Đã ẩn gói.' : 'Đã mở bán lại gói.'));
          setToggling(null);
        },
        onError: (error) => {
          handleWriteError(error);
          setToggling(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Gói VIP & đối soát"
        description="Cấu hình gói thuê bao VIP và xử lý giao dịch lỗi khi người dùng khiếu nại."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="add" className="text-[18px]" />
            Thêm gói
          </Button>
        }
      />

      <section aria-labelledby="plans-title" className="flex flex-col gap-space-sm">
        <h2 id="plans-title" className="font-headline-sm text-headline-sm text-on-surface">
          Gói thuê bao
        </h2>
        {plans.isPending ? (
          <TableSkeleton rows={3} label="Đang tải gói VIP" />
        ) : plans.isError ? (
          <AdminQueryError error={plans.error} onRetry={() => void plans.refetch()} retrying={plans.isRefetching} />
        ) : plans.data.length === 0 ? (
          <div className={CARD}>
            <EmptyState
              icon="workspace_premium"
              title="Chưa có gói VIP nào"
              description="Người dùng chưa thể nâng cấp VIP cho tới khi có ít nhất một gói đang bán."
              action={<Button onClick={() => setCreating(true)}>Thêm gói đầu tiên</Button>}
            />
          </div>
        ) : (
          <TableShell label="Danh sách gói VIP" minWidth="min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Tên gói</th>
                <th scope="col" className={`${TH} text-right`}>Thời hạn</th>
                <th scope="col" className={`${TH} text-right`}>Giá</th>
                <th scope="col" className={TH}>Trạng thái</th>
                <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {plans.data.map((plan) => (
                <tr key={plan.planId} className="hover:bg-surface-container-low">
                  <td className={`${TD} font-label-md text-label-md`}>{plan.planName}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatNumber(plan.durationDays)} ngày</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatVnd(plan.priceVnd)}</td>
                  <td className={TD}>
                    <StatusBadge tone={plan.isActive ? 'success' : 'neutral'}>{plan.isActive ? 'Đang bán' : 'Đã ẩn'}</StatusBadge>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(plan)} aria-label={`Đổi giá ${plan.planName}`}>
                      Đổi giá
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggling(plan)}
                      aria-label={`${plan.isActive ? 'Ẩn gói' : 'Mở bán lại'} ${plan.planName}`}
                    >
                      {plan.isActive ? 'Ẩn gói' : 'Mở bán lại'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      <ReconcileCard />

      <CreatePlanDialog show={creating} onClose={() => setCreating(false)} />
      <PriceDialog plan={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        show={!!toggling}
        title={toggling?.isActive ? 'Ẩn gói VIP?' : 'Mở bán lại gói?'}
        message={
          toggling?.isActive
            ? `"${toggling.planName}" sẽ không còn hiện ở trang Gói VIP, người dùng không mua mới được. Ai đang dùng gói vẫn giữ nguyên hạn VIP.`
            : `"${toggling?.planName ?? ''}" sẽ hiện lại ở trang Gói VIP với giá ${toggling ? formatVnd(toggling.priceVnd) : ''}.`
        }
        confirmLabel={toggling?.isActive ? 'Ẩn gói' : 'Mở bán lại'}
        danger={!!toggling?.isActive}
        loading={update.isPending}
        onConfirm={confirmToggle}
        onCancel={() => !update.isPending && setToggling(null)}
      />
    </div>
  );
};

const CreatePlanDialog: React.FC<{ show: boolean; onClose: () => void }> = ({ show, onClose }) => {
  const create = useCreatePlan();
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreatePlanValues>({ resolver: zodResolver(createPlanSchema) });

  useEffect(() => {
    if (show) {
      setFormError(null);
      reset({ planName: '', durationDays: 30, priceVnd: undefined });
    }
  }, [show, reset]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (res) => {
        notifySuccess(res.message || `Đã tạo gói ${values.planName}.`);
        onClose();
      },
      onError: (error) => {
        const apiError = handleWriteError(error, { setError, fields: ['planName', 'durationDays', 'priceVnd'], onConflict: setConflict });
        if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
      },
    });
  });

  return (
    <>
      <FormDialog show={show} title="Thêm gói VIP" onClose={() => !create.isPending && onClose()} onSubmit={submit} submitLabel="Tạo gói" loading={create.isPending}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <FormRow id="plan-name" label="Tên gói" required error={errors.planName?.message} hint="Ví dụ: VIP 1 tháng.">
          <input id="plan-name" maxLength={100} aria-invalid={!!errors.planName} className={CONTROL} {...register('planName')} />
        </FormRow>
        <div className="grid gap-space-md sm:grid-cols-2">
          <FormRow id="plan-days" label="Thời hạn (ngày)" required error={errors.durationDays?.message}>
            <input id="plan-days" type="number" min={1} inputMode="numeric" aria-invalid={!!errors.durationDays} className={CONTROL} {...register('durationDays', { setValueAs: toNumber })} />
          </FormRow>
          <FormRow id="plan-price" label="Giá (VND)" required error={errors.priceVnd?.message}>
            <input id="plan-price" type="number" min={1} step={1000} inputMode="numeric" aria-invalid={!!errors.priceVnd} className={CONTROL} {...register('priceVnd', { setValueAs: toNumber })} />
          </FormRow>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Gói mới được mở bán ngay sau khi tạo.</p>
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

const PriceDialog: React.FC<{ plan: AdminPlan | null; onClose: () => void }> = ({ plan, onClose }) => {
  const update = useUpdatePlan();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<{ priceVnd: number }>({ resolver: zodResolver(priceSchema) });

  useEffect(() => {
    if (plan) reset({ priceVnd: plan.priceVnd });
  }, [plan, reset]);

  const price = watch('priceVnd');
  const submit = handleSubmit((values) => {
    if (!plan) return;
    if (values.priceVnd === plan.priceVnd) {
      notifyInfo('Giá chưa thay đổi.');
      return;
    }
    update.mutate(
      { id: plan.planId, body: { priceVnd: values.priceVnd } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã cập nhật giá gói.');
          onClose();
        },
        onError: (error) => {
          if (handleWriteError(error, { setError, fields: ['priceVnd'] }).status === 404) onClose();
        },
      }
    );
  });

  return (
    <FormDialog show={!!plan} title={plan ? `Đổi giá: ${plan.planName}` : ''} onClose={() => !update.isPending && onClose()} onSubmit={submit} submitLabel="Lưu giá mới" loading={update.isPending}>
      <FormRow id="plan-new-price" label="Giá mới (VND)" required error={errors.priceVnd?.message} hint={plan ? `Giá hiện tại: ${formatVnd(plan.priceVnd)}` : undefined}>
        <input id="plan-new-price" type="number" min={1} step={1000} inputMode="numeric" aria-invalid={!!errors.priceVnd} className={CONTROL} {...register('priceVnd', { setValueAs: toNumber })} />
      </FormRow>
      <FormAlert tone="info">
        Giá mới {Number.isFinite(price) && price > 0 ? `(${formatVnd(price)}) ` : ''}chỉ áp dụng cho đơn hàng tạo sau khi lưu. Người dùng đang có VIP không bị tính lại tiền.
      </FormAlert>
    </FormDialog>
  );
};

const ReconcileCard: React.FC = () => {
  const reconcile = useReconcilePayment();
  const [review, setReview] = useState<ReconcileValues | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ReconcileValues>({ resolver: zodResolver(reconcileSchema), defaultValues: { reason: '' } });
  const action = watch('action');

  const confirm = () => {
    if (!review) return;
    setFormError(null);
    reconcile.mutate(
      { transactionId: review.transactionId, body: { action: review.action, reason: review.reason } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã đối soát.');
          setResult(res.data);
          setReview(null);
          reset({ transactionId: undefined, action: undefined, reason: '' });
        },
        onError: (error) => {
          setReview(null);
          const apiError = handleWriteError(error, { setError, fields: ['action', 'reason'], onConflict: setConflict });
          if (apiError.status === 404) setError('transactionId', { type: 'server', message: 'Không tìm thấy giao dịch với mã này.' });
          else if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  };

  return (
    <section aria-labelledby="reconcile-title" className={cn(CARD, 'flex flex-col gap-space-md p-space-lg')}>
      <div className="flex flex-col gap-1">
        <h2 id="reconcile-title" className="font-headline-sm text-headline-sm text-on-surface">
          Đối soát giao dịch
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Dùng khi người dùng đã bị trừ tiền ở MoMo/VietQR nhưng chưa được kích hoạt VIP, hoặc cần hoàn tiền. Mỗi giao dịch chỉ đối soát được một lần.
        </p>
      </div>

      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {result && (
        <FormAlert tone="success" title={`Giao dịch #${result.transactionId} đã đối soát`}>
          Trạng thái: {result.status === 'REFUNDED' ? 'Đã hoàn tiền' : result.status === 'SUCCESS' ? 'Thành công' : result.status}. Hạn VIP:{' '}
          {formatServerDateTime(result.vipEndsAt)}.
        </FormAlert>
      )}

      <form onSubmit={handleSubmit(setReview)} noValidate className="grid gap-space-md lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-space-md">
          <FormRow id="rc-id" label="Mã giao dịch" required error={errors.transactionId?.message} hint="Lấy từ biên lai hoặc khiếu nại của người dùng.">
            <input id="rc-id" type="number" min={1} inputMode="numeric" aria-invalid={!!errors.transactionId} className={CONTROL} {...register('transactionId', { setValueAs: toNumber })} />
          </FormRow>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-label-md text-label-md text-on-surface">
              Cách xử lý <span className="text-secondary">*</span>
            </legend>
            {(Object.keys(RECONCILE_ACTION) as ReconcileAction[]).map((value) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5',
                  action === value ? 'border-primary bg-primary/5' : 'border-surface-container hover:bg-surface-container-low'
                )}
              >
                <input type="radio" value={value} className="mt-1 accent-primary" {...register('action')} />
                <span className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{RECONCILE_ACTION[value].label}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{RECONCILE_ACTION[value].hint}</span>
                </span>
              </label>
            ))}
            {errors.action && <p role="alert" className="font-label-sm text-label-sm text-error">{errors.action.message}</p>}
          </fieldset>
        </div>
        <div className="flex flex-col gap-space-md">
          <FormRow id="rc-reason" label="Lý do" required error={errors.reason?.message} hint="Ghi rõ biên lai, mã đối tác ngân hàng để đối chiếu sau này.">
            <textarea id="rc-reason" rows={4} maxLength={500} aria-invalid={!!errors.reason} className={cn(CONTROL, 'resize-y')} {...register('reason')} />
          </FormRow>
          <div className="flex justify-end">
            <Button type="submit">Xem hậu quả & đối soát</Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        show={!!review}
        title={review ? `${RECONCILE_ACTION[review.action].label} cho giao dịch #${review.transactionId}?` : ''}
        message={
          review && (
            <div className="flex flex-col gap-2">
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {RECONCILE_EFFECTS[review.action].map((effect) => (
                  <li key={effect}>{effect}</li>
                ))}
              </ul>
              <p>Thao tác được ghi vào nhật ký kiểm toán và không làm lại được.</p>
            </div>
          )
        }
        confirmLabel={review ? RECONCILE_ACTION[review.action].label : 'Xác nhận'}
        danger={review?.action === 'REFUND'}
        loading={reconcile.isPending}
        onConfirm={confirm}
        onCancel={() => !reconcile.isPending && setReview(null)}
      />
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </section>
  );
};

export default AdminSubscriptionPlansPage;
