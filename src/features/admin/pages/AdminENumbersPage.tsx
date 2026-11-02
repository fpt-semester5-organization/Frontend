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
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, ServerMessageDialog, StatusBadge, TD, TH, TableShell, TableSkeleton } from '../components/AdminUi';
import { FormDialog, FormRow } from '../components/FormDialog';
import { MasterDataTabs } from '../components/MasterDataTabs';
import { SearchBox } from '../components/SearchBox';
import { useAdminENumbers, useCreateENumber, useUpdateENumber } from '../hooks/useAdminMasterData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { VEGAN_STATUS, VEGAN_STATUSES } from '../lib/labels';
import { handleWriteError } from '../lib/writeError';
import type { ENumber, VeganStatus } from '../types/admin.types';

const PAGE_SIZE = 20;
const veganStatus = z.enum(['VEGAN', 'DOUBTFUL', 'NON_VEGAN'], { errorMap: () => ({ message: 'Chọn mức an toàn' }) });

/** Ràng buộc POST /admin/e-numbers (SCR-42). Mã chuẩn hóa chữ in hoa, ví dụ E120. */
const createSchema = z.object({
  code: z.string().trim().min(1, 'Nhập mã E-number').max(15, 'Mã tối đa 15 ký tự').transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, 'Nhập tên phụ gia').max(150, 'Tên tối đa 150 ký tự'),
  veganStatus,
  originSource: z.string().trim().min(1, 'Nhập nguồn gốc').max(100, 'Nguồn gốc tối đa 100 ký tự'),
  categoryType: z.string().trim().max(50, 'Nhóm phụ gia tối đa 50 ký tự').optional(),
  healthRiskNotes: z.string().trim().optional(),
});
type CreateValues = z.input<typeof createSchema>;

/** PUT /admin/e-numbers/{code}: tên, mức an toàn, ghi chú; để trống ghi chú là giữ nguyên. */
const updateSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên phụ gia').max(150, 'Tên tối đa 150 ký tự'),
  veganStatus,
  healthRiskNotes: z.string().trim().optional(),
});
type UpdateValues = z.infer<typeof updateSchema>;

/**
 * SCR-42 admin/ENumbers · `/admin/e-numbers` — FN-ADM-11.
 * Từ điển phụ gia 3 mức VEGAN / DOUBTFUL / NON_VEGAN; đổi mức có thể kéo theo tính lại kết luận sản phẩm đã quét.
 */
