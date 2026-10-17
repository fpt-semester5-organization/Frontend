import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormProvider, useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { AttachmentInput } from '@/features/community/components/AttachmentInput';
import { useRequireMember } from '@/hooks/useRequireMember';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useCategories, useDietarySchools } from '../hooks/useRecipes';
import {
  DIFFICULTY_OPTIONS,
  RECIPE_DESCRIPTION_MAX,
  RECIPE_TITLE_MAX,
  estimateCalories,
  recipeFormSchema,
  type RecipeFormValues,
} from '../types/recipe.schemas';
import { RecipeIngredientFields } from './RecipeIngredientFields';
import { RecipeStepFields } from './RecipeStepFields';

/** draft = lưu nháp, submit = gửi duyệt (POST/PUT submit), save = lưu thay đổi bản đã gửi (kiểm duyệt lại). */
export type RecipeSubmitIntent = 'draft' | 'submit' | 'save';

/**
 * create: soạn mới; draft: sửa bản nháp/bị từ chối (còn bước gửi duyệt);
 * published: sửa bản đã gửi — chỉ có "Lưu thay đổi", server kiểm duyệt lại (D107).
 */
export type RecipeFormVariant = 'create' | 'draft' | 'published';

export interface RecipeFormSubmission {
  values: RecipeFormValues;
  /** Trường người dùng đã sửa so với giá trị ban đầu (khi sửa chỉ gửi các trường này). */
  dirty: Partial<Record<keyof RecipeFormValues, unknown>>;
  file: File | null;
  intent: RecipeSubmitIntent;
}

export interface RecipeFormHelpers {
  setError: UseFormSetError<RecipeFormValues>;
  setFileError: (message: string) => void;
  clearFile: () => void;
  /** Lưu thành công: lấy giá trị hiện tại làm mốc so sánh mới để lần lưu sau chỉ gửi phần đổi tiếp. */
  markSaved: () => void;
}

interface RecipeFormProps {
  variant: RecipeFormVariant;
  defaultValues: RecipeFormValues;
  submitting: RecipeSubmitIntent | null;
  /** Còn bao nhiêu giây bị khóa nút gửi sau 429 (UI Spec 1.1). */
  lockedSeconds: number;
  /** Trạng thái đã lưu (ví dụ "Bản nháp · đã lưu lúc 10:14"). */
  statusNote?: React.ReactNode;
  /** Khung cảnh báo từ server (422, 503…) hiện ngay trên nút gửi. */
  alert?: React.ReactNode;
  onSubmit: (submission: RecipeFormSubmission, helpers: RecipeFormHelpers) => void;
  cancelTo: string;
}

const CARD = 'rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg';
const LABEL = 'font-label-md text-label-md text-on-surface';
const NUMBER_INPUT = cn(INPUT_CLASS, 'h-11 tabular-nums');

const SectionTitle: React.FC<{ id: string; index: string; title: string; hint?: string }> = ({ id, index, title, hint }) => (
  <div className="mb-space-md flex items-start gap-space-sm">
    <span className="flex h-7 shrink-0 items-center rounded-md bg-primary-container px-2 font-label-md text-label-md text-on-primary">
      {index}
    </span>
    <div>
      <h2 id={id} className="font-headline-sm text-headline-sm text-on-surface">
        {title}
      </h2>
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  </div>
);

const LookupError: React.FC<{ onRetry: () => void; label: string }> = ({ onRetry, label }) => (
  <p role="alert" className="flex items-center gap-2 font-label-sm text-label-sm text-error">
    Không tải được {label}.
    <button type="button" onClick={onRetry} className="text-primary hover:underline">
      Thử lại
    </button>
  </p>
);

