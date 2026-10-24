import React, { useEffect, useState } from 'react';
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
import { SearchBox } from '../components/SearchBox';
import {
  useAdminIngredients,
  useAllergens,
  useCreateAllergen,
  useCreateIngredient,
  useReplaceIngredientAllergens,
  useUpdateIngredient,
} from '../hooks/useAdminMasterData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { FOOD_GROUP_LABEL, FOOD_GROUPS_MVP, STALL_TYPES, STALL_TYPE_LABEL } from '../lib/labels';
import { handleWriteError } from '../lib/writeError';
import type { AdminIngredient, CreateIngredientBody, FoodGroup } from '../types/admin.types';

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
  const allergenId = Number(get('allergenId')) || undefined;
  const list = useAdminIngredients({ keyword: get('keyword') || undefined, allergenId, page, size: PAGE_SIZE });
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

      <div className={cn(CARD, 'grid gap-space-sm p-space-md sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <SearchBox value={get('keyword')} onSearch={(keyword) => set({ keyword })} label="Tìm nguyên liệu" placeholder="Tên nguyên liệu" maxLength={100} />
        <select aria-label="Lọc theo nhóm dị ứng" value={allergenId ?? ''} onChange={(e) => set({ allergenId: e.target.value })} className={CONTROL}>
          <option value="">Mọi nhóm dị ứng</option>
          {(allergens.data ?? []).map((allergen) => (
            <option key={allergen.allergenId} value={allergen.allergenId}>
              {allergen.allergenName}
            </option>
          ))}
        </select>
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
                <tr key={item.ingredientId} className="hover:bg-surface-container-low">
                  <td className={TD}>
                    <span className="font-label-md text-label-md">{item.name}</span>
                    {item.isAllium && (
                      <StatusBadge tone="warning" className="ml-2">
                        Ngũ vị tân
                      </StatusBadge>
                    )}
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

const IngredientDialog: React.FC<{
  state: { mode: 'create' } | { mode: 'edit'; item: AdminIngredient } | null;
  onClose: () => void;
}> = ({ state, onClose }) => {
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const pending = create.isPending || update.isPending;
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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

  const submit = handleSubmit((values) => {
    setFormError(null);
    if (!editing) {
      // Ô chọn khi thêm mới chỉ có nhóm MVP (PLANT/EGG/DAIRY), khớp enum POST của OpenAPI.
      create.mutate(
        { ...values, foodGroup: values.foodGroup as CreateIngredientBody['foodGroup'], standardUnit: values.standardUnit || 'g' },
        { onSuccess: (res) => onSuccess(res.message || `Đã thêm ${values.name}.`), onError }
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
      notifyInfo('Chưa có thay đổi nào để lưu.');
      return;
    }
    update.mutate({ id: editing.ingredientId, body }, { onSuccess: (res) => onSuccess(res.message || 'Đã cập nhật nguyên liệu.'), onError });
  });

  return (
    <>
      <FormDialog
        show={!!state}
        title={editing ? `Sửa nguyên liệu: ${editing.name}` : 'Thêm nguyên liệu'}
        onClose={() => !pending && onClose()}
        onSubmit={submit}
        submitLabel={editing ? 'Lưu thay đổi' : 'Thêm'}
        loading={pending}
        size="lg"
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <FormRow id="ing-name" label="Tên nguyên liệu" required error={errors.name?.message}>
          <input id="ing-name" maxLength={100} aria-invalid={!!errors.name} className={CONTROL} {...register('name')} />
        </FormRow>
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