const AdminENumbersPage: React.FC = () => {
  const { get, set, page, hasFilters, clear } = useUrlFilters();
  const status = get('veganStatus') as VeganStatus | '';
  const list = useAdminENumbers({ keyword: get('keyword') || undefined, veganStatus: status || undefined, page, size: PAGE_SIZE });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ENumber | null>(null);
  const items = list.data?.items ?? [];
  const total = list.data?.meta.total ?? 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Từ điển E-number"
        description="Từ điển phụ gia (E-number) dùng để kết luận sản phẩm khi quét mã vạch."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="add" className="text-[18px]" />
            Thêm E-number
          </Button>
        }
      />
      <MasterDataTabs />

      <div className={cn(CARD, 'grid gap-space-sm p-space-md sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <SearchBox
          value={get('keyword')}
          onSearch={(keyword) => set({ keyword })}
          label="Tìm theo mã hoặc tên phụ gia"
          placeholder="Mã (E120) hoặc tên phụ gia"
          maxLength={150}
        />
        <select aria-label="Mức an toàn" value={status} onChange={(e) => set({ veganStatus: e.target.value })} className={CONTROL}>
          <option value="">Mọi mức an toàn</option>
          {VEGAN_STATUSES.map((value) => (
            <option key={value} value={value}>
              {VEGAN_STATUS[value].label}
            </option>
          ))}
        </select>
      </div>

      {list.isPending ? (
        <TableSkeleton label="Đang tải từ điển E-number" />
      ) : list.isError && !list.data ? (
        <AdminQueryError error={list.error} onRetry={() => void list.refetch()} retrying={list.isRefetching} />
      ) : items.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="science"
            title={hasFilters ? 'Không có E-number phù hợp' : 'Từ điển chưa có E-number nào'}
            description={hasFilters ? 'Thử từ khóa khác hoặc bỏ lọc mức an toàn.' : 'Thêm phụ gia đầu tiên để hệ thống kết luận sản phẩm khi quét mã vạch.'}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clear}>Xóa bộ lọc</Button>
              ) : (
                <Button onClick={() => setCreating(true)}>Thêm E-number</Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <TableShell label="Từ điển E-number" busy={list.isPlaceholderData}>
            <thead>
              <tr>
                <th scope="col" className={TH}>Mã</th>
                <th scope="col" className={TH}>Tên phụ gia</th>
                <th scope="col" className={TH}>Mức an toàn</th>
                <th scope="col" className={TH}>Nguồn gốc</th>
                <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const info = VEGAN_STATUS[item.veganStatus] ?? { label: 'Không rõ', tone: 'neutral' as const };
                return (
                  <tr key={item.code} className="hover:bg-surface-container-low">
                    <td className={`${TD} font-label-md text-label-md`}>{item.code}</td>
                    <td className={TD}>{item.name}</td>
                    <td className={TD}>
                      <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                    </td>
                    <td className={TD}>{item.originSource || <span className="text-on-surface-variant">Chưa rõ</span>}</td>
                    <td className={`${TD} text-right`}>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(item)} aria-label={`Sửa ${item.code}`}>
                        Sửa
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination page={page} size={PAGE_SIZE} total={total} onPageChange={(next) => set({ page: next })} />
        </>
      )}

      <CreateENumberDialog show={creating} onClose={() => setCreating(false)} />
      <EditENumberDialog item={editing} onClose={() => setEditing(null)} />
    </div>
  );
};

