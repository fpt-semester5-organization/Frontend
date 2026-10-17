import React, { useEffect } from 'react';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import { useRequireMember } from '@/hooks/useRequireMember';
import { cn } from '@/lib/cn';
import { GENDER_OPTIONS, GOAL_OPTIONS, HEIGHT_MAX, HEIGHT_MIN, REGION_OPTIONS, WEIGHT_MAX, WEIGHT_MIN, todayIso } from '../lib/healthMetrics';
import { healthFormSchema, type HealthFormValues } from '../types/profile.schemas';
import { BmiPreview } from './BmiPreview';

interface HealthFormProps {
  defaultValues: HealthFormValues;
  saving: boolean;
  /** Còn bao nhiêu giây bị khóa nút lưu sau 429. */
  lockedSeconds: number;
  onSubmit: (values: HealthFormValues, setError: UseFormSetError<HealthFormValues>) => void;
}

const CARD = 'rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg';
const LABEL = 'font-label-md text-label-md text-on-surface';
const HINT = 'font-label-sm text-label-sm text-on-surface-variant';
const CHOICE =
  'flex cursor-pointer items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm transition-colors hover:bg-surface-container has-[:checked]:bg-primary-fixed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary';

/**
 * Form hồ sơ sức khỏe (SCR-08, FN-PROF-04). Kiểm tra ngay trên màn hình: lỗi hiện khi rời ô rồi cập nhật theo từng lần gõ,
 * không cần gửi lên server (chiều cao 50–250 cm, cân nặng 20–300 kg, tuổi ≥ 10). BMI xem trước đổi theo từng phím.
 */
