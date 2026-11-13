import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, ServerMessageDialog, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { CheckRow, FormDialog, FormRow } from '../components/FormDialog';
import { MasterDataTabs } from '../components/MasterDataTabs';
import { SearchBox } from '../components/SearchBox';
import {
  useAdminIngredients,
  useAllergens,
  useCreateAllergen,
  useCreateIngredient,
  useReplaceIngredientAllergens,
  useUpdateIngredient,
  useUploadIngredientImage,
  useApplyIngredientCandidate,
  useIngredientCandidates,
  useToggleIngredientLock,
} from '../hooks/useAdminMasterData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { FOOD_GROUP_LABEL, FOOD_GROUPS_MVP, STALL_TYPES, STALL_TYPE_LABEL } from '../lib/labels';
import { handleWriteError } from '../lib/writeError';
import type { AdminIngredient, CreateIngredientBody, FoodGroup, IngredientCandidate } from '../types/admin.types';

const PAGE_SIZE = 20;

/** Ràng buộc POST /admin/ingredients (SCR-43) + PUT sửa nguyên liệu; đơn vị ≤ 20 ký tự theo Backend. */
const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên nguyên liệu').max(100, 'Tên tối đa 100 ký tự'),
  standardUnit: z.string().trim().max(20, 'Đơn vị tối đa 20 ký tự'),
  defaultStallType: z.enum(['PRODUCE', 'CONDIMENTS', 'DRY_GOODS', 'PLANT_PROTEIN'], { errorMap: () => ({ message: 'Chọn quầy hàng' }) }),
  foodGroup: z.enum(['PLANT', 'EGG', 'DAIRY', 'POULTRY', 'SEAFOOD']),
  caloriesPer100g: z.number({ invalid_type_error: 'Nhập số calo' }).min(0, 'Calo không được âm'),
  isAllium: z.boolean(),
});

/** Ảnh nguyên liệu tải từ máy (POST /admin/ingredients/{id}/image); Backend nhận JPG/PNG/WEBP. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
type IngredientValues = z.infer<typeof ingredientSchema>;

const allergenSchema = z.object({
  allergenName: z.string().trim().min(1, 'Nhập tên nhóm dị ứng').max(100, 'Tên tối đa 100 ký tự'),
  code: z.string().trim().min(1, 'Nhập mã nhóm').max(50, 'Mã tối đa 50 ký tự').transform((v) => v.toUpperCase()),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional(),
});

/**
 * SCR-43 admin/Ingredients · `/admin/ingredients` — FN-ADM-12.
 * Thêm/sửa nguyên liệu, gán nhóm dị ứng (thay toàn bộ), thêm nhóm dị ứng mới. Danh sách nhóm dị ứng lấy từ GET /allergens.
 */
