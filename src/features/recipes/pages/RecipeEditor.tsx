/**
 * SCR-13 · recipes/RecipeEditor · `/recipes/new` · `/recipes/:id/edit`
 * FN: FN-POST-03, FN-POST-04, FN-POST-08, FN-PROF-08 · Huỳnh Việt Phát · Sprint 5
 * Khách xem được form soạn mới; Lưu nháp / Gửi duyệt cần Thành viên (guard theo từng nút).
 * Ảnh/video tải lên sau khi có recipeId vì POST /videos yêu cầu recipeId.
 *
 * UNSPECIFIED (giả định 17/10/2026, chờ Leader chốt): trang sửa đọc GET /recipes/{id} với các trường dành cho tác giả
 * (authorId, status, categoryId, dietarySchoolId, difficultyLevel, isOptional) — xem RecipeOwnerFields trong recipe.types.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { UseFormSetError } from 'react-hook-form';
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
import { getErrorMessage, notifyApiError, notifyInfo, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
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
import { EMPTY_RECIPE_FORM, toFormValues, toRecipeBody, toUpdateBody, type RecipeFormValues } from '../types/recipe.schemas';
import type { MyRecipeStatus, RecipeStatus, UpdateRecipeBody } from '../types/recipe.types';

/** Khóa nút gửi tạm thời sau 429 (UI Spec 1.1). */
const RATE_LIMIT_LOCK_MS = 30 * 1000;

const FIELD_ROOTS = [
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
    setError(root, { type: 'server', message: detail.message });
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

interface PendingOutcome {
  status: RecipeStatus;
  message: string;
}

const RecipeEditor: React.FC = () => {
  const { id } = useParams();
  const editId = id === undefined ? null : Number(id);
  const isEdit = editId !== null;
  const validEditId = isEdit && Number.isInteger(editId) && editId > 0;
  const navigate = useNavigate();
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
  const [outcome, setOutcome] = useState<PendingOutcome | null>(null);
  const lockedSeconds = useCountdown(lockedUntil);

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
    setOutcome(null);
    setFormKey((key) => key + 1);
    if (isEdit) navigate(PATHS.RECIPES.NEW);
  };

  /** Lỗi khi lưu/gửi: hành vi theo bảng mã lỗi của SCR-13; luôn giữ nguyên dữ liệu đã nhập. */
  const handleSaveError = (error: unknown, setError: UseFormSetError<RecipeFormValues>) => {
    const apiError = toApiError(error);
    if (applyRecipeFieldErrors(error, setError)) return;
    if (apiError.status === 422) {
      setServerAlert({ tone: 'error', title: REJECT_TITLE[apiError.errorCode] ?? 'Công thức chưa được chấp nhận', message: getErrorMessage(apiError) });
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
  const save = async ({ values, dirty, intent }: RecipeFormSubmission): Promise<{ id: number; status: RecipeStatus; message: string } | 'unchanged'> => {
    if (!isEdit && createdId === null) {
      const res = await createRecipe.mutateAsync(toRecipeBody(values, intent === 'submit'));
      setCreatedId(res.data.recipeId);
      return { id: res.data.recipeId, status: res.data.status as RecipeStatus, message: res.message };
    }
    const recipeId = isEdit ? (editId as number) : (createdId as number);
    let body: UpdateRecipeBody;
    if (isEdit) {
      body = toUpdateBody(values, dirty, variant === 'draft' ? intent === 'submit' : undefined);
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
      const { id: recipeId, status, message } = result;

      if (file) {
        try {
          const res = await uploadMedia.mutateAsync({ file, recipeId });
          clearFile();
          if (getAttachmentKind(file) === 'video') notifyInfo(res.message || 'Đã nhận video, đang xử lý.');
          else if (!message) notifySuccess(res.message || 'Đã tải ảnh lên.');
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
        }
      }

      if (status === 'DRAFT') {
        setSavedAt(new Date());
        markSaved();
        if (message) notifySuccess(message);
      } else if (status === 'APPROVED_ACTIVE') {
        notifySuccess(message || 'Đã lưu công thức.');
        navigate(PATHS.RECIPES.DETAIL(recipeId), { replace: true });
      } else {
        // Điểm vi phạm ≥ 85% hoặc chờ duyệt (BR-ADM-CNT-002): chưa hiển thị công khai.
        setOutcome({ status, message });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const header = (
    <div className="flex flex-col gap-space-xs py-space-md">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <Link to={PATHS.HOME} className="text-on-surface-variant no-underline hover:text-primary">
          Trang chủ
        </Link>
        <span className="text-outline-variant">/</span>
        {isEdit ? (
          <Link to={PATHS.ME.RECIPES} className="text-on-surface-variant no-underline hover:text-primary">
            Công thức của tôi
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

  if (outcome) {
    return shell(
      <EmptyState
        icon="hourglass_top"
        title="Công thức đang chờ kiểm duyệt"
        description={`${outcome.message ? `${outcome.message} ` : ''}Công thức chưa hiển thị công khai cho tới khi quản trị viên duyệt xong.`}
        className="rounded-2xl bg-surface-container-lowest shadow-card"
        action={
          <>
            <Link to={PATHS.ME.RECIPES} className={PRIMARY_LINK}>
              Xem công thức của tôi
            </Link>
            <Button variant="outline" onClick={startOver}>
              Soạn công thức khác
            </Button>
          </>
        }
      />
    );
  }

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
              <Link to={PATHS.ME.RECIPES} className={PRIMARY_LINK}>
                Về công thức của tôi
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
            <Link to={PATHS.ME.RECIPES} className={PRIMARY_LINK}>
              Về công thức của tôi
            </Link>
          }
        />
      );
    }
  }

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
          <Link to={PATHS.ME.RECIPES} className="ml-auto font-label-sm text-label-sm text-primary">
            Công thức của tôi
          </Link>
        </p>
      )}
    </>
  );

  return shell(
    <>
      <RecipeForm
        key={`${editId ?? 'new'}-${formKey}`}
        variant={variant}
        defaultValues={isEdit && editDefaults ? editDefaults : EMPTY_RECIPE_FORM}
        submitting={submitting}
        lockedSeconds={lockedSeconds}
        cancelTo={isEdit ? PATHS.ME.RECIPES : PATHS.RECIPES.ROOT}
        onSubmit={handleSubmit}
        statusNote={statusNote}
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
