/**
 * SCR-36 · admin/Categories · `/admin/categories`
 * FN-ADM-07 (POST/PUT /admin/categories) · FN-ADM-08 (DELETE /admin/categories/{id}?targetCategoryId=)
 * Spec không có GET /admin/categories: danh sách lấy từ GET /categories công khai (chỉ có categoryId, categoryName, isCore).
 */
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiErrorCode, apiErrorMessage } from '@/api/http';
import { Field } from '@/components/ui/forms';
import { RowMenu, RowMenuItem } from '@/components/common/RowMenu';
import { toast } from '@/stores/ui.store';
import { AdminPage, Panel } from '../components/AdminPage';
import { SelectField, TextArea } from '../components/fields';
import { PRIMARY_BTN } from '../components/Filters';
import { ConfirmDialog, FormActions, FormModal, ServerError } from '../components/FormModal';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useCatalog';
import { categoryCreateSchema, categoryMigrateSchema, categoryRenameSchema, type CategoryCreateForm, type CategoryMigrateForm, type CategoryRenameForm } from '../schemas/admin.schemas';
import type { Category } from '../types/admin.types';

type Modal =
  | { kind: 'create' }
  | { kind: 'rename'; cat: Category }
  | { kind: 'delete'; cat: Category }
  | { kind: 'migrate'; cat: Category; message: string };

export function CategoriesPage() {
  const q = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const [modal, setModal] = useState<Modal | null>(null);
  const cats = q.data ?? [];
  const close = () => setModal(null);
  const open = (m: Modal) => {
    create.reset();
    update.reset();
    del.reset();
    setModal(m);
  };

  /** FN-ADM-08: 409 ERR_CATEGORY_NEEDS_MIGRATION -> chọn danh mục nhận dữ liệu; 403 ERR_CATEGORY_CORE_PROTECTED -> toast. */
  const runDelete = (cat: Category, targetCategoryId?: number) =>
    del.mutate(
      { id: cat.categoryId, targetCategoryId },
      {
        onSuccess: close,
        onError: (e) => {
          const code = apiErrorCode(e);
          if (code === 'ERR_CATEGORY_NEEDS_MIGRATION') setModal({ kind: 'migrate', cat, message: apiErrorMessage(e) });
          else if (code === 'ERR_CATEGORY_CORE_PROTECTED') {
            toast.warning(apiErrorMessage(e));
            close();
          }
        },
      },
    );

  return (
    <AdminPage
      title="Danh mục món"
      subtitle="Danh mục cốt lõi không thể xóa. Xóa danh mục còn nội dung phụ thuộc phải chuyển công thức/quán sang danh mục khác."
      actions={
        <button type="button" onClick={() => open({ kind: 'create' })} className={PRIMARY_BTN}>
          <span className="material-symbols-outlined text-[18px]">add</span>Thêm danh mục
        </button>
      }
    >
      <Panel>
        <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} refetch={q.refetch} isEmpty={cats.length === 0} emptyTitle="Chưa có danh mục" emptyHint="Thêm danh mục đầu tiên để phân loại công thức.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-space-lg py-space-md font-semibold">Mã</th>
                  <th className="px-space-md py-space-md font-semibold">Tên danh mục</th>
                  <th className="px-space-md py-space-md font-semibold">Loại</th>
                  <th className="px-space-lg py-space-md text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {cats.map((c) => (
                  <tr key={c.categoryId} className="hover:bg-surface-container-low/60">
                    <td className="px-space-lg py-space-md font-mono text-outline">#{c.categoryId}</td>
                    <td className="px-space-md py-space-md font-semibold text-on-surface">{c.categoryName}</td>
                    <td className="px-space-md py-space-md">{c.isCore ? <StatusPill tone="ok">Cốt lõi</StatusPill> : <StatusPill>Tùy chỉnh</StatusPill>}</td>
                    <td className="px-space-lg py-space-md text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => open({ kind: 'rename', cat: c })} className="rounded-lg px-3 py-1.5 font-label-md text-label-md text-primary hover:bg-surface-container">
                          Đổi tên
                        </button>
                        <RowMenu label={`Thao tác khác với ${c.categoryName}`}>
                          <RowMenuItem onClick={() => update.mutate({ id: c.categoryId, body: { isActive: false } })}>Tạm ẩn danh mục</RowMenuItem>
                          <RowMenuItem onClick={() => update.mutate({ id: c.categoryId, body: { isActive: true } })}>Hiện lại danh mục</RowMenuItem>
                          <RowMenuItem danger disabled={c.isCore} title={c.isCore ? 'Danh mục cốt lõi không thể xóa' : undefined} onClick={() => !c.isCore && open({ kind: 'delete', cat: c })}>
                            Xóa danh mục
                          </RowMenuItem>
                        </RowMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>

      <FormModal show={modal?.kind === 'create'} title="Thêm danh mục" onHide={close}>
        <CreateForm pending={create.isPending} error={create.isError ? apiErrorMessage(create.error) : null} onCancel={close} onSubmit={(v) => create.mutate({ categoryName: v.categoryName, description: v.description || undefined }, { onSuccess: close })} />
      </FormModal>
      <FormModal show={modal?.kind === 'rename'} title="Đổi tên danh mục" onHide={close} size="sm">
        {modal?.kind === 'rename' && (
          <RenameForm cat={modal.cat} pending={update.isPending} error={update.isError ? apiErrorMessage(update.error) : null} onCancel={close} onSubmit={(v) => update.mutate({ id: modal.cat.categoryId, body: { categoryName: v.categoryName } }, { onSuccess: close })} />
        )}
      </FormModal>
      <ConfirmDialog
        show={modal?.kind === 'delete'}
        title="Xóa danh mục?"
        consequence={`Danh mục “${modal && 'cat' in modal ? modal.cat.categoryName : ''}” sẽ bị xóa. Nếu còn công thức hoặc quán thuộc danh mục này, bạn sẽ được yêu cầu chọn danh mục nhận dữ liệu chuyển sang.`}
        confirmLabel="Xóa danh mục"
        pending={del.isPending}
        error={del.isError && apiErrorCode(del.error) !== 'ERR_CATEGORY_NEEDS_MIGRATION' ? apiErrorMessage(del.error) : null}
        onHide={close}
        onConfirm={() => modal?.kind === 'delete' && runDelete(modal.cat)}
      />
      <FormModal show={modal?.kind === 'migrate'} title="Chuyển dữ liệu trước khi xóa" onHide={close} size="sm">
        {modal?.kind === 'migrate' && (
          <MigrateForm
            cat={modal.cat}
            message={modal.message}
            options={cats.filter((c) => c.categoryId !== modal.cat.categoryId)}
            pending={del.isPending}
            error={del.isError && apiErrorCode(del.error) !== 'ERR_CATEGORY_NEEDS_MIGRATION' ? apiErrorMessage(del.error) : null}
            onCancel={close}
            onSubmit={(target) => runDelete(modal.cat, target)}
          />
        )}
      </FormModal>
    </AdminPage>
  );
}

