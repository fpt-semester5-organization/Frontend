/**
 * SCR-23 · meal-plans/Generate · `/meal-plans/new`
 * FN: FN-MEAL-01 · Nguyễn Văn Minh Tâm · Sprint 6
 * Bố cục 2 cột chuẩn Stich AI (Form 8/12 + Sidebar 4/12 Hồ sơ & Quota).
 * Chốt chặn kiểm tra tủ lạnh ảo rỗng (bảo toàn 100%).
 */
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { QuotaMeter } from '@/components/common/QuotaMeter';
import { VipUpsellDialog } from '@/components/common/VipUpsell';
import { FieldError, FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { QUOTA } from '@/constants/quota';
import { listFridgeItems } from '@/features/fridge/api/fridge.api';
import { useCurrentUser } from '@/features/profile/hooks/useProfile';
import { GENDER_OPTIONS, GOAL_OPTIONS, labelOf } from '@/features/profile/lib/healthMetrics';
import { toApiError, type ApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { useCreateMealPlan } from '../hooks/useMealPlans';
import { addDays, getQuickStartDates, todayInVietnam } from '../lib/dates';
import { BUDGET_LABEL } from '../lib/labels';
import { generatePlanSchema, type GeneratePlanValues } from '../types/mealPlan.schemas';
import type { BudgetTier } from '../types/mealPlan.types';

const TIERS: BudgetTier[] = ['ECONOMICAL', 'STANDARD', 'PREMIUM'];
const HINTS = ['Ít dầu mỡ', 'Món canh ấm nóng', 'Không cay', 'Giàu đạm thực vật', 'Ưu tiên rau củ luộc'];
const MAX_NOTE = 200;
const SECTION_TITLE = 'font-headline-sm text-headline-sm text-primary';

export const MealPlanGenerate: React.FC = () => {
  const navigate = useNavigate();
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);
  const profile = useCurrentUser();
  const createPlan = useCreateMealPlan();

  const [failure, setFailure] = useState<ApiError | null>(null);
  const [upsellMessage, setUpsellMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // State kiểm tra kho tủ lạnh ảo
  const [isCheckingFridge, setIsCheckingFridge] = useState(false);
  const [fridgeEmptyError, setFridgeEmptyError] = useState<string | null>(null);
  const [fridgeItemsCount, setFridgeItemsCount] = useState<number | null>(null);
  const [nonFreshCount, setNonFreshCount] = useState<number>(0);

  const quickDates = useMemo(() => getQuickStartDates(), []);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<GeneratePlanValues>({
    resolver: zodResolver(generatePlanSchema),
    defaultValues: {
      startDate: todayInVietnam(),
      budgetTier: 'STANDARD',
      useFridge: false,
      customInstructions: '',
    },
  });

  const note = watch('customInstructions') ?? '';
  const startDate = watch('startDate');
  const useFridge = watch('useFridge');

  const handleToggleFridge = async (checked: boolean, onChange: (val: boolean) => void) => {
    if (!checked) {
      onChange(false);
      setFridgeEmptyError(null);
      setFridgeItemsCount(null);
      setNonFreshCount(0);
      return;
    }

    setIsCheckingFridge(true);
    setFridgeEmptyError(null);

    try {
      const items = await listFridgeItems();
      if (!items || items.length === 0) {
        onChange(false);
        setFridgeEmptyError(
          'Tủ lạnh thông minh của bạn chưa có nguyên liệu nào! Vui lòng chụp ảnh hoặc thêm nguyên liệu vào tủ lạnh trước khi sử dụng tùy chọn này.'
        );
        setFridgeItemsCount(0);
        setNonFreshCount(0);
      } else {
        onChange(true);
        setFridgeEmptyError(null);
        setFridgeItemsCount(items.length);
        setNonFreshCount(items.filter((i) => i.freshnessStatus === 'NON-FRESH').length);
      }
    } catch {
      onChange(false);
      setFridgeEmptyError('Không thể kiểm tra tủ lạnh thông minh lúc này. Vui lòng kiểm tra lại kết nối và thử lại sau.');
    } finally {
      setIsCheckingFridge(false);
    }
  };

  const addHint = (hint: string) => {
    const cur = (getValues('customInstructions') ?? '').trim();
    const next = cur ? `${cur}, ${hint.toLowerCase()}` : hint;
    setValue('customInstructions', next.slice(0, MAX_NOTE), { shouldValidate: true });
  };

  const submit = (values: GeneratePlanValues) => {
    if (values.useFridge && fridgeEmptyError) {
      return;
    }

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
          notifySuccess(res.message || 'Đã tạo thực đơn bản nháp (21 bữa)');
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
          } else if (apiError.errorCode === 'ERR_FRIDGE_EMPTY') {
            setValue('useFridge', false);
            setFridgeEmptyError(getErrorMessage(apiError) || 'Tủ lạnh thông minh của bạn chưa có nguyên liệu nào.');
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

  const health = profile.data?.health;
  const allergens = profile.data?.allergens ?? [];
  const limit = isVip ? QUOTA.mealPlanPerWeek.vip : QUOTA.mealPlanPerWeek.free;
  const generating = createPlan.isPending;

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1440px] bg-surface-container-lowest pt-[72px]">
      <div className="flex w-full flex-col">
        {/* Top Header */}
        <section className="w-full px-margin-mobile pb-space-lg pt-space-md sm:px-margin">
          <div className="flex items-center justify-between pb-space-sm">
            <Link
              to={PATHS.MEAL_PLANS.ROOT}
              className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              Quay lại thực đơn tuần
            </Link>
          </div>
          <h1 className="pt-space-xs font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg tracking-tight">
            Thiết lập thực đơn tuần bằng AI
          </h1>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            AI lên 21 bữa (7 ngày × 3 bữa) theo hồ sơ sức khỏe, trường phái ăn chay và dị ứng của bạn.
          </p>
        </section>

        {/* 2-Column Content Layout */}
        <section className="w-full px-margin-mobile pb-space-2xl sm:px-margin">
          <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
            {/* Left Column: Form Setup (8 cols) */}
            <form className="flex flex-col gap-space-xl lg:col-span-8" onSubmit={handleSubmit(submit)} noValidate>
              {failure && (
                <FormAlert
                  tone="warning"
                  title={
                    failure.status === 503 || failure.status === 502
                      ? 'Dịch vụ tạm gián đoạn'
                      : failure.errorCode === 'ERR_QUOTA_MEAL_PLAN_EXCEEDED'
                      ? `Bạn đã dùng hết ${QUOTA.mealPlanPerWeek.vip} thực đơn của tuần này`
                      : 'Chưa đủ món phù hợp để lên thực đơn'
                  }
                >
                  <p>{getErrorMessage(failure)}</p>
                  {(failure.status === 503 || failure.status === 502) && (
                    <button
                      type="button"
                      onClick={handleSubmit(submit)}
                      className="mt-1 font-label-md text-label-md text-primary underline-offset-2 hover:underline"
                    >
                      Thử lại
                    </button>
                  )}
                </FormAlert>
              )}

              {/* 01: Date Selection */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center gap-space-sm pb-space-md border-b border-surface-container">
                  <span className={SECTION_TITLE}>01</span>
                  <h2 className={SECTION_TITLE}>Chọn thời gian khởi tạo</h2>
                </div>
                <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2">
                  <div>
                    <label className="mb-space-xs block font-label-md text-label-md text-on-surface" htmlFor="startDateInput">
                      Ngày bắt đầu (thực đơn 7 ngày)
                    </label>
                    <input
                      id="startDateInput"
                      type="date"
                      min={addDays(todayInVietnam(), -6)}
                      aria-invalid={!!errors.startDate}
                      {...register('startDate')}
                      className={cn(
                        'w-full rounded-lg bg-surface-container-low px-space-md py-space-sm font-body-md text-body-md text-on-surface transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container',
                        errors.startDate && 'ring-1 ring-error'
                      )}
                    />
                    <FieldError>{errors.startDate?.message}</FieldError>
                    <p className="mt-1 font-body-xs text-xs text-on-surface-variant">
                      Thực đơn gồm 21 bữa dinh dưỡng liên tiếp trong 7 ngày tính từ ngày bắt đầu bạn chọn.
                    </p>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tùy chọn nhanh</span>
                    <div className="flex flex-wrap gap-space-xs">
                      {quickDates.map((item) => {
                        const on = startDate === item.iso;
                        return (
                          <button
                            key={item.iso}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setValue('startDate', item.iso, { shouldValidate: true })}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg px-space-md py-space-xs font-label-sm text-label-sm transition-all',
                              on
                                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                            )}
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider',
                                  on
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container-high text-on-surface-variant'
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>

              {/* 02: Budget Tier */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center gap-space-sm pb-space-md border-b border-surface-container">
                  <span className={SECTION_TITLE}>02</span>
                  <h2 className={SECTION_TITLE}>Mức ngân sách dự kiến</h2>
                </div>
                <Controller
                  control={control}
                  name="budgetTier"
                  render={({ field }) => (
                    <div aria-label="Mức ngân sách" className="grid grid-cols-1 gap-space-md md:grid-cols-3" role="radiogroup">
                      {TIERS.map((t) => {
                        const on = field.value === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => field.onChange(t)}
                            className={cn(
                              'flex flex-col justify-between rounded-xl p-space-md text-left transition-all',
                              on
                                ? 'bg-primary-fixed/50 ring-2 ring-primary-container'
                                : 'bg-surface-container-lowest ring-1 ring-surface-container-high hover:bg-surface-container-low'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn('font-label-md text-label-md', on ? 'font-semibold text-primary' : 'text-on-surface-variant')}>
                                {BUDGET_LABEL[t]}
                                {t === 'STANDARD' ? ' (mặc định)' : ''}
                              </span>
                              <Icon
                                name="check_circle"
                                className={cn('text-[18px]', on ? 'text-primary-container' : 'text-transparent')}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                <FieldError>{errors.budgetTier?.message}</FieldError>
              </article>

              {/* 03: Virtual Fridge Integration (With Strict Empty Guard) */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center gap-space-sm pb-space-md border-b border-surface-container">
                  <span className={SECTION_TITLE}>03</span>
                  <h2 className={SECTION_TITLE}>Tối ưu hóa nguồn nguyên liệu</h2>
                </div>
                <div className="flex flex-col items-start justify-between gap-space-md rounded-xl bg-surface-container-low p-space-md md:flex-row md:items-center">
                  <div className="flex items-start gap-space-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                      <Icon name="kitchen" className="text-[20px]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <h3 className="font-label-lg text-label-lg text-primary font-medium">Ưu tiên nguyên liệu trong Tủ Lạnh Thông Minh</h3>
                        {fridgeItemsCount !== null && (
                          <span className="rounded bg-surface-container-lowest px-space-xs py-0.5 font-label-sm text-label-sm text-secondary">
                            {fridgeItemsCount} nguyên liệu
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        {isCheckingFridge
                          ? 'Đang kiểm tra kho tủ lạnh...'
                          : nonFreshCount > 0
                          ? `Ưu tiên ${nonFreshCount} nguyên liệu cần dùng sớm trước khi hết hạn.`
                          : 'AI sẽ ưu tiên các món tận dụng nguyên liệu đang có trong tủ lạnh của bạn.'}
                      </p>
                    </div>
                  </div>

                  <Controller
                    control={control}
                    name="useFridge"
                    render={({ field }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!field.value}
                        aria-label="Ưu tiên nguyên liệu trong tủ lạnh thông minh"
                        disabled={isCheckingFridge}
                        onClick={() => handleToggleFridge(!field.value, field.onChange)}
                        className={cn(
                          // p-0.5 ghi đè padding mặc định của <button> (Bootstrap Reboot không xóa), nếu không núm bị lệch và tràn khỏi rãnh.
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2',
                          field.value ? 'bg-primary-container' : 'bg-outline-variant',
                          isCheckingFridge && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow transition duration-200',
                            field.value ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    )}
                  />
                </div>

                {/* Chốt chặn tủ lạnh thông minh rỗng */}
                {fridgeEmptyError && (
                  <FormAlert tone="error" title="Tủ lạnh thông minh chưa có nguyên liệu" className="mt-space-sm">
                    <p className="mt-0.5">{fridgeEmptyError}</p>
                    <div className="mt-2">
                      <Link
                        to={PATHS.FRIDGE}
                        className="inline-flex items-center gap-1 font-label-md text-label-md text-error underline underline-offset-2 hover:opacity-80"
                      >
                        <Icon name="kitchen" className="text-[16px]" />
                        Đi tới Tủ lạnh thông minh để nạp đồ
                      </Link>
                    </div>
                  </FormAlert>
                )}
              </article>

              {/* 04: AI Instructions & Quick Hints */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center justify-between pb-space-md border-b border-surface-container">
                  <div className="flex items-center gap-space-sm">
                    <span className={SECTION_TITLE}>04</span>
                    <h2 className={SECTION_TITLE}>Yêu cầu riêng cho AI</h2>
                  </div>
                  <span
                    className={cn(
                      'font-label-sm text-label-sm tracking-wider tabular-nums',
                      note.length > MAX_NOTE ? 'text-error' : 'text-on-surface-variant'
                    )}
                  >
                    {note.length} / {MAX_NOTE}
                  </span>
                </div>
                <textarea
                  id="aiInstruction"
                  rows={3}
                  maxLength={MAX_NOTE}
                  aria-label="Yêu cầu riêng cho AI"
                  aria-invalid={!!errors.customInstructions}
                  placeholder="Ví dụ: ít dầu mỡ, không cay, bữa sáng nấu nhanh dưới 15 phút…"
                  {...register('customInstructions')}
                  className="w-full resize-y rounded-lg bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
                <FieldError>{errors.customInstructions?.message}</FieldError>

                <div className="mt-space-md flex flex-wrap items-center gap-space-xs">
                  <span className="mr-1 font-label-sm text-label-sm text-on-surface-variant">Gợi ý nhanh:</span>
                  {HINTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => addHint(h)}
                      className="rounded-lg bg-surface-container-low px-space-sm py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                    >
                      + {h}
                    </button>
                  ))}
                </div>
              </article>

              {/* Action Buttons */}
              <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                <button
                  type="submit"
                  disabled={generating}
                  className="flex w-full items-center justify-center gap-space-sm rounded-xl bg-primary-container px-space-xl py-space-md font-label-lg text-label-lg text-on-primary transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto shadow-md"
                  id="submitBtn"
                >
                  <Icon name="auto_awesome" className="text-[20px]" />
                  <span>{generating ? 'Đang tạo…' : 'Tạo thực đơn tuần bằng AI (7 ngày)'}</span>
                </button>
                <Link
                  to={PATHS.MEAL_PLANS.ROOT}
                  className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-error"
                >
                  Hủy bỏ
                </Link>
              </div>
            </form>

            {/* Right Column: Sidebar Profile & Quota (4 cols) */}
            <aside className="flex flex-col gap-space-md lg:col-span-4">
              {/* Profile Sync Card */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-sm flex items-center justify-between pb-space-sm border-b border-surface-container">
                  <div className="flex items-center gap-space-xs">
                    <Icon name="tune" className="text-[20px] text-secondary" />
                    <h3 className={SECTION_TITLE}>Hồ sơ đồng bộ</h3>
                  </div>
                  <Link
                    to={PATHS.ME.HEALTH}
                    className="inline-flex items-center gap-0.5 font-label-sm text-label-sm text-secondary hover:underline"
                  >
                    Chỉnh sửa
                    <Icon name="north_east" className="text-[14px]" />
                  </Link>
                </div>

                {profile.isPending ? (
                  <div className="animate-pulse space-y-2 py-2" role="status" aria-busy="true" aria-label="Đang tải hồ sơ">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-5 rounded bg-surface-container" />
                    ))}
                  </div>
                ) : profile.isError ? (
                  <FormAlert
                    tone="error"
                    title="Lỗi tải hồ sơ"
                    className="mt-2"
                  >
                    <button
                      type="button"
                      onClick={() => void profile.refetch()}
                      className="font-label-md text-label-md font-semibold underline"
                    >
                      Thử lại
                    </button>
                  </FormAlert>
                ) : !health ? (
                  <FormAlert tone="warning" title="Chưa có hồ sơ sức khỏe" className="mt-2">
                    Hãy thiết lập hồ sơ trước khi tạo thực đơn.{' '}
                    <Link to={PATHS.ME.HEALTH} className="font-semibold underline">
                      Thiết lập ngay
                    </Link>
                  </FormAlert>
                ) : (
                  <dl className="space-y-space-sm pt-space-xs text-body-sm">
                    <div className="flex items-center justify-between py-1 border-b border-surface-container-low">
                      <dt className="text-on-surface-variant">Thể trạng &amp; Mục tiêu</dt>
                      <dd className="text-right font-medium text-primary">
                        {[
                          health.gender && labelOf(GENDER_OPTIONS, health.gender),
                          health.currentWeightKg != null && `${health.currentWeightKg} kg`,
                          health.healthGoal && labelOf(GOAL_OPTIONS, health.healthGoal),
                        ]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-surface-container-low">
                      <dt className="text-on-surface-variant">Trường phái ẩm thực</dt>
                      <dd className="text-right font-medium text-primary">{health.dietarySchool?.name ?? '—'}</dd>
                    </div>
                    {health.requiresAlliumFree && (
                      <div className="flex items-center justify-between py-1 border-b border-surface-container-low">
                        <dt className="text-on-surface-variant">Tập quán kiêng</dt>
                        <dd className="text-right font-medium text-secondary">Kiêng ngũ vị tân</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1 border-b border-surface-container-low">
                      <dt className="text-on-surface-variant">Năng lượng mục tiêu</dt>
                      <dd className="text-right font-headline-sm text-[16px] font-semibold text-primary">
                        {health.targetDailyCalories != null
                          ? `${Math.round(health.targetDailyCalories).toLocaleString('vi-VN')} kcal / ngày`
                          : '—'}
                      </dd>
                    </div>
                    <div className="pt-space-xs">
                      <dt className="mb-1 block text-xs text-on-surface-variant">
                        Dị ứng đã loại trừ ({allergens.length} nhóm):
                      </dt>
                      <dd className="flex flex-wrap gap-1">
                        {allergens.length === 0 ? (
                          <span className="text-on-surface-variant">Không khai báo</span>
                        ) : (
                          allergens.map((a) => (
                            <span
                              key={a.allergenId}
                              className="rounded bg-surface-container px-space-xs py-0.5 font-label-sm text-label-sm text-on-surface"
                            >
                              {a.name}
                            </span>
                          ))
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
              </article>

              {/* AI Quota Card */}
              <article className="rounded-xl border border-surface-container bg-surface-container-low p-space-lg shadow-card">
                <div className="mb-space-sm flex items-center justify-between pb-space-sm border-b border-surface-container">
                  <div className="flex items-center gap-space-xs">
                    <Icon name="bolt" className="text-[20px] text-primary" />
                    <h3 className={SECTION_TITLE}>Hạn mức AI</h3>
                  </div>
                  <span
                    className={cn(
                      'rounded px-space-xs py-0.5 font-label-sm text-label-sm font-semibold',
                      isVip ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'
                    )}
                  >
                    {isVip ? 'VIP' : 'Miễn phí'}
                  </span>
                </div>

                <QuotaMeter label="Số thực đơn tạo mỗi tuần" limit={limit} unit="thực đơn" />

                <ul className="mt-space-md space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  <li className="flex items-start gap-space-xs">
                    <Icon name="swap_horiz" className="shrink-0 text-[18px] text-secondary" />
                    <span>
                      Chỉnh sửa tối đa <strong className="text-on-surface">{QUOTA.mealsPerPlan} lần</strong> khi còn bản nháp
                      và {QUOTA.mealsPerPlan} lần đổi món sau khi kích hoạt.
                    </span>
                  </li>
                  <li className="flex items-start gap-space-xs">
                    <Icon name="checklist" className="shrink-0 text-[18px] text-primary" />
                    <span>Thực đơn gồm 7 ngày × 3 bữa ({QUOTA.mealsPerPlan} bữa), lưu ở trạng thái bản nháp.</span>
                  </li>
                </ul>

                {!isVip && (
                  <Link
                    to={PATHS.SUBSCRIPTION.PRICING}
                    className="mt-space-md inline-block font-label-sm text-label-sm font-semibold text-secondary hover:underline"
                  >
                    Nâng cấp VIP để tạo {QUOTA.mealPlanPerWeek.vip} thực đơn/tuần →
                  </Link>
                )}
              </article>
            </aside>
          </div>
        </section>
      </div>

      {/* AI Generating Fullscreen Overlay */}
      {generating && (
        <div
          aria-labelledby="modalTitle"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm"
          role="dialog"
        >
          <div className="mx-space-md flex w-full max-w-md flex-col items-center rounded-2xl bg-surface-container-lowest p-space-xl text-center shadow-2xl">
            <div className="mb-space-md flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-primary-container text-on-primary">
              <Icon name="smart_toy" className="text-[32px]" />
            </div>
            <h3 className="mb-space-xs font-headline-md text-headline-md text-primary" id="modalTitle">
              Đang tạo thực đơn tuần
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              AI đang cân đối dinh dưỡng và chọn {QUOTA.mealsPerPlan} bữa cho bạn. Vui lòng chờ, thao tác này có thể mất vài
              chục giây.
            </p>
          </div>
        </div>
      )}

      {/* VIP Upsell Dialog */}
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

      {/* Missing Profile Modal */}
      <Modal show={profileMessage !== null} onHide={() => setProfileMessage(null)} title="Cần hồ sơ sức khỏe" size="sm">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{profileMessage}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            AI cần chiều cao, cân nặng, mục tiêu và trường phái ăn chay để tính calo và chọn món phù hợp.
          </p>
          <div className="flex justify-end gap-space-sm">
            <button
              type="button"
              onClick={() => setProfileMessage(null)}
              className="rounded-lg px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container"
            >
              Để sau
            </button>
            <Link
              to={PATHS.ME.HEALTH}
              onClick={() => setProfileMessage(null)}
              className="inline-flex items-center rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary hover:bg-primary"
            >
              Cập nhật hồ sơ
            </Link>
          </div>
        </div>
      </Modal>
    </main>
  );
};

export default MealPlanGenerate;
