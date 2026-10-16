/**
 * SCR-13 · recipes/RecipeEditor · `/recipes/new`
 * FN: FN-POST-03, FN-POST-04, FN-POST-08, FN-PROF-08 · Huỳnh Việt Phát · Sprint 5
 * Khách xem được form; Lưu nháp / Gửi duyệt cần Thành viên (guard theo từng nút).
 * Ảnh/video tải lên sau khi có recipeId vì POST /videos yêu cầu recipeId; các lần lưu sau trong phiên dùng PUT.
 *
 * UNSPECIFIED: chế độ sửa `/recipes/:id/edit` chưa làm vì GET /recipes/{id} chỉ trả bản đã duyệt và thiếu categoryId,
 * dietarySchoolId, difficultyLevel, tác giả (đang hỏi Leader).
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UseFormSetError } from 'react-hook-form';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useCountdown } from '@/hooks/useCountdown';
import { toApiError } from '@/lib/apiError';
import { getErrorMessage, notifyApiError, notifyInfo, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { getAttachmentKind } from '@/features/community/types/community.schemas';
import { RecipeForm, type RecipeFormHelpers, type RecipeFormSubmission, type RecipeSubmitIntent } from '../components/RecipeForm';
import { useCreateRecipe, useUpdateRecipe, useUploadRecipeMedia } from '../hooks/useRecipeMutations';
import { EMPTY_RECIPE_FORM, toRecipeBody, type RecipeFormValues } from '../types/recipe.schemas';
import type { RecipeStatus } from '../types/recipe.types';

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

interface PendingOutcome {
  status: RecipeStatus;
  message: string;
}

const RecipeEditor: React.FC = () => {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const uploadMedia = useUploadRecipeMedia();
  const [formKey, setFormKey] = useState(0);
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState<RecipeSubmitIntent | null>(null);
  const [serverAlert, setServerAlert] = useState<{ tone: 'error' | 'warning'; title: string; message: string } | null>(null);
  const [lockedDialog, setLockedDialog] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<PendingOutcome | null>(null);
  const lockedSeconds = useCountdown(lockedUntil);

  const startOver = () => {
    setRecipeId(null);
    setSavedAt(null);
    setServerAlert(null);
    setOutcome(null);
    setFormKey((key) => key + 1);
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

  const handleSubmit = async ({ values, file, intent }: RecipeFormSubmission, { setError, setFileError, clearFile }: RecipeFormHelpers) => {
    setSubmitting(intent);
    setServerAlert(null);
    try {
      const body = toRecipeBody(values, intent === 'submit');
      let id = recipeId;
      let status: RecipeStatus;
      let message: string;
      try {
        if (id === null) {
          const res = await createRecipe.mutateAsync(body);
          id = res.data.recipeId;
          status = res.data.status as RecipeStatus;
          message = res.message;
          setRecipeId(id);
        } else {
          const res = await updateRecipe.mutateAsync({ recipeId: id, body });
          status = res.data.status as RecipeStatus;
          message = res.message;
        }
      } catch (error) {
        handleSaveError(error, setError);
        return;
      }

      if (file) {
        try {
          const res = await uploadMedia.mutateAsync({ file, recipeId: id });
          clearFile();
          if (getAttachmentKind(file) === 'video') notifyInfo(res.message || 'Đã nhận video, đang xử lý.');
        } catch (uploadError) {
          if (isFileError(uploadError)) setFileError(getErrorMessage(uploadError));
          else notifyApiError(uploadError);
          // Công thức đã lưu: giữ trên trang để thử tải lại tệp ở lần lưu sau.
          if (status === 'DRAFT') {
            setSavedAt(new Date());
            notifyInfo('Đã lưu nháp nhưng chưa tải được tệp. Bạn có thể chọn lại tệp và lưu tiếp.');
            return;
          }
          notifyInfo(`Công thức đã được lưu nhưng chưa tải được tệp: ${getErrorMessage(uploadError)}`);
        }
      }

      if (status === 'DRAFT') {
        setSavedAt(new Date());
        notifySuccess(message || 'Đã lưu nháp.');
      } else if (status === 'APPROVED_ACTIVE') {
        notifySuccess(message || 'Đã đăng công thức.');
        navigate(PATHS.RECIPES.DETAIL(id), { replace: true });
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
        <Link to={PATHS.RECIPES.ROOT} className="text-on-surface-variant no-underline hover:text-primary">
          Kho công thức
        </Link>
        <span className="text-outline-variant">/</span>
        <span aria-current="page" className="text-primary">
          Đăng công thức
        </span>
      </nav>
      <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Soạn công thức chay</h1>
    </div>
  );

  if (outcome) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-margin-mobile pb-space-xl sm:px-margin">
        {header}
        <EmptyState
          icon="hourglass_top"
          title="Công thức đang chờ kiểm duyệt"
          description={`${outcome.message ? `${outcome.message} ` : ''}Công thức chưa hiển thị công khai cho tới khi quản trị viên duyệt xong.`}
          className="rounded-2xl bg-surface-container-lowest shadow-card"
          action={
            <>
              <Link
                to={PATHS.RECIPES.ROOT}
                className="inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
              >
                Về kho công thức
              </Link>
              <Button variant="outline" onClick={startOver}>
                Soạn công thức khác
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-margin-mobile pb-space-xl sm:px-margin">
      {header}
      <RecipeForm
        key={formKey}
        defaultValues={EMPTY_RECIPE_FORM}
        submitting={submitting}
        lockedSeconds={lockedSeconds}
        cancelTo={PATHS.RECIPES.ROOT}
        onSubmit={handleSubmit}
        statusNote={
          savedAt && (
            <p role="status" className="flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-on-surface">
              <Icon name="draft" className="text-[18px] text-outline" />
              Bản nháp · đã lưu lúc {timeFormatter.format(savedAt)}
            </p>
          )
        }
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
    </div>
  );
};

export default RecipeEditor;
