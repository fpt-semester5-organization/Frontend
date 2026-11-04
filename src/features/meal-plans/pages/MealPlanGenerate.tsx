/**
 * SCR-23 · meal-plans/Generate · `/meal-plans/new`
 * FN: FN-MEAL-01 · Nguyễn Văn Minh Tâm · Sprint 6
 * Cập nhật luồng tạo thực đơn AI:
 * - Chọn ngày bắt đầu (không cho chọn quá khứ, mặc định hôm nay)
 * - Chọn số ngày muốn lập thực đơn (1, 3, 5, 7, 14 hoặc nhập tùy ý 1 - 30)
 * - Ô lưu ý với placeholder ví dụ ngữ cảnh phong phú
 * - Hiển thị "Context AI đã hiểu" dưới dạng các chip/tag để kiểm tra, sửa, xóa
 * - Nút "Tạo thực đơn" với loading & disable khi không hợp lệ
 * - Hiển thị tiêu đề dạng: "Thực đơn từ Thứ [X] DD/MM/YYYY đến Thứ [Y] DD/MM/YYYY (N ngày)"
 * - Bảo toàn kiểm tra tủ lạnh ảo rỗng, đồng bộ hồ sơ sức khỏe và hạn mức.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { usePublicSettings } from '@/features/system/hooks/usePublicSettings';
import { listFridgeItems } from '@/features/fridge/api/fridge.api';
import { useCurrentUser } from '@/features/profile/hooks/useProfile';
import { GENDER_OPTIONS, GOAL_OPTIONS, labelOf } from '@/features/profile/lib/healthMetrics';
import { toApiError, type ApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { useCreateMealPlan } from '../hooks/useMealPlans';
import {
  addDays,
  formatMealPlanTitle,
  getQuickStartDates,
  todayInVietnam,
} from '../lib/dates';
import { BUDGET_LABEL } from '../lib/labels';
import { generatePlanSchema, type GeneratePlanValues } from '../types/mealPlan.schemas';
import type { BudgetTier } from '../types/mealPlan.types';
import {
  AiParsedChip,
  compileChipsToInstructions,
  parseRawNoteToChips,
  CONTEXT_CATEGORIES,
  QUICK_CONTEXT_SUGGESTIONS,
  type ContextCategory,
} from '../lib/aiContextParser';
import { AiContextChips } from '../components/AiContextChips';
import { GeneratingPanel } from '../components/GeneratingPanel';

const TIERS: BudgetTier[] = ['ECONOMICAL', 'STANDARD', 'PREMIUM'];
const QUICK_DAYS_OPTIONS = [1, 3, 5, 7, 14];
const MAX_NOTE = 500;
const SECTION_TITLE = 'font-serif font-headline-sm text-headline-sm text-primary';

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

  // State quản lý Chips ngữ cảnh AI đã hiểu
  const [aiChips, setAiChips] = useState<AiParsedChip[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  const quickDates = useMemo(() => getQuickStartDates(), []);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    getValues,
    formState: { errors, isValid },
  } = useForm<GeneratePlanValues>({
    resolver: zodResolver(generatePlanSchema),
    mode: 'onChange',
    defaultValues: {
      startDate: todayInVietnam(),
      numberOfDays: 7,
      budgetTier: 'STANDARD',
      useFridge: false,
      customInstructions: '',
    },
  });

  const note = watch('customInstructions') ?? '';
  const startDate = watch('startDate');
  const numberOfDays = watch('numberOfDays') ?? 7;
  const useFridge = watch('useFridge');

  // Debounce phân tích text ghi chú sang Chips (đồng bộ chuẩn xác, tránh duplicate)
  useEffect(() => {
    if (!note.trim()) {
      setAiChips([]);
      return;
    }

    setIsAiAnalyzing(true);
    const timer = setTimeout(() => {
      const extracted = parseRawNoteToChips(note);
      setAiChips(extracted);
      setIsAiAnalyzing(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [note]);

  // Xóa chip: đồng thời gỡ cụm từ khỏi ô text ghi chú (chống sót biến thể)
  const handleRemoveChip = (chipToRemove: AiParsedChip) => {
    const current = getValues('customInstructions') || '';
    const chipLower = chipToRemove.label.toLowerCase();
    const isAllium = chipLower.includes('ngũ vị tân');
    const isLowOil = chipLower.includes('dầu mỡ') || chipLower.includes('thanh đạm');

    const parts = current.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
    const remaining = parts.filter((p) => {
      const pLower = p.toLowerCase();
      if (pLower === chipLower) return false;
      if (isAllium && pLower.includes('ngũ vị tân')) return false;
      if (isLowOil && (pLower.includes('dầu mỡ') || pLower.includes('thanh đạm'))) return false;
      if (pLower.includes(chipLower) || chipLower.includes(pLower)) return false;
      return true;
    });
    setValue('customInstructions', remaining.join(', '), { shouldValidate: true });
    setAiChips((prev) => prev.filter((c) => c.id !== chipToRemove.id));
  };

  // Bật/tắt gợi ý nhanh: bấm lần đầu thì thêm, bấm lại thì gỡ bỏ (chuẩn xác 100%, chống duplicate)
  const handleToggleSuggestion = (item: { label: string; category: ContextCategory }) => {
    const current = getValues('customInstructions') || '';
    const itemLower = item.label.toLowerCase();
    const isAllium = itemLower.includes('ngũ vị tân');
    const isLowOil = itemLower.includes('dầu mỡ') || itemLower.includes('thanh đạm');

    const isAlreadySelected =
      current.toLowerCase().includes(itemLower) ||
      (isAllium && current.toLowerCase().includes('ngũ vị tân')) ||
      (isLowOil && (current.toLowerCase().includes('dầu mỡ') || current.toLowerCase().includes('thanh đạm'))) ||
      aiChips.some((c) => {
        const cLower = c.label.toLowerCase();
        if (cLower === itemLower) return true;
        if (isAllium && cLower.includes('ngũ vị tân')) return true;
        if (isLowOil && (cLower.includes('dầu mỡ') || cLower.includes('thanh đạm'))) return true;
        return false;
      });

    // Lọc sạch các cụm từ tương ứng để tránh bị nhân đôi chuỗi
    const parts = current.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
    const filteredParts = parts.filter((p) => {
      const pLower = p.toLowerCase();
      if (pLower === itemLower) return false;
      if (isAllium && pLower.includes('ngũ vị tân')) return false;
      if (isLowOil && (pLower.includes('dầu mỡ') || pLower.includes('thanh đạm'))) return false;
      if (pLower.includes(itemLower) || itemLower.includes(pLower)) return false;
      return true;
    });

    if (isAlreadySelected) {
      // Gỡ bỏ hoàn toàn
      setValue('customInstructions', filteredParts.join(', '), { shouldValidate: true });
      setAiChips((prev) =>
        prev.filter((c) => {
          const cLower = c.label.toLowerCase();
          if (cLower === itemLower) return false;
          if (isAllium && cLower.includes('ngũ vị tân')) return false;
          if (isLowOil && (cLower.includes('dầu mỡ') || cLower.includes('thanh đạm'))) return false;
          return true;
        })
      );
    } else {
      // Thêm mới một lần duy nhất
      const newText = filteredParts.length > 0 ? `${filteredParts.join(', ')}, ${item.label}` : item.label;
      setValue('customInstructions', newText, { shouldValidate: true });
      const newChip: AiParsedChip = {
        id: `chip_sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: item.category,
        label: item.label,
        icon: CONTEXT_CATEGORIES[item.category].icon,
      };
      setAiChips((prev) => {
        const cleanPrev = prev.filter((c) => {
          const cLower = c.label.toLowerCase();
          if (cLower === itemLower) return false;
          if (isAllium && cLower.includes('ngũ vị tân')) return false;
          if (isLowOil && (cLower.includes('dầu mỡ') || cLower.includes('thanh đạm'))) return false;
          return true;
        });
        return [...cleanPrev, newChip];
      });
    }
  };

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

  const submit = (values: GeneratePlanValues) => {
    if (values.useFridge && fridgeEmptyError) {
      return;
    }

    setFailure(null);

    // Gom Context Chips và note lại thành hướng dẫn hoàn chỉnh gửi lên Backend/AI
    const compiledInstructions = compileChipsToInstructions(aiChips, values.customInstructions);

    createPlan.mutate(
      {
        startDate: values.startDate,
        durationDays: values.numberOfDays,
        numberOfDays: values.numberOfDays,
        budgetTier: values.budgetTier,
        useFridge: values.useFridge,
        ...(compiledInstructions ? { customInstructions: compiledInstructions } : {}),
      },
      {
        onSuccess: (res) => {
          notifySuccess(
            res.message || `Đã tạo thực đơn bản nháp (${values.numberOfDays} ngày · ${values.numberOfDays * 3} bữa)`
          );
          navigate(PATHS.MEAL_PLANS.DETAIL(res.data.planId), { replace: true });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (
            applyServerFieldErrors(apiError, setError, [
              'startDate',
              'numberOfDays',
              'budgetTier',
              'useFridge',
              'customInstructions',
            ])
          ) {
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
  const { data: publicSettings } = usePublicSettings();
  const vipLimit = publicSettings?.mealPlanWeeklyLimitVip ?? QUOTA.mealPlanPerWeek.vip;
  const freeLimit = publicSettings?.mealPlanWeeklyLimitFree ?? QUOTA.mealPlanPerWeek.free;
  const limit = isVip ? vipLimit : freeLimit;
  const generating = createPlan.isPending;

  // Tính toán tiêu đề kế hoạch dạng chuẩn: "Thực đơn từ Thứ Hai 03/11/2026 đến Chủ Nhật 09/11/2026 (7 ngày)"
  const dynamicTitle = useMemo(() => {
    return formatMealPlanTitle(startDate, numberOfDays);
  }, [startDate, numberOfDays]);

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1440px] bg-background">
      <div className="flex w-full flex-col">
        {/* Top Header */}
        <section className="w-full px-margin-mobile pb-space-lg pt-6 sm:px-margin sm:pt-8">
          <div className="flex items-center justify-between pb-space-sm">
            <Link
              to={PATHS.MEAL_PLANS.ROOT}
              className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              Quay lại thực đơn tuần
            </Link>
            <nav aria-label="Điều hướng" className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
              <Link to={PATHS.HOME} className="hover:text-primary transition-colors">
                Trang chủ
              </Link>
            <span>/</span>
            <Link to={PATHS.MEAL_PLANS.ROOT} className="hover:text-primary transition-colors">
              Thực đơn tuần
            </Link>
            <span>/</span>
            <span className="font-semibold text-on-surface">Tạo mới</span>
          </nav>
        </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-serif font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
                Thiết lập thực đơn dinh dưỡng
              </h1>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Lên lịch thực đơn chuẩn khoa học từ AI dựa trên hồ sơ thể trạng, thói quen ăn uống và tủ lạnh thông minh.
              </p>
            </div>
            {/* Banner hiển thị tiêu đề thực đơn đã tính toán */}
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary-fixed text-on-primary-fixed border border-primary/20 px-4 py-2 font-label-sm text-xs font-semibold shadow-xs">
              <Icon name="event" className="text-[18px] text-primary" />
              <span>{dynamicTitle}</span>
            </div>
          </div>
        </section>

        {generating ? (
          <GeneratingPanel
            summary={dynamicTitle}
            daysCount={numberOfDays}
          />
        ) : (
          <section className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
            {/* Left Column: Form Fields (8 cols) */}
            <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-space-md lg:col-span-8">
              {failure && (
                <FormAlert
                  tone="error"
                  title={
                    failure.status === 503 || failure.status === 502
                      ? 'Dịch vụ tạm gián đoạn'
                      : failure.errorCode === 'ERR_QUOTA_MEAL_PLAN_EXCEEDED'
                      ? `Bạn đã dùng hết ${vipLimit} thực đơn của tuần này`
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

              {/* 01: Date Picker & Number of Days */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center gap-space-sm pb-space-md border-b border-surface-container">
                  <span className={SECTION_TITLE}>01</span>
                  <h2 className={SECTION_TITLE}>Thời gian &amp; Số ngày lập thực đơn</h2>
                </div>

                <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2">
                  {/* Ngày bắt đầu (date picker, mặc định hôm nay, không chọn quá khứ) */}
                  <div>
                    <label className="mb-space-xs block font-label-md text-label-md text-on-surface font-semibold" htmlFor="startDateInput">
                      Ngày bắt đầu <span className="text-secondary">*</span>
                    </label>
                    <input
                      id="startDateInput"
                      type="date"
                      min={todayInVietnam()}
                      aria-invalid={!!errors.startDate}
                      {...register('startDate')}
                      className={cn(
                        'w-full rounded-lg bg-surface-container-low px-space-md py-space-sm font-body-md text-body-md text-on-surface transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 border border-surface-container-high',
                        errors.startDate && 'ring-1 ring-error border-error'
                      )}
                    />
                    <FieldError>{errors.startDate?.message}</FieldError>
                    <p className="mt-1 font-body-xs text-xs text-on-surface-variant">
                      Mặc định là hôm nay ({todayInVietnam()}). Không được chọn ngày trong quá khứ.
                    </p>
                  </div>

                  {/* Tùy chọn ngày xuất phát nhanh */}
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Chọn nhanh ngày bắt đầu:</span>
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
                                  on ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
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

                {/* Số ngày muốn lập thực đơn (1, 3, 5, 7, 14 ngày hoặc nhập tùy ý 1 - 30) */}
                <div className="mt-5 pt-4 border-t border-surface-container">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="daysInput">
                        Số ngày muốn lập thực đơn <span className="text-secondary">*</span>
                      </label>
                      <p className="text-xs text-on-surface-variant">
                        Tối thiểu 1 ngày, tối đa 30 ngày (tương ứng {numberOfDays * 3} bữa ăn).
                      </p>
                    </div>

                    {/* Input nhập số ngày tùy ý */}
                    <div className="flex items-center gap-2">
                      <input
                        id="daysInput"
                        type="number"
                        min={1}
                        max={30}
                        aria-invalid={!!errors.numberOfDays}
                        {...register('numberOfDays', { valueAsNumber: true })}
                        className={cn(
                          'w-24 rounded-lg bg-surface-container-low px-3 py-1.5 text-center font-bold text-sm text-on-surface border border-surface-container-high focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-hidden',
                          errors.numberOfDays && 'border-error ring-1 ring-error'
                        )}
                      />
                      <span className="font-label-sm text-xs font-medium text-on-surface-variant">ngày</span>
                    </div>
                  </div>

                  {/* Chips chọn nhanh số ngày (1, 3, 5, 7, 14 ngày) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label-sm text-xs text-on-surface-variant font-medium mr-1">Chọn nhanh:</span>
                    {QUICK_DAYS_OPTIONS.map((days) => {
                      const isSelected = numberOfDays === days;
                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setValue('numberOfDays', days, { shouldValidate: true })}
                          className={cn(
                            'px-3 py-1 rounded-lg font-label-sm text-xs font-semibold transition-all',
                            isSelected
                              ? 'bg-primary-container text-on-primary shadow-xs'
                              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                          )}
                        >
                          {days} ngày {days === 7 ? '(1 tuần)' : days === 14 ? '(2 tuần)' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError>{errors.numberOfDays?.message}</FieldError>
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
                              'flex flex-col justify-between rounded-xl p-space-md text-left transition-all border',
                              on
                                ? 'bg-primary-fixed/40 border-primary ring-2 ring-primary/20 text-on-surface'
                                : 'bg-surface-container-lowest border-surface-container-high hover:bg-surface-container-low'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn('font-label-md text-label-md', on ? 'font-bold text-primary' : 'text-on-surface-variant')}>
                                {BUDGET_LABEL[t]}
                                {t === 'STANDARD' ? ' (mặc định)' : ''}
                              </span>
                              <Icon
                                name="check_circle"
                                className={cn('text-[18px]', on ? 'text-primary' : 'text-transparent')}
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

              {/* 03: Virtual Fridge Integration */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center gap-space-sm pb-space-md border-b border-surface-container">
                  <span className={SECTION_TITLE}>03</span>
                  <h2 className={SECTION_TITLE}>Tối ưu hóa nguồn nguyên liệu</h2>
                </div>
                <div className="flex flex-col items-start justify-between gap-space-md rounded-xl bg-surface-container-low p-space-md md:flex-row md:items-center">
                  <div className="flex items-start gap-space-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-xs">
                      <Icon name="kitchen" className="text-[20px]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <h3 className="font-label-lg text-label-lg text-primary font-medium">
                          Ưu tiên nguyên liệu trong Tủ Lạnh Thông Minh
                        </h3>
                        {fridgeItemsCount !== null && (
                          <span className="rounded-full bg-primary-fixed text-on-primary-fixed px-2 py-0.5 font-label-sm text-xs font-semibold">
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
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                          field.value ? 'bg-primary-container' : 'bg-surface-container-highest',
                          isCheckingFridge && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                            field.value ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    )}
                  />
                </div>

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

              {/* 04: AI Instructions & AI Context Understanding Chips */}
              {/* 04: AI Instructions & AI Context Understanding (Gộp 2 ô thành 1 khung thống nhất theo yêu cầu) */}
              <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
                <div className="mb-space-md flex items-center justify-between pb-space-md border-b border-surface-container">
                  <div className="flex items-center gap-space-sm">
                    <span className={SECTION_TITLE}>04</span>
                    <h2 className={SECTION_TITLE}>Ghi chú &amp; Ngữ cảnh cho AI</h2>
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

                {/* Khung duy nhất tích hợp cả ô nhập, tiêu chí AI đã hiểu và gợi ý nhanh */}
                <div className="rounded-xl border border-surface-container bg-surface-container-low p-3.5 sm:p-4 flex flex-col gap-3 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-surface-container-lowest">
                  {/* Textarea nhập ghi chú tự do */}
                  <textarea
                    id="aiInstruction"
                    rows={3}
                    maxLength={MAX_NOTE}
                    aria-label="Yêu cầu riêng cho AI"
                    aria-invalid={!!errors.customInstructions}
                    placeholder="Ví dụ: nhà có 2 người lớn, 1 bé 3 tuổi, không ăn cay, hạn chế đồ chiên, ngân sách 100k/ngày..."
                    {...register('customInstructions')}
                    className="w-full resize-y bg-transparent p-0 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none border-none"
                  />
                  <FieldError>{errors.customInstructions?.message}</FieldError>

                  {/* Tiêu chí AI đã hiểu (hiển thị trực tiếp ngay dưới văn bản khi có chip) */}
                  {aiChips.length > 0 && (
                    <div className="pt-2.5 border-t border-surface-container flex flex-wrap items-center gap-1.5 animate-fadeIn">
                      <span className="font-serif text-xs font-semibold text-primary flex items-center gap-1 mr-1">
                        <Icon name="auto_awesome" className="text-[14px]" />
                        Context AI đã hiểu ({aiChips.length}):
                      </span>
                      {aiChips.map((chip) => {
                        const meta = CONTEXT_CATEGORIES[chip.category] || CONTEXT_CATEGORIES.other;
                        return (
                          <span
                            key={chip.id}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-label-sm text-xs font-medium shadow-2xs',
                              meta.badgeClass
                            )}
                          >
                            <Icon name={meta.icon} className="text-[12px] opacity-80" />
                            <span>{chip.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveChip(chip)}
                              className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                              title="Xóa tiêu chí này"
                            >
                              <Icon name="close" className="text-[11px]" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Thanh gợi ý thêm nhanh nằm ngay ở đáy khung */}
                  <div className="pt-2.5 border-t border-surface-container">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-2">
                      <Icon name="tips_and_updates" className="text-[15px] text-secondary" />
                      <span className="font-medium">Gợi ý thêm nhanh vào ghi chú (bấm để bật/tắt):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_CONTEXT_SUGGESTIONS.map((item) => {
                        const isAdded =
                          note.toLowerCase().includes(item.label.toLowerCase()) ||
                          aiChips.some((c) => c.label.toLowerCase() === item.label.toLowerCase());
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleToggleSuggestion(item)}
                            title={isAdded ? `Bấm để bỏ chọn: ${item.label}` : `Bấm để thêm: ${item.label}`}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-medium transition-all border inline-flex items-center gap-1',
                              isAdded
                                ? 'bg-primary-container text-on-primary border-primary-container font-semibold shadow-2xs'
                                : 'bg-surface-container-lowest text-on-surface border-surface-container hover:border-outline-variant hover:bg-surface-container'
                            )}
                          >
                            <Icon name={isAdded ? 'check' : 'add'} className="text-[13px]" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>

              {/* Action Buttons: Nút Tạo thực đơn hiển thị loading & disabled khi invalid */}
              <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                <button
                  type="submit"
                  disabled={generating || !isValid}
                  className="flex w-full items-center justify-center gap-space-sm rounded-lg bg-primary-container px-space-xl py-3.5 font-label-lg text-label-lg text-on-primary font-bold transition-all hover:bg-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto shadow-md"
                  id="submitBtn"
                >
                  <Icon
                    name={generating ? 'progress_activity' : 'auto_awesome'}
                    className={cn('text-[20px]', generating && 'animate-spin')}
                  />
                  <span>
                    {generating
                      ? 'AI đang tạo thực đơn...'
                      : `Tạo thực đơn AI (${numberOfDays} ngày · ${numberOfDays * 3} bữa)`}
                  </span>
                </button>
                <Link
                  to={PATHS.MEAL_PLANS.ROOT}
                  className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-error"
                >
                  Hủy bỏ
                </Link>
              </div>
            </form>

            {/* Right Column: Sidebar Profile & Quota */}
            <aside className="flex flex-col gap-space-md lg:col-span-4">
              {/* Profile Sync Card */}
              <article className="rounded-2xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card">
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
                  <div className="animate-pulse space-y-2 py-2" role="status" aria-busy="true">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-5 rounded bg-surface-container" />
                    ))}
                  </div>
                ) : profile.isError ? (
                  <FormAlert tone="error" title="Lỗi tải hồ sơ" className="mt-2">
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
              <article className="rounded-2xl border border-surface-container bg-surface-container-low p-space-lg shadow-card">
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
                    <span>Thực đơn gồm các bữa dinh dưỡng được lưu ở trạng thái bản nháp.</span>
                  </li>
                </ul>

                {!isVip && (
                  <Link
                    to={PATHS.SUBSCRIPTION.PRICING}
                    className="mt-space-md inline-block font-label-sm text-label-sm font-semibold text-secondary hover:underline"
                  >
                    Nâng cấp VIP để tạo {vipLimit} thực đơn/tuần →
                  </Link>
                )}
              </article>
            </aside>
          </section>
        )}
      </div>

      {/* VIP Upsell Dialog */}
      <VipUpsellDialog
        show={upsellMessage !== null}
        onHide={() => setUpsellMessage(null)}
        title="Bạn đã dùng hết thực đơn của tuần này"
        message={
          <>
            <p>{upsellMessage}</p>
            <p className="mt-1">
              Gói Free được tạo {freeLimit} thực đơn mỗi tuần. Nâng cấp VIP để tạo tới{' '}
              {vipLimit} thực đơn.
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
              to={PATHS.MEAL_PLANS.NEW}
              onClick={() => setProfileMessage(null)}
              className="inline-flex items-center rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary hover:bg-primary shadow-xs"
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
