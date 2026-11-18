/**
 * SCR-13 · recipes/RecipeEditor · `/recipes/new` · `/recipes/:id/edit`
 * FN: FN-POST-03, FN-POST-04, FN-POST-08, FN-PROF-08 · Huỳnh Việt Phát · Sprint 5
 * Khách xem được form soạn mới; Lưu nháp / Gửi duyệt cần Thành viên (guard theo từng nút).
 * Ảnh/video tải lên sau khi có recipeId vì POST /videos yêu cầu recipeId.
 *
 * UNSPECIFIED (giả định 17/10/2026, chờ Leader chốt): trang sửa đọc GET /recipes/{id} với các trường dành cho tác giả
 * (authorId, status, categoryId, dietarySchoolId, difficultyLevel, isOptional) — xem RecipeOwnerFields trong recipe.types.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import type { UseFormSetError } from 'react-hook-form';
import { ContentTypeTabs } from '@/components/common/ContentTypeTabs';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getAttachmentKind } from '@/features/community/types/community.schemas';
import { useCountdown } from '@/hooks/useCountdown';
import { toApiError } from '@/lib/apiError';
import { getErrorMessage, notifyApiError, notifyError, notifyInfo, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { listIngredients } from '../api/recipes.api';
import { masterKeys } from '../hooks/recipeKeys';
import {
  RecipeForm,
  type RecipeFormHelpers,
  type RecipeFormSubmission,
  type RecipeFormVariant,
  type RecipeSubmitIntent,
} from '../components/RecipeForm';
import { RecipeStatusBadge } from '../components/RecipeStatusBadge';
import { useCreateRecipe, useUpdateRecipe, useUploadRecipeMedia } from '../hooks/useRecipeMutations';
import { useIngredientInfos, useRecipe } from '../hooks/useRecipes';
import { RECIPE_STATUS_META, canEditRecipe, isDraftLike } from '../lib/recipeStatus';
import {
  EMPTY_RECIPE_FORM,
  emptyIngredientRow,
  toFormValues,
  toRecipeBody,
  toUpdateBody,
  type RecipeFormValues,
} from '../types/recipe.schemas';
import type { MyRecipeStatus, RecipeStatus, UpdateRecipeBody } from '../types/recipe.types';

/** Khóa nút gửi tạm thời sau 429 (UI Spec 1.1). */
const RATE_LIMIT_LOCK_MS = 30 * 1000;

const FIELD_ROOTS = [
  'foodName',
  'foodId',
  'title',
  'categoryId',
  'dietarySchoolId',
  'description',
  'instructions',
  'prepTimeMinutes',
  'cookTimeMinutes',
  'servings',
  'difficultyLevel',
  'ingredients',
] as const;