const CreateENumberDialog: React.FC<{ show: boolean; onClose: () => void }> = ({ show, onClose }) => {
  const create = useCreateENumber();
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateValues, unknown, z.output<typeof createSchema>>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (show) {
      setFormError(null);
      reset({ code: '', name: '', veganStatus: undefined, originSource: '', categoryType: '', healthRiskNotes: '' });
    }
  }, [show, reset]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(
      {
        code: values.code,
        name: values.name,
        veganStatus: values.veganStatus,
        originSource: values.originSource,
        ...(values.categoryType ? { categoryType: values.categoryType } : {}),
        ...(values.healthRiskNotes ? { healthRiskNotes: values.healthRiskNotes } : {}),
      },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || `Đã thêm ${values.code}.`);
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, {
            setError,
            fields: ['code', 'name', 'veganStatus', 'originSource', 'categoryType', 'healthRiskNotes'],
            onConflict: setConflict,
          });
          if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  });

  return (
    <>
      <FormDialog show={show} title="Thêm E-number" onClose={() => !create.isPending && onClose()} onSubmit={submit} submitLabel="Thêm" loading={create.isPending} size="lg">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <div className="grid gap-space-md sm:grid-cols-2">
          <FormRow id="en-code" label="Mã" required error={errors.code?.message} hint="Ví dụ: E120, E471.">
            <input id="en-code" maxLength={15} autoCapitalize="characters" aria-invalid={!!errors.code} className={cn(CONTROL, 'uppercase')} {...register('code')} />
          </FormRow>
          <FormRow id="en-status" label="Mức an toàn" required error={errors.veganStatus?.message}>
            <VeganStatusSelect id="en-status" invalid={!!errors.veganStatus} {...register('veganStatus')} />
          </FormRow>
        </div>
        <FormRow id="en-name" label="Tên phụ gia" required error={errors.name?.message}>
          <input id="en-name" maxLength={150} aria-invalid={!!errors.name} className={CONTROL} {...register('name')} />
        </FormRow>
        <div className="grid gap-space-md sm:grid-cols-2">
          <FormRow id="en-origin" label="Nguồn gốc" required error={errors.originSource?.message} hint="Ví dụ: Thực vật, Côn trùng, Tổng hợp.">
            <input id="en-origin" maxLength={100} aria-invalid={!!errors.originSource} className={CONTROL} {...register('originSource')} />
          </FormRow>
          <FormRow id="en-category" label="Nhóm phụ gia" error={errors.categoryType?.message} hint="Ví dụ: Chất tạo màu, Chất nhũ hóa.">
            <input id="en-category" maxLength={50} className={CONTROL} {...register('categoryType')} />
          </FormRow>
        </div>
        <FormRow id="en-notes" label="Ghi chú rủi ro sức khỏe" error={errors.healthRiskNotes?.message}>
          <textarea id="en-notes" rows={3} className={cn(CONTROL, 'resize-y')} {...register('healthRiskNotes')} />
        </FormRow>
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

const EditENumberDialog: React.FC<{ item: ENumber | null; onClose: () => void }> = ({ item, onClose }) => {
  const update = useUpdateENumber();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<UpdateValues>({ resolver: zodResolver(updateSchema) });

  useEffect(() => {
    if (item) {
      setFormError(null);
      reset({ name: item.name, veganStatus: item.veganStatus, healthRiskNotes: '' });
    }
  }, [item, reset]);

  const statusChanged = !!item && watch('veganStatus') !== item.veganStatus;

  const submit = handleSubmit((values) => {
    if (!item) return;
    setFormError(null);
    const body = {
      ...(values.name !== item.name ? { name: values.name } : {}),
      ...(values.veganStatus !== item.veganStatus ? { veganStatus: values.veganStatus } : {}),
      ...(values.healthRiskNotes ? { healthRiskNotes: values.healthRiskNotes } : {}),
    };
    if (Object.keys(body).length === 0) {
      notifyInfo('Chưa có thay đổi nào để lưu.');
      return;
    }
    update.mutate(
      { code: item.code, body },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || `Đã cập nhật ${item.code}.`);
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, { setError, fields: ['name', 'veganStatus', 'healthRiskNotes'], onConflict: setFormError });
          if (apiError.status === 404) onClose();
          else if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  });

  return (
    <FormDialog show={!!item} title={item ? `Sửa ${item.code}` : ''} onClose={() => !update.isPending && onClose()} onSubmit={submit} submitLabel="Lưu thay đổi" loading={update.isPending}>
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <FormRow id="en-edit-name" label="Tên phụ gia" required error={errors.name?.message}>
        <input id="en-edit-name" maxLength={150} aria-invalid={!!errors.name} className={CONTROL} {...register('name')} />
      </FormRow>
      <FormRow id="en-edit-status" label="Mức an toàn" required error={errors.veganStatus?.message}>
        <VeganStatusSelect id="en-edit-status" invalid={!!errors.veganStatus} {...register('veganStatus')} />
      </FormRow>
      {statusChanged && (
        <FormAlert tone="warning">
          Đổi mức an toàn có thể làm thay đổi kết luận chay của các sản phẩm chứa {item?.code} khi người dùng quét mã vạch.
        </FormAlert>
      )}
      <FormRow id="en-edit-notes" label="Ghi chú rủi ro sức khỏe" hint="Để trống nếu giữ nguyên ghi chú hiện có.">
        <textarea id="en-edit-notes" rows={3} className={cn(CONTROL, 'resize-y')} {...register('healthRiskNotes')} />
      </FormRow>
    </FormDialog>
  );
};

const VeganStatusSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function VeganStatusSelect({ invalid, ...rest }, ref) {
    return (
      <select ref={ref} aria-invalid={invalid} className={CONTROL} {...rest}>
        <option value="">Chọn mức an toàn</option>
        {VEGAN_STATUSES.map((value) => (
          <option key={value} value={value}>
            {VEGAN_STATUS[value].label}
          </option>
        ))}
      </select>
    );
  }
);

export default AdminENumbersPage;
