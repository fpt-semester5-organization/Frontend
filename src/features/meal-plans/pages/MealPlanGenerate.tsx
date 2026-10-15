import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { VipUpsellDialog } from '@/components/common/VipUpsell';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert, LABEL_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { QUOTA } from '@/constants/quota';
import { toApiError, type ApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { GeneratingPanel } from '../components/GeneratingPanel';
import { useCreateMealPlan } from '../hooks/useMealPlans';
import { formatWeekRange, upcomingMondays } from '../lib/dates';
import { BUDGET_LABEL, BUDGET_OPTIONS } from '../lib/labels';
import { generatePlanSchema, type GeneratePlanValues } from '../types/mealPlan.schemas';

const CARD = 'rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card';
const WEEKS_AHEAD = 4;

/** Ô chọn dạng thẻ (tuần, ngân sách): nhấn để chọn, viền xanh khi đang chọn. */
const choiceClass = (selected: boolean) =>
  cn(
    'flex w-full flex-col gap-1 rounded-xl p-space-md text-left transition-colors ring-1 ring-inset',
    selected
      ? 'bg-primary-fixed/60 ring-2 ring-primary-container'
      : 'bg-surface-container-low ring-transparent hover:bg-surface-container'
  );

/**
 * SCR-23 meal-plans/Generate — /meal-plans/new. POST /meal-plans (FN-MEAL-01).
 * Đang tạo: hiện trạng thái chờ AI; hết hạn mức tuần: Thành viên Free được mời nâng cấp VIP.
 */
const MealPlanGenerate: React.FC = () => {
  const navigate = useNavigate();
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);
  const createPlan = useCreateMealPlan();
  const mondays = useMemo(() => upcomingMondays(WEEKS_AHEAD), []);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [upsellMessage, setUpsellMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    watch,
    getValues,
    formState: { errors },
  } = useForm<GeneratePlanValues>({
    resolver: zodResolver(generatePlanSchema),
    defaultValues: { startDate: mondays[0], budgetTier: 'STANDARD', useFridge: false, customInstructions: '' },
  });
  const instructionsLength = watch('customInstructions')?.length ?? 0;

  const submit = (values: GeneratePlanValues) => {
    setFailure(null);
    createPlan.mutate(
      {
        startDate: values.startDate,
        budgetTier: values.budgetTier,
        useFridge: values.useFridge,
        ...(values.customInstructions ? { customInstructions: values.customInstructions } : {}),
      },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã tạo thực đơn nháp.');
          navigate(PATHS.MEAL_PLANS.DETAIL(res.data.planId), { replace: true });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (applyServerFieldErrors(apiError, setError, ['startDate', 'budgetTier', 'useFridge', 'customInstructions'])) {
            return;
          }
          if (apiError.errorCode === 'ERR_QUOTA_MEAL_PLAN_EXCEEDED' && !isVip) {
            setUpsellMessage(getErrorMessage(apiError));
          } else if (apiError.errorCode === 'ERR_PROFILE_NOT_COMPLETED') {
            setProfileMessage(getErrorMessage(apiError));
          } else if (
            apiError.errorCode === 'ERR_QUOTA_MEAL_PLAN_EXCEEDED' ||
            apiError.errorCode === 'ERR_MEAL_NO_CANDIDATE' ||
            apiError.status === 503 ||
            apiError.status === 502
          ) {
            setFailure(apiError);
          } else {
            notifyApiError(apiError);
          }
        },
      }
    );
  };

  const values = getValues();
  const generating = createPlan.isPending;

  const renderFailure = () => {
    if (!failure) return null;
    if (failure.status === 503 || failure.status === 502) {
      return (
        <FormAlert tone="warning" title="Dịch vụ tạm gián đoạn">
          <p>{getErrorMessage(failure)}</p>
          <button
            type="button"
            onClick={handleSubmit(submit)}
            className="mt-1 font-label-md text-label-md text-primary underline-offset-2 hover:underline"
          >
            Thử lại
          </button>
        </FormAlert>
      );
    }
    if (failure.errorCode === 'ERR_QUOTA_MEAL_PLAN_EXCEEDED') {
      return (
        <FormAlert tone="warning" title={`Bạn đã dùng hết ${QUOTA.mealPlanPerWeek.vip} thực đơn của tuần này`}>
          {getErrorMessage(failure)} Hãy chọn tuần khác hoặc tiếp tục với thực đơn đã có.
        </FormAlert>
      );
    }
    return (
      <FormAlert tone="warning" title="Chưa đủ món phù hợp để lên thực đơn">
        {getErrorMessage(failure)} Bạn có thể đổi mức ngân sách hoặc bớt ghi chú cho AI rồi thử lại.
      </FormAlert>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <Link to={PATHS.MEAL_PLANS.ROOT} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
          <Icon name="restaurant_menu" className="text-[16px]" />
          Thực đơn tuần
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-primary" aria-current="page">
          Tạo thực đơn
        </span>
      </nav>

      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Tạo thực đơn tuần bằng AI</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          AI lên 21 bữa (7 ngày × 3 bữa) theo hồ sơ sức khỏe, trường phái ăn chay và dị ứng của bạn. Thực đơn tạo ra ở
          dạng nháp để bạn đổi món trước khi kích hoạt.
        </p>
      </header>

      {generating && (
        <GeneratingPanel
          summary={`Tuần ${formatWeekRange(values.startDate)} · Ngân sách ${BUDGET_LABEL[values.budgetTier]}`}
        />
      )}

      <form onSubmit={handleSubmit(submit)} noValidate className={cn('flex flex-col gap-space-lg', generating && 'hidden')}>
        {renderFailure()}

        <fieldset className={CARD}>
          <legend className="sr-only">Tuần áp dụng</legend>
          <h2 className="mb-space-sm font-headline-sm text-headline-sm text-on-surface">Tuần áp dụng</h2>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Tuần áp dụng" className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
                {mondays.map((monday, index) => (
                  <button
                    key={monday}
                    type="button"
                    role="radio"
                    aria-checked={field.value === monday}
                    onClick={() => field.onChange(monday)}
                    className={choiceClass(field.value === monday)}
                  >
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {index === 0 ? 'Tuần gần nhất' : `Sau ${index} tuần`}
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface">Tuần {formatWeekRange(monday)}</span>
                  </button>
                ))}
              </div>
            )}
          />
          <FieldError>{errors.startDate?.message}</FieldError>
        </fieldset>

        <fieldset className={CARD}>
          <legend className="sr-only">Mức ngân sách</legend>
          <h2 className="mb-space-sm font-headline-sm text-headline-sm text-on-surface">Mức ngân sách</h2>
          <Controller
            control={control}
            name="budgetTier"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Mức ngân sách" className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                    className={choiceClass(field.value === option.value)}
                  >
                    <Icon name={option.icon} className="text-[22px] text-primary" />
                    <span className="font-label-lg text-label-lg text-on-surface">{option.label}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{option.description}</span>
                  </button>
                ))}
              </div>
            )}
          />
          <FieldError>{errors.budgetTier?.message}</FieldError>
        </fieldset>

        <section className={cn(CARD, 'flex flex-col gap-space-md')} aria-label="Tùy chọn cho AI">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Tùy chọn</h2>
          <label className="flex cursor-pointer items-start gap-space-sm">
            <input type="checkbox" {...register('useFridge')} className="mt-1 h-4 w-4 accent-primary" />
            <span>
              <span className="block font-label-md text-label-md text-on-surface">Ưu tiên nguyên liệu trong tủ lạnh ảo</span>
              <span className="block font-body-sm text-body-sm text-on-surface-variant">
                AI ưu tiên món dùng nguyên liệu bạn đang có, nhất là nguyên liệu sắp hết hạn.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-space-xs">
            <label htmlFor="plan-instructions" className={LABEL_CLASS}>
              Ghi chú cho AI <span className="font-body-sm text-body-sm text-outline">(không bắt buộc)</span>
            </label>
            <textarea
              id="plan-instructions"
              rows={3}
              maxLength={200}
              placeholder="Ví dụ: ít dầu, không cay, bữa sáng nấu nhanh"
              aria-invalid={errors.customInstructions ? true : undefined}
              {...register('customInstructions')}
              className="w-full resize-y rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container"
            />
            <div className="flex justify-between gap-space-sm">
              <FieldError>{errors.customInstructions?.message}</FieldError>
              <span className="ml-auto font-label-sm text-label-sm text-outline tabular-nums">{instructionsLength}/200</span>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-space-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isVip
              ? `Gói VIP: tạo tối đa ${QUOTA.mealPlanPerWeek.vip} thực đơn mỗi tuần.`
              : `Gói Free: ${QUOTA.mealPlanPerWeek.free} thực đơn mỗi tuần (VIP: ${QUOTA.mealPlanPerWeek.vip}).`}
          </p>
          <Button type="submit" size="lg" loading={generating}>
            <Icon name="auto_awesome" className="text-[20px]" />
            Tạo thực đơn
          </Button>
        </div>
      </form>

      <VipUpsellDialog
        show={upsellMessage !== null}
        onHide={() => setUpsellMessage(null)}
        title="Bạn đã dùng hết thực đơn của tuần này"
        message={
          <>
            <p>{upsellMessage}</p>
            <p className="mt-1">
              Gói Free được tạo {QUOTA.mealPlanPerWeek.free} thực đơn mỗi tuần. Nâng cấp VIP để tạo tới{' '}
              {QUOTA.mealPlanPerWeek.vip} thực đơn.
            </p>
          </>
        }
      />

      <Modal show={profileMessage !== null} onHide={() => setProfileMessage(null)} title="Cần hồ sơ sức khỏe" size="sm">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{profileMessage}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            AI cần chiều cao, cân nặng, mục tiêu và trường phái ăn chay để tính calo và chọn món phù hợp.
          </p>
          <div className="flex justify-end gap-space-sm">
            <Button variant="ghost" onClick={() => setProfileMessage(null)}>
              Để sau
            </Button>
            <Link
              to={PATHS.ME.HEALTH}
              className="inline-flex items-center rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
            >
              Cập nhật hồ sơ sức khỏe
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MealPlanGenerate;