/** 400 ERR_VALIDATION: gắn lỗi theo details[]; "ingredients[0].quantity" → lỗi chung của danh sách nguyên liệu. */
function applyRecipeFieldErrors(error: unknown, setError: UseFormSetError<RecipeFormValues>): boolean {
  const apiError = toApiError(error);
  if (apiError.status !== 400 || apiError.details.length === 0) return false;
  let applied = false;
  for (const detail of apiError.details) {
    const root = FIELD_ROOTS.find((name) => name === detail.field.split(/[.[]/)[0]);
    if (!root) continue;
    // Lỗi foodId (món đã bị xóa…) hiện dưới ô Món ăn.
    setError(root === 'foodId' ? 'foodName' : root, { type: 'server', message: detail.message });
    applied = true;
  }
  return applied;
}

/** Tiêu đề khung cảnh báo cho lỗi 422 của FN-POST-03/04/08. */
const REJECT_TITLE: Record<string, string> = {
  ERR_RECIPE_RED_ALERT: 'Nguyên liệu không hợp với trường phái đã chọn',
  ERR_CONTENT_VIOLATION_VEGAN: 'Công thức có thịt động vật',
  ERR_RECIPE_STRUCTURE_INVALID: 'Công thức chưa đủ cấu trúc bắt buộc',
  ERR_RECIPE_EDIT_REJECTED: 'Bản sửa chưa qua kiểm duyệt',
  ERR_STT_DURATION_INVALID: 'Video chưa đúng thời lượng',
};

/** Lỗi tệp hiện ngay tại ô chọn tệp: 413 quá dung lượng, 422 sai thời lượng video, 400 sai định dạng. */
const isFileError = (error: unknown) => [400, 413, 422].includes(toApiError(error).status);

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

const PAGE = 'mx-auto w-full max-w-[1200px] px-margin-mobile pb-space-xl sm:px-margin';
const PRIMARY_LINK =
  'inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary';

const RecipeEditor: React.FC = () => {
  const { id } = useParams();
  const editId = id === undefined ? null : Number(id);
  const isEdit = editId !== null;
  const validEditId = isEdit && Number.isInteger(editId) && editId > 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCommunity = searchParams.get('from') === 'community';

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fromCommunity ? PATHS.COMMUNITY.ROOT : isEdit ? PATHS.ME.RECIPES : PATHS.RECIPES.ROOT);
    }
  };
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const recipe = useRecipe(validEditId ? editId : 0);
  const { infos, ready: infosReady } = useIngredientInfos(validEditId ? recipe.data?.ingredients : undefined);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const uploadMedia = useUploadRecipeMedia();
  const [formKey, setFormKey] = useState(0);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState<RecipeSubmitIntent | null>(null);
  const [serverAlert, setServerAlert] = useState<{ tone: 'error' | 'warning'; title: string; message: string } | null>(null);
  const [lockedDialog, setLockedDialog] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockedSeconds = useCountdown(lockedUntil);

  const location = useLocation();
  const locationState = location.state as {
    prefillRecipe?: {
      title?: string;
      description?: string;
      servings?: string;
      cookTimeMinutes?: string;
      ingredients?: { name: string; quantity?: string; unit?: string; isOptional?: boolean }[];
      steps?: string[];
    };
    fromVideoId?: number;
    fromPostId?: number;
  } | null;

  const sttPrefill = !isEdit && locationState?.prefillRecipe ? locationState.prefillRecipe : null;

  const prefillQueries = useQueries({
    queries: (sttPrefill?.ingredients ?? []).map((ing) => ({
      queryKey: masterKeys.ingredients(ing.name),
      queryFn: () => listIngredients({ keyword: ing.name, page: 1, size: 5 }),
      enabled: !!sttPrefill && !!ing.name,
      staleTime: 60 * 60 * 1000,
    })),
  });

  const [prefillDefaults, setPrefillDefaults] = useState<RecipeFormValues | null>(() => {
    if (!sttPrefill) return null;
    const steps = (sttPrefill.steps ?? []).filter((s) => s.trim().length > 0);
    const instructions =
      steps.length >= 2
        ? steps.map((text) => ({ text }))
        : steps.length === 1
          ? [{ text: steps[0] }, { text: '' }]
          : [{ text: '' }, { text: '' }];

    // Video chỉ cho một tên: dùng làm cả món ăn (người dùng chọn lại món có sẵn nếu trùng) và tên công thức.
    return {
      foodId: null,
      foodName: sttPrefill.title || '',
      title: sttPrefill.title || '',
      dietarySchoolId: '',
      categoryId: '',
      description: sttPrefill.description || '',
      prepTimeMinutes: '10',
      cookTimeMinutes: sttPrefill.cookTimeMinutes || '20',
      servings: sttPrefill.servings || '2',
      difficultyLevel: 'EASY',
      ingredients:
        (sttPrefill.ingredients ?? []).length > 0
          ? (sttPrefill.ingredients ?? []).map((ing) => ({
              ingredientId: null,
              name: ing.name,
              info: null,
              quantity: ing.quantity ? String(ing.quantity) : '1',
              unit: ing.unit || 'g',
              isOptional: ing.isOptional ?? false,
            }))
          : [emptyIngredientRow()],
      instructions,
    };
  });

  const prefillAppliedRef = useRef(false);
  const allPrefillDone =
    prefillQueries.length > 0 && prefillQueries.every((q) => q.isSuccess || q.isError);

  useEffect(() => {
    if (!sttPrefill || isEdit || prefillAppliedRef.current) return;
    if (!allPrefillDone) return;

    prefillAppliedRef.current = true;
    const mappedIngredients = (sttPrefill.ingredients ?? []).map((ing, idx) => {
      const q = prefillQueries[idx];
      const items = q?.data?.items ?? [];
      const exact = items.find((item) => item.name.toLowerCase() === ing.name.toLowerCase()) || items[0];
      return {
        ingredientId: exact ? exact.ingredientId : null,
        name: exact ? exact.name : ing.name,
        info: exact || null,
        quantity: ing.quantity ? String(ing.quantity) : '1',
        unit: ing.unit || (exact ? exact.standardUnit : 'g'),
        isOptional: ing.isOptional ?? false,
      };
    });

    const steps = (sttPrefill.steps ?? []).filter((s) => s.trim().length > 0);
    const instructions =
      steps.length >= 2
        ? steps.map((text) => ({ text }))
        : steps.length === 1
          ? [{ text: steps[0] }, { text: '' }]
          : [{ text: '' }, { text: '' }];

    setPrefillDefaults({
      foodId: null,
      foodName: sttPrefill.title || '',
      title: sttPrefill.title || '',
      dietarySchoolId: '',
      categoryId: '',
      description: sttPrefill.description || '',
      prepTimeMinutes: '10',
      cookTimeMinutes: sttPrefill.cookTimeMinutes || '20',
      servings: sttPrefill.servings || '2',
      difficultyLevel: 'EASY',
      ingredients: mappedIngredients.length > 0 ? mappedIngredients : [emptyIngredientRow()],
      instructions,
    });
  }, [sttPrefill, isEdit, allPrefillDone]);

  // Trang sửa: công thức từ API không có status nghĩa là bản công khai (GET chỉ trả APPROVED_ACTIVE cho người khác).
  const editStatus: MyRecipeStatus = (recipe.data?.status as MyRecipeStatus | undefined) ?? 'APPROVED_ACTIVE';
  const variant: RecipeFormVariant = !isEdit ? 'create' : isDraftLike(editStatus) ? 'draft' : 'published';
  // Giá trị ban đầu của form sửa: dựng đúng một lần khi đã có công thức và bản ghi nguyên liệu. Các lần tải lại sau khi lưu
  // không dựng lại, để form không bị gỡ ra giữa chừng (form chỉ đọc defaultValues lúc mount).
  const [editDefaults, setEditDefaults] = useState<RecipeFormValues | null>(null);
  useEffect(() => {
    if (!editDefaults && recipe.data && infosReady) setEditDefaults(toFormValues(recipe.data, infos));
  }, [editDefaults, recipe.data, infosReady, infos]);

  const startOver = () => {
    setCreatedId(null);
    setSavedAt(null);
    setServerAlert(null);
    setFormKey((key) => key + 1);
    if (isEdit) navigate(PATHS.RECIPES.NEW);
  };

  /** Lỗi khi lưu/gửi: hành vi theo bảng mã lỗi của SCR-13; luôn giữ nguyên dữ liệu đã nhập. */
  const handleSaveError = (error: unknown, setError: UseFormSetError<RecipeFormValues>) => {
    const apiError = toApiError(error);
    if (applyRecipeFieldErrors(error, setError)) return;
    if (apiError.status === 422) {
      setServerAlert({ tone: 'error', title: REJECT_TITLE[apiError.errorCode] ?? 'Công thức chưa được chấp nhận', message: getErrorMessage(apiError) });
      notifyError(getErrorMessage(apiError) || 'Công thức của bạn vi phạm tiêu chuẩn cộng đồng và chờ kiểm duyệt nên chưa hiển thị công khai.');
    } else if (apiError.status === 409) {
      setLockedDialog(getErrorMessage(apiError));
    } else if (apiError.status === 502 || apiError.status === 503) {
      setServerAlert({
        tone: 'warning',
        title: 'Dịch vụ tạm gián đoạn',
        message: `${getErrorMessage(apiError)} Dữ liệu bạn nhập vẫn được giữ, hãy thử lại sau ít phút.`,
      });
    } else {
      if (apiError.status === 429) setLockedUntil(Date.now() + RATE_LIMIT_LOCK_MS);
      notifyApiError(error);
    }
  };

  /** Tạo mới: lần đầu POST đủ trường, các lần lưu sau trong phiên PUT đủ trường. Sửa: PUT trường đã đổi. */
  const save = async ({ values, dirty, removeExistingMedia, intent }: RecipeFormSubmission): Promise<{ id: number; status: RecipeStatus; message: string } | 'unchanged'> => {
    if (!isEdit && createdId === null) {
      const res = await createRecipe.mutateAsync(toRecipeBody(values, intent === 'submit'));
      setCreatedId(res.data.recipeId);
      return { id: res.data.recipeId, status: res.data.status as RecipeStatus, message: res.message };
    }
    const recipeId = isEdit ? (editId as number) : (createdId as number);
    let body: UpdateRecipeBody;
    if (isEdit) {
      body = toUpdateBody(values, dirty, variant === 'draft' ? intent === 'submit' : undefined);
      if (removeExistingMedia) {
        body.imageUrl = '';
      }
      const changed = Object.keys(body).some((key) => key !== 'submit');
      if (!changed && intent !== 'submit') return 'unchanged';
    } else {
      body = toRecipeBody(values, intent === 'submit');
    }
    const res = await updateRecipe.mutateAsync({ recipeId, body });
    return { id: recipeId, status: res.data.status as RecipeStatus, message: res.message };
  };

  const handleSubmit = async (submission: RecipeFormSubmission, { setError, setFileError, clearFile, markSaved }: RecipeFormHelpers) => {
    const { file } = submission;
    setSubmitting(submission.intent);
    setServerAlert(null);
    try {
      let result: Awaited<ReturnType<typeof save>>;
      try {
        result = await save(submission);
      } catch (error) {
        handleSaveError(error, setError);
        return;
      }
      if (result === 'unchanged') {
        if (!file) {
          notifyInfo('Bạn chưa thay đổi nội dung nào.');
          return;
        }
        result = { id: editId as number, status: editStatus, message: '' };
      }
      const { id: recipeId } = result;
      let { status, message } = result;

      if (file) {
        try {
          const res = await uploadMedia.mutateAsync({ file, recipeId });
          clearFile();
          if (res.data?.moderationStatus) {
            status = res.data.moderationStatus as RecipeStatus;
          }
          if (res.data?.status === 'BANNED') {
            status = 'QUARANTINED_HIDDEN';
          }
          if (res.message) {
            message = res.message;
          }
        } catch (uploadError) {
          if (isFileError(uploadError)) setFileError(getErrorMessage(uploadError));
          else notifyApiError(uploadError);
          // Công thức đã lưu: giữ trên trang để thử tải lại tệp ở lần lưu sau.
          if (status === 'DRAFT') {
            setSavedAt(new Date());
            markSaved();
            notifyInfo('Đã lưu nháp nhưng chưa tải được tệp. Bạn có thể chọn lại tệp và lưu tiếp.');
            return;
          }
          notifyInfo(`Công thức đã được lưu nhưng chưa tải được tệp: ${getErrorMessage(uploadError)}`);
          return;
        }
      }

      if (status === 'DRAFT') {
        setSavedAt(new Date());
        markSaved();
        if (message) notifySuccess(message);
      } else if (status === 'QUARANTINED_HIDDEN') {
        notifyError('Công thức của bạn vi phạm tiêu chuẩn cộng đồng và chờ kiểm duyệt nên chưa hiển thị công khai.');
        if (!isEdit) {
          navigate(PATHS.RECIPES.EDIT(recipeId), { replace: true });
        } else {
          recipe.refetch();
        }
      } else if (status === 'PENDING_REVIEW' || status === 'REJECTED') {
        notifyInfo('Công thức đang chờ kiểm duyệt nên chưa hiển thị công khai.');
        navigate(PATHS.ME.CONTENT('recipes'));
      } else {
        notifySuccess(message || 'Công thức đã được kiểm duyệt hợp lệ và đăng công khai.');
        navigate(PATHS.RECIPES.DETAIL(recipeId), { replace: true });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const header = (
    <div className="flex flex-col gap-space-xs py-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container hover:text-primary active:scale-95 cursor-pointer"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          <span>Quay lại</span>
        </button>

        <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
          <Link to={PATHS.HOME} className="text-on-surface-variant no-underline hover:text-primary">
            Trang chủ
          </Link>
          <span className="text-outline-variant">/</span>
          {isEdit ? (
            <Link to={PATHS.ME.CONTENT('recipes')} className="text-on-surface-variant no-underline hover:text-primary">
              Nội dung của tôi
            </Link>
          ) : fromCommunity ? (
            <Link to={PATHS.COMMUNITY.ROOT} className="text-on-surface-variant no-underline hover:text-primary">
              Cộng đồng
            </Link>
          ) : (
            <Link to={PATHS.RECIPES.ROOT} className="text-on-surface-variant no-underline hover:text-primary">
              Kho công thức
            </Link>
          )}
          <span className="text-outline-variant">/</span>
          <span aria-current="page" className="text-primary">
            {isEdit ? 'Sửa công thức' : 'Đăng công thức'}
          </span>
        </nav>
      </div>

      <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">
        {isEdit ? 'Sửa công thức' : 'Soạn công thức chay'}
      </h1>
    </div>
  );

  const shell = (body: React.ReactNode) => (
    <div className={PAGE}>
      {header}
      {body}
    </div>
  );

  if (isEdit) {
    if (!validEditId) {
      return shell(<EmptyState icon="search_off" title="Không tìm thấy công thức" description="Đường dẫn sửa công thức không hợp lệ." />);
    }
    if (sessionStatus === 'restoring') return <PageLoader />;
    if (!user) {
      return shell(
        <EmptyState
          icon="lock"
          title="Đăng nhập để sửa công thức"
          description="Chỉ tác giả mới sửa được công thức của mình."
          action={
            <Link to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.RECIPES.EDIT(editId))} className={PRIMARY_LINK}>
              Đăng nhập
            </Link>
          }
        />
      );
    }
    if (recipe.isError) {
      if (toApiError(recipe.error).status === 404) {
        return shell(
          <EmptyState
            icon="search_off"
            title="Không tìm thấy công thức"
            description="Công thức không tồn tại hoặc đã bị xóa."
            action={
              <Link to={PATHS.ME.CONTENT('recipes')} className={PRIMARY_LINK}>
                Về nội dung của tôi
              </Link>
            }
          />
        );
      }
      return shell(<ErrorState error={recipe.error} onRetry={() => recipe.refetch()} retrying={recipe.isRefetching} />);
    }
    if (recipe.isPending || !editDefaults) {
      return shell(
        <div className="grid gap-space-lg lg:grid-cols-12" role="status" aria-label="Đang tải công thức">
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-8" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-4" />
        </div>
      );
    }
    if (recipe.data.authorId !== user.userId) {
      return shell(<EmptyState icon="lock" title="Bạn không thể sửa công thức này" description="Chỉ tác giả mới sửa được công thức." />);
    }
    if (!canEditRecipe(editStatus)) {
      return shell(
        <EmptyState
          icon={RECIPE_STATUS_META[editStatus].icon}
          title={editStatus === 'ARCHIVED' ? 'Công thức đã gỡ' : 'Công thức đang bị khóa'}
          description={RECIPE_STATUS_META[editStatus].hint}
          action={
            <Link to={PATHS.ME.CONTENT('recipes')} className={PRIMARY_LINK}>
              Về nội dung của tôi
            </Link>
          }
        />
      );
    }
  }

  const isQuarantined = isEdit && editStatus === 'QUARANTINED_HIDDEN';
  const initialVideoUrl =
    recipe.data?.videoUrl ||
    recipe.data?.videos?.[0]?.videoUrl ||
    (recipe.data?.imageUrl?.includes('/video/upload/') || recipe.data?.imageUrl?.match(/\.(mp4|mov)$/i)
      ? recipe.data.imageUrl.replace(/\.jpg$/i, '.mp4')
      : undefined);
  const initialImageUrl = recipe.data?.imageUrl;

  const statusNote = (
    <>
      {isEdit && (
        <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low px-3 py-2">
          <RecipeStatusBadge status={editStatus} className="w-fit" />
          <p className="font-label-sm text-label-sm text-on-surface-variant">{RECIPE_STATUS_META[editStatus].hint}</p>
        </div>
      )}
      {savedAt && (
        <p role="status" className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-on-surface">
          <Icon name="draft" className="text-[18px] text-outline" />
          Bản nháp · đã lưu lúc {timeFormatter.format(savedAt)}
          <Link to={PATHS.ME.CONTENT('recipes')} className="ml-auto font-label-sm text-label-sm text-primary">
            Nội dung của tôi
          </Link>
        </p>
      )}
    </>
  );

  return shell(
    <>
      {!isEdit && <ContentTypeTabs activeType="RECIPE" />}
      {isQuarantined && (
        <div className="flex items-center gap-2.5 rounded-xl border border-error/30 bg-error-container/20 px-space-md py-2.5 text-error shadow-sm mb-space-md">
          <Icon name="warning" className="text-[20px] shrink-0" />
          <span className="font-label-md text-label-md font-semibold">
            Công thức đang tạm ẩn do chưa phù hợp tiêu chuẩn cộng đồng
          </span>
        </div>
      )}
      {sttPrefill && (
        <div className="mb-space-md flex items-start gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary-container/30 via-surface-container-low to-secondary-container/20 p-space-md shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm">
            <Icon name="auto_awesome" className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <h3 className="font-label-lg text-label-lg font-bold text-primary">
              Dữ liệu được bóc tách tự động từ video qua AI
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Món ăn, tên công thức, mô tả, danh sách nguyên liệu và các bước nấu đã được tự động điền từ video. Bạn hãy kiểm tra lại (chọn món có sẵn nếu trùng), chọn trường phái ăn chay và danh mục trước khi đăng bài.
            </p>
          </div>
        </div>
      )}
      <RecipeForm
        key={`${editId ?? 'new'}-${formKey}`}
        variant={variant}
        defaultValues={isEdit && editDefaults ? editDefaults : prefillDefaults ? prefillDefaults : EMPTY_RECIPE_FORM}
        submitting={submitting}
        lockedSeconds={lockedSeconds}
        cancelTo={isEdit ? PATHS.ME.CONTENT('recipes') : fromCommunity ? PATHS.COMMUNITY.ROOT : PATHS.RECIPES.ROOT}
        onSubmit={handleSubmit}
        statusNote={statusNote}
        initialImageUrl={initialImageUrl}
        initialVideoUrl={initialVideoUrl}
        isQuarantined={isQuarantined}
        alert={
          serverAlert && (
            <FormAlert tone={serverAlert.tone} title={serverAlert.title}>
              {serverAlert.message}
            </FormAlert>
          )
        }
      />

      <Modal show={lockedDialog !== null} onHide={() => setLockedDialog(null)} title="Công thức đang bị khóa" size="sm">
        <div className="flex flex-col gap-5 p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{lockedDialog}</p>
          <div className="flex justify-end">
            <Button onClick={() => setLockedDialog(null)}>Đã hiểu</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RecipeEditor;