export const HealthForm: React.FC<HealthFormProps> = ({ defaultValues, saving, lockedSeconds, onSubmit }) => {
  const { requireMember } = useRequireMember();
  const schools = useDietarySchools();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<HealthFormValues>({ resolver: zodResolver(healthFormSchema), defaultValues, mode: 'onTouched' });

  const [height, weight, gender, dateOfBirth, goal, schoolId] = useWatch({
    control,
    name: ['heightCm', 'weightKg', 'gender', 'dateOfBirth', 'healthGoal', 'dietarySchoolId'],
  });
  const school = schools.data?.find((item) => item.dietarySchoolId === Number(schoolId));
  const alliumForced = school?.forbidAllium === true;

  // Trường phái kiêng ngũ vị tân (ví dụ Phật giáo) thì luôn bật cờ kiêng ngũ vị tân.
  useEffect(() => {
    if (alliumForced) setValue('requiresAlliumFree', true, { shouldDirty: true });
  }, [alliumForced, setValue]);
  // Danh sách trường phái về sau khi form mount: gán lại giá trị để ô chọn hiện đúng trường phái đã lưu.
  useEffect(() => {
    if (schools.data) setValue('dietarySchoolId', getValues('dietarySchoolId'));
  }, [schools.data, setValue, getValues]);

  const submit = () => requireMember(() => void handleSubmit((values) => onSubmit(values, setError))());

  const numberInput = (name: 'heightCm' | 'weightKg' | 'targetWeightKg', label: string, unit: string, hint: string, required = true) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`health-${name}`} className={LABEL}>
        {label} {required && <span className="text-secondary">*</span>}
      </label>
      <div className="relative">
        <input
          id={`health-${name}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!errors[name] || undefined}
          aria-describedby={`health-${name}-hint`}
          {...register(name)}
          className={cn(INPUT_CLASS, 'h-11 pr-12 tabular-nums', errors[name] && INPUT_ERROR_CLASS)}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-label-md text-label-md text-outline">{unit}</span>
      </div>
      <p id={`health-${name}-hint`} className={HINT}>
        {hint}
      </p>
      <FieldError>{errors[name]?.message}</FieldError>
    </div>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
      className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12"
    >
      <div className={cn(CARD, 'flex flex-col gap-space-md lg:col-span-8')}>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Thông số cơ thể</h2>
        <div className="grid gap-space-md sm:grid-cols-2">
          {numberInput('heightCm', 'Chiều cao', 'cm', `Từ ${HEIGHT_MIN} đến ${HEIGHT_MAX} cm.`)}
          {numberInput('weightKg', 'Cân nặng hiện tại', 'kg', `Từ ${WEIGHT_MIN} đến ${WEIGHT_MAX} kg, ví dụ 54,5.`)}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="health-dateOfBirth" className={LABEL}>
              Ngày sinh <span className="text-secondary">*</span>
            </label>
            <input
              id="health-dateOfBirth"
              type="date"
              max={todayIso()}
              aria-invalid={!!errors.dateOfBirth || undefined}
              {...register('dateOfBirth')}
              className={cn(INPUT_CLASS, 'h-11', errors.dateOfBirth && INPUT_ERROR_CLASS)}
            />
            <FieldError>{errors.dateOfBirth?.message}</FieldError>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className={cn(LABEL, 'mb-1.5')}>
              Giới tính <span className="text-secondary">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((option) => (
                <label key={option.value} className={cn(CHOICE, 'items-center')}>
                  <input type="radio" value={option.value} {...register('gender')} className="accent-primary" />
                  <span className="font-body-md text-body-md text-on-surface">{option.label}</span>
                </label>
              ))}
            </div>
            <FieldError>{errors.gender?.message}</FieldError>
          </fieldset>
        </div>

        <h2 className="pt-space-sm font-headline-sm text-headline-sm text-on-surface">Mục tiêu & chế độ ăn</h2>
        <fieldset className="flex flex-col gap-1.5">
          <legend className={cn(LABEL, 'mb-1.5')}>
            Mục tiêu sức khỏe <span className="text-secondary">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {GOAL_OPTIONS.map((option) => (
              <label key={option.value} className={CHOICE}>
                <input type="radio" value={option.value} {...register('healthGoal')} className="mt-1 accent-primary" />
                <span>
                  <span className="block font-label-md text-label-md text-on-surface">{option.label}</span>
                  <span className={HINT}>{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError>{errors.healthGoal?.message}</FieldError>
        </fieldset>
        <div className="grid gap-space-md sm:grid-cols-2">
          {numberInput('targetWeightKg', 'Cân nặng mục tiêu', 'kg', 'Không bắt buộc.', false)}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="health-region" className={LABEL}>
              Khẩu vị vùng miền
            </label>
            <select id="health-region" {...register('regionPreference')} className={cn(INPUT_CLASS, 'h-11 cursor-pointer py-0')}>
              <option value="">Chưa chọn</option>
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="health-school" className={LABEL}>
              Trường phái ăn chay <span className="text-secondary">*</span>
            </label>
            <select
              id="health-school"
              aria-invalid={!!errors.dietarySchoolId || undefined}
              disabled={schools.isPending}
              {...register('dietarySchoolId')}
              className={cn(INPUT_CLASS, 'h-11 cursor-pointer py-0', errors.dietarySchoolId && INPUT_ERROR_CLASS)}
            >
              <option value="">{schools.isPending ? 'Đang tải…' : 'Chọn trường phái'}</option>
              {schools.data?.map((item) => (
                <option key={item.dietarySchoolId} value={item.dietarySchoolId}>
                  {item.schoolName}
                </option>
              ))}
            </select>
            {schools.isError && (
              <p role="alert" className="font-label-sm text-label-sm text-error">
                Không tải được danh sách trường phái.{' '}
                <button type="button" onClick={() => schools.refetch()} className="text-primary hover:underline">
                  Thử lại
                </button>
              </p>
            )}
            <FieldError>{errors.dietarySchoolId?.message}</FieldError>
          </div>
          <label className={cn(CHOICE, 'self-end', alliumForced && 'cursor-not-allowed opacity-80')}>
            {/* Không dùng disabled: ô bị disabled thì react-hook-form gửi giá trị undefined. */}
            <input
              type="checkbox"
              aria-disabled={alliumForced || undefined}
              onClick={(event) => alliumForced && event.preventDefault()}
              {...register('requiresAlliumFree')}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="block font-label-md text-label-md text-on-surface">Kiêng ngũ vị tân</span>
              <span className={HINT}>
                {alliumForced ? `${school?.schoolName} luôn kiêng hành, tỏi, hẹ, kiệu, nén.` : 'Không dùng hành, tỏi, hẹ, kiệu, nén.'}
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm border-t border-surface-container pt-space-md">
          <Button type="submit" size="lg" loading={saving} disabled={saving || lockedSeconds > 0}>
            {!saving && <Icon name="save" className="text-[18px]" />}
            Lưu hồ sơ sức khỏe
          </Button>
          {lockedSeconds > 0 && (
            <p role="status" className="font-label-sm text-label-sm text-warning">
              Thao tác quá nhanh, thử lại sau {lockedSeconds} giây.
            </p>
          )}
          <p className={cn(HINT, 'w-full')}>Mỗi lần lưu, cân nặng hiện tại được ghi thêm vào lịch sử cân nặng.</p>
        </div>
      </div>

      <aside className="flex flex-col gap-space-lg lg:sticky lg:top-24 lg:col-span-4">
        <BmiPreview height={height} weight={weight} gender={gender} dateOfBirth={dateOfBirth} goal={goal} />
      </aside>
    </form>
  );
};