function CreateForm({ pending, error, onCancel, onSubmit }: { pending: boolean; error: string | null; onCancel: () => void; onSubmit: (v: CategoryCreateForm) => void }) {
  const { register, handleSubmit, formState } = useForm<CategoryCreateForm>({ resolver: zodResolver(categoryCreateSchema), defaultValues: { categoryName: '', description: '' } });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-space-md">
      <Field label="Tên danh mục" required maxLength={100} error={formState.errors.categoryName?.message} {...register('categoryName')} />
      <TextArea label="Mô tả" maxLength={500} error={formState.errors.description?.message} {...register('description')} />
      <ServerError message={error} />
      <FormActions onCancel={onCancel} submitLabel="Thêm danh mục" pending={pending} />
    </form>
  );
}

function RenameForm({ cat, pending, error, onCancel, onSubmit }: { cat: Category; pending: boolean; error: string | null; onCancel: () => void; onSubmit: (v: CategoryRenameForm) => void }) {
  const { register, handleSubmit, formState } = useForm<CategoryRenameForm>({ resolver: zodResolver(categoryRenameSchema), defaultValues: { categoryName: cat.categoryName } });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-space-md">
      <Field label="Tên danh mục" required maxLength={100} error={formState.errors.categoryName?.message} {...register('categoryName')} />
      <ServerError message={error} />
      <FormActions onCancel={onCancel} submitLabel="Lưu" pending={pending} />
    </form>
  );
}

function MigrateForm({ cat, message, options, pending, error, onCancel, onSubmit }: { cat: Category; message: string; options: Category[]; pending: boolean; error: string | null; onCancel: () => void; onSubmit: (target: number) => void }) {
  const { register, handleSubmit, formState } = useForm<CategoryMigrateForm>({ resolver: zodResolver(categoryMigrateSchema), defaultValues: { targetCategoryId: '' } });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(Number(v.targetCategoryId)))} noValidate className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">
        {message} Chọn danh mục nhận công thức và quán đang thuộc “{cat.categoryName}”.
      </p>
      <SelectField label="Danh mục nhận dữ liệu" required error={formState.errors.targetCategoryId?.message} {...register('targetCategoryId')}>
        <option value="">Chọn danh mục…</option>
        {options.map((o) => (
          <option key={o.categoryId} value={o.categoryId}>
            {o.categoryName}
          </option>
        ))}
      </SelectField>
      <ServerError message={error} />
      <FormActions onCancel={onCancel} submitLabel="Chuyển và xóa" pending={pending} danger />
    </form>
  );
}