/** Form soạn công thức (SCR-13): thông tin cơ bản, nguyên liệu có định lượng, các bước, ảnh/video (BR-USR-05). */
export const RecipeForm: React.FC<RecipeFormProps> = ({
  variant,
  defaultValues,
  submitting,
  lockedSeconds,
  statusNote,
  alert,
  onSubmit,
  cancelTo,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const { requireMember } = useRequireMember();
  const schools = useDietarySchools();
  const categories = useCategories();
  const form = useForm<RecipeFormValues>({ resolver: zodResolver(recipeFormSchema), defaultValues });
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    getValues,
    setValue,
    formState: { errors, dirtyFields },
  } = form;

  // Danh sách trường phái/danh mục về sau khi form đã mount (trang sửa) thì ô chọn chưa có option để chọn sẵn:
  // gán lại giá trị hiện tại khi option đã có, không tính là người dùng sửa.
  useEffect(() => {
    if (schools.data) setValue('dietarySchoolId', getValues('dietarySchoolId'));
  }, [schools.data, setValue, getValues]);
  useEffect(() => {
    if (categories.data) setValue('categoryId', getValues('categoryId'));
  }, [categories.data, setValue, getValues]);

  const [title, description, schoolId, servings, ingredients] = useWatch({
    control,
    name: ['title', 'description', 'dietarySchoolId', 'servings', 'ingredients'],
  });
  const school = schools.data?.find((item) => item.dietarySchoolId === Number(schoolId));
  const estimate = estimateCalories(ingredients ?? []);
  const perServing = Number(servings) > 0 ? Math.round(estimate.kcal / Number(servings)) : null;

  const busy = submitting !== null;
  const blocked = busy || lockedSeconds > 0;

  /** Guard theo nút (SCR-13): Khách bấm thì mở SignupPromptModal, không validate/gọi API. */
  const submitWith = (intent: RecipeSubmitIntent) => () =>
    requireMember(() => {
      void handleSubmit((values) => {
        setFileError(undefined);
        onSubmit(
          { values, dirty: dirtyFields, file, intent },
          { setError, setFileError, clearFile: () => setFile(null), markSaved: () => reset(getValues()) }
        );
      })();
    });

  return (
    <FormProvider {...form}>
      {/* Không gửi ngầm khi nhấn Enter: gửi duyệt là thao tác có hậu quả (AI kiểm duyệt, hạn mức bài/ngày). */}
      <form onSubmit={(event) => event.preventDefault()} noValidate className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-space-lg lg:col-span-8">
          <section className={CARD} aria-labelledby="recipe-basic">
            <SectionTitle id="recipe-basic" index="01" title="Thông tin cơ bản" />
            <div className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="recipe-title" className={LABEL}>
                    Tên món <span className="text-secondary">*</span>
                  </label>
                  <span className="font-label-sm text-label-sm text-outline tabular-nums">
                    {title?.length ?? 0} / {RECIPE_TITLE_MAX}
                  </span>
                </div>
                <input
                  id="recipe-title"
                  type="text"
                  maxLength={RECIPE_TITLE_MAX}
                  placeholder="Ví dụ: Đậu hũ kho nấm hương"
                  aria-invalid={!!errors.title || undefined}
                  disabled={busy}
                  {...register('title')}
                  className={cn(INPUT_CLASS, 'h-12 font-headline-sm text-headline-sm', errors.title && INPUT_ERROR_CLASS)}
                />
                <FieldError>{errors.title?.message}</FieldError>
              </div>

              <div className="grid gap-space-md sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-school-select" className={LABEL}>
                    Trường phái ăn chay <span className="text-secondary">*</span>
                  </label>
                  <select
                    id="recipe-school-select"
                    aria-invalid={!!errors.dietarySchoolId || undefined}
                    disabled={busy || schools.isPending}
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
                  {schools.isError && <LookupError label="danh sách trường phái" onRetry={() => schools.refetch()} />}
                  <FieldError>{errors.dietarySchoolId?.message}</FieldError>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-category-select" className={LABEL}>
                    Danh mục món <span className="text-secondary">*</span>
                  </label>
                  <select
                    id="recipe-category-select"
                    aria-invalid={!!errors.categoryId || undefined}
                    disabled={busy || categories.isPending}
                    {...register('categoryId')}
                    className={cn(INPUT_CLASS, 'h-11 cursor-pointer py-0', errors.categoryId && INPUT_ERROR_CLASS)}
                  >
                    <option value="">{categories.isPending ? 'Đang tải…' : 'Chọn danh mục'}</option>
                    {categories.data?.map((item) => (
                      <option key={item.categoryId} value={item.categoryId}>
                        {item.categoryName}
                      </option>
                    ))}
                  </select>
                  {categories.isError && <LookupError label="danh mục món" onRetry={() => categories.refetch()} />}
                  <FieldError>{errors.categoryId?.message}</FieldError>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="recipe-description" className={LABEL}>
                    Mô tả ngắn
                  </label>
                  <span className="font-label-sm text-label-sm text-outline tabular-nums">
                    {description?.length ?? 0} / {RECIPE_DESCRIPTION_MAX}
                  </span>
                </div>
                <textarea
                  id="recipe-description"
                  rows={3}
                  maxLength={RECIPE_DESCRIPTION_MAX}
                  placeholder="Hương vị, nguồn gốc món ăn, mẹo nhỏ khi nấu…"
                  aria-invalid={!!errors.description || undefined}
                  disabled={busy}
                  {...register('description')}
                  className={cn(INPUT_CLASS, 'resize-y', errors.description && INPUT_ERROR_CLASS)}
                />
                <FieldError>{errors.description?.message}</FieldError>
              </div>

              <div className="grid grid-cols-2 gap-space-sm sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-prep" className={LABEL}>
                    Chuẩn bị (phút)
                  </label>
                  <input
                    id="recipe-prep"
                    type="text"
                    inputMode="numeric"
                    placeholder="15"
                    aria-invalid={!!errors.prepTimeMinutes || undefined}
                    disabled={busy}
                    {...register('prepTimeMinutes')}
                    className={cn(NUMBER_INPUT, errors.prepTimeMinutes && INPUT_ERROR_CLASS)}
                  />
                  <FieldError>{errors.prepTimeMinutes?.message}</FieldError>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-cook" className={LABEL}>
                    Nấu (phút) <span className="text-secondary">*</span>
                  </label>
                  <input
                    id="recipe-cook"
                    type="text"
                    inputMode="numeric"
                    placeholder="30"
                    aria-invalid={!!errors.cookTimeMinutes || undefined}
                    disabled={busy}
                    {...register('cookTimeMinutes')}
                    className={cn(NUMBER_INPUT, errors.cookTimeMinutes && INPUT_ERROR_CLASS)}
                  />
                  <FieldError>{errors.cookTimeMinutes?.message}</FieldError>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-servings" className={LABEL}>
                    Khẩu phần (người)
                  </label>
                  <input
                    id="recipe-servings"
                    type="text"
                    inputMode="numeric"
                    placeholder="2"
                    aria-invalid={!!errors.servings || undefined}
                    disabled={busy}
                    {...register('servings')}
                    className={cn(NUMBER_INPUT, errors.servings && INPUT_ERROR_CLASS)}
                  />
                  <FieldError>{errors.servings?.message}</FieldError>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipe-difficulty" className={LABEL}>
                    Độ khó
                  </label>
                  <select
                    id="recipe-difficulty"
                    disabled={busy}
                    {...register('difficultyLevel')}
                    className={cn(INPUT_CLASS, 'h-11 cursor-pointer py-0')}
                  >
                    <option value="">Chưa chọn</option>
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className={CARD} aria-labelledby="recipe-ingredients">
            <SectionTitle id="recipe-ingredients" index="02" title="Nguyên liệu" hint="Chọn từ danh mục và ghi rõ định lượng, đơn vị." />
            <RecipeIngredientFields school={school} disabled={busy} />
          </section>

          <section className={CARD} aria-labelledby="recipe-steps">
            <SectionTitle id="recipe-steps" index="03" title="Cách làm" hint="Tối thiểu 2 bước, mỗi bước một thao tác chính." />
            <RecipeStepFields disabled={busy} />
          </section>

          <section className={CARD} aria-labelledby="recipe-media">
            <SectionTitle id="recipe-media" index="04" title="Ảnh hoặc video món ăn" />
            <AttachmentInput
              value={file}
              onChange={(next) => {
                setFile(next);
                setFileError(undefined);
              }}
              serverError={fileError}
              disabled={busy}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-space-lg lg:sticky lg:top-24 lg:col-span-4">
          <div className={cn(CARD, 'flex flex-col gap-space-sm shadow-card-hover')}>
            {statusNote}
            {alert}
            {variant === 'published' ? (
              <Button size="lg" className="w-full" onClick={submitWith('save')} loading={submitting === 'save'} disabled={blocked}>
                {submitting !== 'save' && <Icon name="save" className="text-[18px]" />}
                Lưu thay đổi
              </Button>
            ) : (
              <>
                <Button size="lg" className="w-full" onClick={submitWith('submit')} loading={submitting === 'submit'} disabled={blocked}>
                  {submitting !== 'submit' && <Icon name="send" className="text-[18px]" />}
                  Gửi duyệt & đăng
                </Button>
                <Button variant="outline" className="w-full" onClick={submitWith('draft')} loading={submitting === 'draft'} disabled={blocked}>
                  {submitting !== 'draft' && <Icon name="save" className="text-[18px] text-outline" />}
                  Lưu nháp
                </Button>
              </>
            )}
            {lockedSeconds > 0 && (
              <p role="status" className="font-label-sm text-label-sm text-warning">
                Thao tác quá nhanh, thử lại sau {lockedSeconds} giây.
              </p>
            )}
            {variant === 'published' ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Bản sửa được AI kiểm duyệt lại trước khi ghi; nếu chưa đạt, bản đang công khai được giữ nguyên. Đổi trường phái hoặc
                nguyên liệu cũng cần kiểm duyệt lại.
              </p>
            ) : (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                AI kiểm duyệt công thức trước khi đăng: điểm vi phạm dưới 85% được đăng ngay, từ 85% trở lên chờ quản trị viên duyệt;
                nguyên liệu trái trường phái bị gỡ ngay (Red Alert). Giới hạn 02 bài/ngày với tài khoản dưới 3 ngày, sau đó 10
                bài/ngày (không tính nháp).
              </p>
            )}
            <Link
              to={cancelTo}
              className="block w-full rounded-lg py-2 text-center font-label-sm text-label-sm text-outline no-underline hover:text-on-surface"
            >
              Hủy và quay lại
            </Link>
          </div>

          <div className={CARD} aria-live="polite">
            <h2 className="flex items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
              <Icon name="local_fire_department" className="text-[20px] text-secondary" />
              Ước tính năng lượng
            </h2>
            {estimate.counted === 0 ? (
              <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
                Chọn nguyên liệu và nhập định lượng theo g, kg, ml hoặc lít để xem ước tính.
              </p>
            ) : (
              <>
                <p className="mt-space-sm font-headline-md text-headline-md text-on-surface tabular-nums">
                  {formatNumber(estimate.kcal)} <span className="font-label-md text-label-md text-on-surface-variant">kcal cả món</span>
                </p>
                {perServing !== null && (
                  <p className="font-label-md text-label-md text-on-surface-variant tabular-nums">≈ {formatNumber(perServing)} kcal mỗi người</p>
                )}
                <p className="mt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  Tính {estimate.counted}/{estimate.total} nguyên liệu đo bằng g, kg, ml, lít. Con số chính thức do hệ thống tính khi lưu.
                </p>
              </>
            )}
          </div>
        </aside>
      </form>
    </FormProvider>
  );
};