const AdminIngredientsPage: React.FC = () => {
  const { get, set, page, hasFilters, clear } = useUrlFilters();
  const keyword = get('keyword') || undefined;
  const allergenId = Number(get('allergenId')) || undefined;
  const foodGroup = get('foodGroup') || undefined;
  const stallType = get('stallType') || undefined;
  const list = useAdminIngredients({
    keyword,
    allergenId,
    foodGroup,
    stallType,
    page,
    size: PAGE_SIZE,
  });
  const allergens = useAllergens();
  const [form, setForm] = useState<{ mode: 'create' } | { mode: 'edit'; item: AdminIngredient } | null>(null);
  const [allergenTarget, setAllergenTarget] = useState<AdminIngredient | null>(null);
  const [creatingAllergen, setCreatingAllergen] = useState(false);
  const items = list.data?.items ?? [];
  const total = list.data?.meta.total ?? 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Nguyên liệu & dị ứng"
        description="Nguyên liệu dùng cho công thức, thực đơn và danh sách đi chợ; nhóm dị ứng dùng để cảnh báo người dùng."
        actions={
          <>
            <Button variant="outline" onClick={() => setCreatingAllergen(true)}>
              <Icon name="add" className="text-[18px]" />
              Nhóm dị ứng
            </Button>
            <Button onClick={() => setForm({ mode: 'create' })}>
              <Icon name="add" className="text-[18px]" />
              Thêm nguyên liệu
            </Button>
          </>
        }
      />
      <MasterDataTabs />

      {/* Thanh bộ lọc đa chiều & hiển thị tổng số lượng nguyên liệu */}
      <div className={cn(CARD, 'flex flex-col gap-space-sm p-space-md')}>
        {/* Hàng 1: Tìm kiếm theo tên + Badge hiển thị tổng số lượng */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
          <div className="flex-1">
            <SearchBox value={get('keyword')} onSearch={(val) => set({ keyword: val })} label="Tìm nguyên liệu" placeholder="Tìm kiếm theo tên nguyên liệu..." maxLength={100} />
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/80 px-3.5 py-1.5 font-label-md text-label-md font-semibold text-on-primary-container shadow-2xs">
              <Icon name="nutrition" className="text-[18px]" />
              Tổng: {total} nguyên liệu
            </span>
          </div>
        </div>

        {/* Hàng 2: Các bộ lọc (Nhóm thực phẩm, Quầy hàng, Dị ứng) */}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 pt-2 border-t border-outline-variant/30">
          <select
            aria-label="Lọc theo nhóm thực phẩm"
            value={foodGroup ?? ''}
            onChange={(e) => set({ foodGroup: e.target.value })}
            className={CONTROL}
          >
            <option value="">Mọi nhóm thực phẩm</option>
            {Object.entries(FOOD_GROUP_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            aria-label="Lọc theo quầy hàng"
            value={stallType ?? ''}
            onChange={(e) => set({ stallType: e.target.value })}
            className={CONTROL}
          >
            <option value="">Mọi quầy hàng</option>
            {STALL_TYPES.map((val) => (
              <option key={val} value={val}>{STALL_TYPE_LABEL[val]}</option>
            ))}
          </select>

          <select
            aria-label="Lọc theo nhóm dị ứng"
            value={allergenId ?? ''}
            onChange={(e) => set({ allergenId: e.target.value })}
            className={CONTROL}
          >
            <option value="">Mọi nhóm dị ứng</option>
            {(allergens.data ?? []).map((allergen) => (
              <option key={allergen.allergenId} value={allergen.allergenId}>
                {allergen.allergenName}
              </option>
            ))}
          </select>
        </div>

        {/* Hàng 3: Tóm tắt kết quả lọc & Nút reset */}
        {hasFilters && (
          <div className="flex items-center justify-between text-body-xs text-on-surface-variant pt-2 border-t border-outline-variant/30">
            <span>
              Tìm thấy <strong>{total}</strong> nguyên liệu phù hợp với bộ lọc hiện tại.
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Icon name="close" className="text-[14px]" />
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {list.isPending ? (
        <TableSkeleton label="Đang tải nguyên liệu" />
      ) : list.isError && !list.data ? (
        <AdminQueryError error={list.error} onRetry={() => void list.refetch()} retrying={list.isRefetching} />
      ) : items.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="nutrition"
            title={hasFilters ? 'Không có nguyên liệu phù hợp' : 'Chưa có nguyên liệu nào'}
            description={hasFilters ? 'Thử từ khóa khác hoặc bỏ lọc nhóm dị ứng.' : 'Thêm nguyên liệu để người dùng chọn khi soạn công thức.'}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clear}>Xóa bộ lọc</Button>
              ) : (
                <Button onClick={() => setForm({ mode: 'create' })}>Thêm nguyên liệu</Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-body-sm text-on-surface-variant">
            <span>
              Đang hiển thị <strong>{items.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</strong> – <strong>{Math.min(page * PAGE_SIZE, total)}</strong> trong tổng số <strong>{total}</strong> nguyên liệu.
            </span>
          </div>
          <TableShell label="Danh sách nguyên liệu" busy={list.isPlaceholderData} minWidth="min-w-[900px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Nguyên liệu</th>
                <th scope="col" className={TH}>Nhóm thực phẩm</th>
                <th scope="col" className={TH}>Quầy hàng</th>
                <th scope="col" className={`${TH} text-right`}>Calo/100 g</th>
                <th scope="col" className={TH}>Nhóm dị ứng</th>
                <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.ingredientId} className="hover:bg-surface-container-low transition">
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      {/* Thumbnail nhỏ 40x40px cho mỗi dòng nguyên liệu; đổi ảnh trong form Sửa */}
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-high">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fb = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fb) fb.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: item.imageUrl ? 'none' : 'flex' }}
                          className="h-full w-full items-center justify-center text-on-surface-variant"
                        >
                          <Icon name="nutrition" className="text-[20px]" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-label-md text-label-md font-medium text-on-surface">{item.name}</span>
                          {item.isAllium && (
                            <StatusBadge tone="warning">
                              Ngũ vị tân
                            </StatusBadge>
                          )}
                          {!item.imageUrl && (item.candidateCount ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setForm({ mode: 'edit', item })}
                              className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                              aria-label={`${item.candidateCount} ảnh gợi ý từ tủ lạnh cho ${item.name}`}
                            >
                              <StatusBadge tone="info" icon="photo_library">
                                +{item.candidateCount} gợi ý
                              </StatusBadge>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>{FOOD_GROUP_LABEL[item.foodGroup] ?? 'Khác'}</td>
                  <td className={TD}>{STALL_TYPE_LABEL[item.defaultStallType] ?? 'Khác'}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatNumber(item.caloriesPer100g)}</td>
                  <td className={TD}>
                    {item.allergens.length === 0 ? (
                      <span className="text-on-surface-variant">Không</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {item.allergens.map((allergen) => (
                          <StatusBadge key={allergen.allergenId} tone="error">
                            {allergen.name}
                          </StatusBadge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <LockToggleButton item={item} />
                    <Button variant="ghost" size="sm" onClick={() => setAllergenTarget(item)} aria-label={`Dị ứng của ${item.name}`}>
                      Dị ứng
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setForm({ mode: 'edit', item })} aria-label={`Sửa ${item.name}`}>
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination page={page} size={PAGE_SIZE} total={total} onPageChange={(next) => set({ page: next })} />
        </>
      )}

      <IngredientDialog state={form} onClose={() => setForm(null)} />
      <IngredientAllergensDialog item={allergenTarget} onClose={() => setAllergenTarget(null)} onCreateAllergen={() => setCreatingAllergen(true)} />
      <CreateAllergenDialog show={creatingAllergen} onClose={() => setCreatingAllergen(false)} />
    </div>
  );
};

/** BR-ADM-ING-01: nút 1-click Khóa / Mở khóa (plan/1.Implement/32, mục 5.1). */
const LockToggleButton: React.FC<{ item: AdminIngredient }> = ({ item }) => {
  const toggle = useToggleIngredientLock();
  const locked = !!item.isLocked;
  const label = locked ? 'Đã khóa — Dữ liệu chuẩn được bảo vệ. Bấm để mở khóa.' : 'Chưa khóa — Bấm để khóa chống ghi đè.';
  return (
    <Button
      variant="ghost"
      size="sm"
      title={label}
      aria-label={`${locked ? 'Mở khóa' : 'Khóa'} ${item.name}`}
      aria-pressed={locked}
      loading={toggle.isPending}
      onClick={() =>
        toggle.mutate(
          { id: item.ingredientId, isLocked: !locked },
          { onSuccess: (res) => notifySuccess(res.message || (locked ? 'Đã mở khóa.' : 'Đã khóa.')), onError: (error) => handleWriteError(error) },
        )
      }
    >
      <Icon name={locked ? 'lock' : 'lock_open'} className={cn('text-[18px]', locked ? 'text-error' : 'text-on-surface-variant')} />
    </Button>
  );
};

/** FN-ADM-12-CAND/APPLY: lưới ảnh ứng viên cắt từ ảnh tủ lạnh người dùng; Admin chủ động duyệt (BR-ADM-ING-03). */
const CandidateGrid: React.FC<{ ingredient: AdminIngredient; disabled: boolean; onApplied: () => void }> = ({ ingredient, disabled, onApplied }) => {
  const { data, isLoading, isError } = useIngredientCandidates(ingredient.ingredientId);
  const apply = useApplyIngredientCandidate();
  const candidates: IngredientCandidate[] = data ?? [];

  if (isLoading) return <p className="text-body-sm text-on-surface-variant">Đang tải ảnh gợi ý…</p>;
  if (isError) return <p className="text-body-sm text-error">Không tải được ảnh gợi ý.</p>;
  if (candidates.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">Chưa có ảnh gợi ý từ tủ lạnh người dùng.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-space-sm sm:grid-cols-3" aria-label="Ảnh gợi ý từ tủ lạnh">
      {candidates.map((c) => (
        <li key={c.candidateId} className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/50 p-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-surface-container">
            <img src={c.croppedImageUrl} alt={`Ảnh gợi ý ${ingredient.name}`} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Độ tin cậy: {Math.round(c.confidenceScore * 100)}% · {new Date(c.createdAt).toLocaleDateString('vi-VN')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || apply.isPending}
            loading={apply.isPending && apply.variables?.candidateId === c.candidateId}
            onClick={() =>
              apply.mutate(
                { id: ingredient.ingredientId, candidateId: c.candidateId },
                {
                  onSuccess: (res) => {
                    notifySuccess(res.message || 'Đã cập nhật ảnh đại diện.');
                    onApplied();
                  },
                  onError: (error) => handleWriteError(error),
                },
              )
            }
          >
            Chọn làm ảnh đại diện
          </Button>
        </li>
      ))}
    </ul>
  );
};

const IngredientDialog: React.FC<{
  state: { mode: 'create' } | { mode: 'edit'; item: AdminIngredient } | null;
  onClose: () => void;
}> = ({ state, onClose }) => {
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const uploadImage = useUploadIngredientImage();
  const pending = create.isPending || update.isPending || uploadImage.isPending;
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editing = state?.mode === 'edit' ? state.item : null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<IngredientValues>({ resolver: zodResolver(ingredientSchema) });

  useEffect(() => {
    if (!state) return;
    setFormError(null);
    setImageFile(null);
    setPreviewUrl(null);
    reset(
      editing
        ? {
            name: editing.name,
            standardUnit: '',
            defaultStallType: editing.defaultStallType,
            foodGroup: editing.foodGroup,
            caloriesPer100g: editing.caloriesPer100g,
            isAllium: editing.isAllium,
          }
        : { name: '', standardUnit: 'g', defaultStallType: undefined, foodGroup: 'PLANT', caloriesPer100g: undefined, isAllium: false }
    );
  }, [state, editing, reset]);

  // Thu hồi URL xem trước cũ để không rò bộ nhớ
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.split(',').includes(file.type)) {
      notifyInfo('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      notifyInfo('Ảnh vượt quá dung lượng tối đa 5 MB.');
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  // MVP chỉ nhập PLANT/EGG/DAIRY (D109); nguyên liệu cũ thuộc nhóm khác vẫn hiện đúng nhóm của nó.
  const foodGroups: FoodGroup[] =
    editing && !FOOD_GROUPS_MVP.includes(editing.foodGroup) ? [...FOOD_GROUPS_MVP, editing.foodGroup] : FOOD_GROUPS_MVP;

  const fields = ['name', 'standardUnit', 'defaultStallType', 'foodGroup', 'caloriesPer100g', 'isAllium'] as const;
  const onError = (error: unknown) => {
    const apiError = handleWriteError(error, { setError, fields, onConflict: setConflict });
    if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
    if (apiError.status === 404) onClose();
  };
  const onSuccess = (message: string) => {
    notifySuccess(message);
    onClose();
  };

  // Lưu thông tin trước, sau đó tải ảnh (nếu có chọn) lên Cloudinary cho nguyên liệu đó.
  const finish = (id: number | undefined, message: string) => {
    if (!imageFile || !id) {
      onSuccess(message);
      return;
    }
    uploadImage.mutate(
      { id, file: imageFile },
      {
        onSuccess: () => onSuccess(`${message} Đã cập nhật ảnh.`),
        onError: (error) => {
          // Thông tin đã lưu; chỉ ảnh lỗi nên giữ form mở để chọn lại ảnh
          setFormError(`${message} Nhưng tải ảnh thất bại, hãy chọn lại ảnh.`);
          handleWriteError(error);
        },
      }
    );
  };

  const submit = handleSubmit((values) => {
    setFormError(null);
    if (!editing) {
      // Ô chọn khi thêm mới chỉ có nhóm MVP (PLANT/EGG/DAIRY), khớp enum POST của OpenAPI.
      create.mutate(
        { ...values, foodGroup: values.foodGroup as CreateIngredientBody['foodGroup'], standardUnit: values.standardUnit || 'g' },
        { onSuccess: (res) => finish(res.data?.ingredientId, res.message || `Đã thêm ${values.name}.`), onError }
      );
      return;
    }
    // Chỉ gửi trường đã đổi; đơn vị để trống là giữ nguyên (danh sách không trả đơn vị hiện tại).
    const body = {
      ...(values.name !== editing.name ? { name: values.name } : {}),
      ...(values.standardUnit ? { standardUnit: values.standardUnit } : {}),
      ...(values.defaultStallType !== editing.defaultStallType ? { defaultStallType: values.defaultStallType } : {}),
      ...(values.foodGroup !== editing.foodGroup ? { foodGroup: values.foodGroup } : {}),
      ...(values.caloriesPer100g !== editing.caloriesPer100g ? { caloriesPer100g: values.caloriesPer100g } : {}),
      ...(values.isAllium !== editing.isAllium ? { isAllium: values.isAllium } : {}),
    };
    if (Object.keys(body).length === 0) {
      if (imageFile) finish(editing.ingredientId, 'Đã lưu.');
      else notifyInfo('Chưa có thay đổi nào để lưu.');
      return;
    }
    update.mutate(
      { id: editing.ingredientId, body },
      { onSuccess: (res) => finish(editing.ingredientId, res.message || 'Đã cập nhật nguyên liệu.'), onError }
    );
  });

  const shownImage = previewUrl ?? editing?.imageUrl ?? null;
  const locked = !!editing?.isLocked;

  return (
    <>
      <FormDialog
        show={!!state}
        title={editing ? `Sửa nguyên liệu: ${editing.name}` : 'Thêm nguyên liệu'}
        onClose={() => !pending && onClose()}
        onSubmit={submit}
        submitLabel={editing ? 'Lưu thay đổi' : 'Thêm'}
        loading={pending}
        submitDisabled={locked}
        size="lg"
      >
        {locked && (
          <FormAlert tone="warning">Nguyên liệu đang bị KHÓA để bảo vệ dữ liệu chuẩn. Mở khóa trong danh sách để sửa hoặc đổi ảnh.</FormAlert>
        )}
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <FormRow id="ing-name" label="Tên nguyên liệu" required error={errors.name?.message}>
          <input id="ing-name" maxLength={100} aria-invalid={!!errors.name} className={CONTROL} {...register('name')} />
        </FormRow>
        <FormRow id="ing-image" label="Ảnh đại diện" hint="JPG, PNG hoặc WEBP, tối đa 5 MB. Ảnh được tải lên khi bấm lưu.">
          <div className="flex items-center gap-space-md">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
              {shownImage ? (
                <img src={shownImage} alt={previewUrl ? 'Ảnh vừa chọn' : `Ảnh ${editing?.name ?? ''}`} className="h-full w-full object-cover" />
              ) : (
                <Icon name="nutrition" className="text-[32px] text-outline" />
              )}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <input id="ing-image" ref={fileInputRef} type="file" accept={IMAGE_TYPES} className="hidden" onChange={handleFileChange} />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={pending || locked} onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" className="text-[18px]" />
                  {shownImage ? 'Đổi ảnh' : 'Tải ảnh lên'}
                </Button>
                {imageFile && (
                  <button type="button" className="text-body-sm text-error hover:underline" disabled={pending} onClick={clearImage}>
                    Bỏ chọn
                  </button>
                )}
              </div>
              {imageFile && (
                <p className="text-body-sm text-on-surface-variant">
                  {imageFile.name} · {(imageFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
          </div>
        </FormRow>
        {editing && (
          <section aria-labelledby="ing-candidates-title" className="flex flex-col gap-1.5">
            <h3 id="ing-candidates-title" className="font-label-md text-label-md text-on-surface">Ảnh gợi ý từ tủ lạnh người dùng</h3>
            <p className="text-body-sm text-on-surface-variant">Cắt tự động từ ảnh quét tủ lạnh (độ tin cậy AI từ 80%). Chỉ thành ảnh đại diện khi bạn chọn.</p>
            <CandidateGrid ingredient={editing} disabled={locked || pending} onApplied={onClose} />
          </section>
        )}
        <div className="grid gap-space-md sm:grid-cols-2">
          <FormRow id="ing-stall" label="Quầy hàng" required error={errors.defaultStallType?.message} hint="Dùng để nhóm danh sách đi chợ.">
            <select id="ing-stall" aria-invalid={!!errors.defaultStallType} className={CONTROL} {...register('defaultStallType')}>
              <option value="">Chọn quầy hàng</option>
              {STALL_TYPES.map((value) => (
                <option key={value} value={value}>
                  {STALL_TYPE_LABEL[value]}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow id="ing-group" label="Nhóm thực phẩm" error={errors.foodGroup?.message} hint="Trường phái dùng nhóm này để lọc món.">
            <select id="ing-group" className={CONTROL} {...register('foodGroup')}>
              {foodGroups.map((value) => (
                <option key={value} value={value}>
                  {FOOD_GROUP_LABEL[value]}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow id="ing-kcal" label="Calo trên 100 g" required error={errors.caloriesPer100g?.message}>
            <input
              id="ing-kcal"
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              aria-invalid={!!errors.caloriesPer100g}
              className={CONTROL}
              {...register('caloriesPer100g', { setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)) })}
            />
          </FormRow>
          <FormRow
            id="ing-unit"
            label="Đơn vị chuẩn"
            error={errors.standardUnit?.message}
            hint={editing ? 'Để trống nếu giữ nguyên đơn vị hiện tại.' : 'Mặc định g.'}
          >
            <input id="ing-unit" maxLength={20} placeholder={editing ? 'Giữ nguyên' : 'g'} className={CONTROL} {...register('standardUnit')} />
          </FormRow>
        </div>
        <CheckRow label="Thuộc ngũ vị tân" description="Hành, tỏi, hẹ, kiệu, nén: trường phái kiêng ngũ vị tân sẽ loại món có nguyên liệu này." {...register('isAllium')} />
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

const IngredientAllergensDialog: React.FC<{ item: AdminIngredient | null; onClose: () => void; onCreateAllergen: () => void }> = ({
  item,
  onClose,
  onCreateAllergen,
}) => {
  const allergens = useAllergens();
  const replace = useReplaceIngredientAllergens();
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (item) setSelected(item.allergens.map((allergen) => allergen.allergenId));
  }, [item]);

  const toggle = (id: number) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    replace.mutate(
      { id: item.ingredientId, allergenIds: [...selected].sort((a, b) => a - b) },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã cập nhật nhóm dị ứng.');
          onClose();
        },
        onError: (error) => {
          if (handleWriteError(error).status === 404) onClose();
        },
      }
    );
  };

  return (
    <FormDialog
      show={!!item}
      title={item ? `Nhóm dị ứng của ${item.name}` : ''}
      onClose={() => !replace.isPending && onClose()}
      onSubmit={submit}
      submitLabel="Lưu nhóm dị ứng"
      loading={replace.isPending}
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Danh sách được thay toàn bộ: bỏ chọn hết là nguyên liệu không thuộc nhóm dị ứng nào. Người dùng khai báo dị ứng các nhóm này sẽ được cảnh báo.
      </p>
      {allergens.isPending ? (
        <div role="status" aria-busy="true" className="h-32 animate-pulse rounded-xl bg-surface-container" />
      ) : allergens.isError ? (
        <AdminQueryError error={allergens.error} onRetry={() => void allergens.refetch()} retrying={allergens.isRefetching} />
      ) : allergens.data.length === 0 ? (
        <EmptyState
          icon="health_and_safety"
          title="Chưa có nhóm dị ứng"
          action={<Button variant="outline" onClick={onCreateAllergen}>Thêm nhóm dị ứng</Button>}
        />
      ) : (
        <fieldset className="grid gap-1 sm:grid-cols-2">
          <legend className="sr-only">Chọn nhóm dị ứng</legend>
          {allergens.data.map((allergen) => (
            <CheckRow
              key={allergen.allergenId}
              label={allergen.allergenName}
              checked={selected.includes(allergen.allergenId)}
              onChange={() => toggle(allergen.allergenId)}
            />
          ))}
        </fieldset>
      )}
    </FormDialog>
  );
};

const CreateAllergenDialog: React.FC<{ show: boolean; onClose: () => void }> = ({ show, onClose }) => {
  const create = useCreateAllergen();
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof allergenSchema>, unknown, z.output<typeof allergenSchema>>({ resolver: zodResolver(allergenSchema) });

  useEffect(() => {
    if (show) {
      setFormError(null);
      reset({ allergenName: '', code: '', description: '' });
    }
  }, [show, reset]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(
      { allergenName: values.allergenName, code: values.code, ...(values.description ? { description: values.description } : {}) },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || `Đã thêm nhóm dị ứng ${values.allergenName}.`);
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, { setError, fields: ['allergenName', 'code', 'description'], onConflict: setConflict });
          if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  });

  return (
    <>
      <FormDialog show={show} title="Thêm nhóm dị ứng" onClose={() => !create.isPending && onClose()} onSubmit={submit} submitLabel="Thêm" loading={create.isPending}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <FormRow id="alg-name" label="Tên nhóm dị ứng" required error={errors.allergenName?.message} hint="Ví dụ: Đậu phộng, Gluten.">
          <input id="alg-name" maxLength={100} aria-invalid={!!errors.allergenName} className={CONTROL} {...register('allergenName')} />
        </FormRow>
        <FormRow id="alg-code" label="Mã nhóm" required error={errors.code?.message} hint="Mã duy nhất, ví dụ PEANUT.">
          <input id="alg-code" maxLength={50} aria-invalid={!!errors.code} className={cn(CONTROL, 'uppercase')} {...register('code')} />
        </FormRow>
        <FormRow id="alg-desc" label="Mô tả" error={errors.description?.message}>
          <textarea id="alg-desc" rows={3} maxLength={500} className={cn(CONTROL, 'resize-y')} {...register('description')} />
        </FormRow>
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

export default AdminIngredientsPage;
