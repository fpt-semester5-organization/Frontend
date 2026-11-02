import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { dietarySchoolLabel } from '@/constants/dietarySchools';
import { cn } from '@/lib/cn';
import { notifySuccess } from '@/lib/notify';
import { AdminPageHeader, AdminQueryError, CARD, CONTROL, StatusBadge, TableSkeleton } from '../components/AdminUi';
import { CheckRow, FormDialog, FormRow } from '../components/FormDialog';
import { MasterDataTabs } from '../components/MasterDataTabs';
import { useAdminDietarySchools, useUpdateDietarySchool } from '../hooks/useAdminMasterData';
import { FOOD_GROUP_LABEL, FORBIDDEN_GROUPS } from '../lib/labels';
import { handleWriteError } from '../lib/writeError';
import type { DietarySchool, ForbiddenFoodGroup } from '../types/admin.types';

const schoolSchema = z.object({
  schoolName: z.string().trim().min(1, 'Nhập tên hiển thị').max(100, 'Tên tối đa 100 ký tự'),
  forbiddenFoodGroups: z.array(z.enum(['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'])),
  forbidAllium: z.boolean(),
});
type SchoolValues = z.infer<typeof schoolSchema>;

/**
 * SCR-42 admin/DietarySchools · `/admin/dietary-schools` — FN-ADM-10.
 * 07 trường phái cố định: chỉ sửa tên hiển thị và quy tắc thực phẩm cấm (D109), không thêm/xóa.
 */
const AdminDietarySchoolsPage: React.FC = () => {
  const schools = useAdminDietarySchools();
  const [editing, setEditing] = useState<DietarySchool | null>(null);

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Trường phái ăn chay"
        description="07 trường phái ăn chay cố định của hệ thống. Quy tắc thực phẩm cấm dùng để lọc công thức, gợi ý thực đơn và cảnh báo khi quét mã vạch."
      />
      <MasterDataTabs />

      {schools.isPending ? (
        <TableSkeleton rows={7} label="Đang tải trường phái" />
      ) : schools.isError ? (
        <AdminQueryError error={schools.error} onRetry={() => void schools.refetch()} retrying={schools.isRefetching} />
      ) : schools.data.length === 0 ? (
        <div className={CARD}>
          <EmptyState
            icon="eco"
            title="Chưa có dữ liệu trường phái"
            description="Cơ sở dữ liệu chưa nạp 07 trường phái. Kiểm tra lại script dữ liệu gốc của Backend."
            action={<Button variant="outline" onClick={() => void schools.refetch()}>Tải lại</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
          {schools.data.map((school) => {
            const groups = school.forbiddenFoodRules?.forbiddenFoodGroups ?? [];
            return (
              <li key={school.dietarySchoolId} className={cn(CARD, 'flex flex-col gap-3 p-space-md')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{dietarySchoolLabel(school.schoolCode)}</p>
                    <h2 className="break-words font-headline-sm text-headline-sm text-on-surface">{school.schoolName}</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setEditing(school)} aria-label={`Sửa ${school.schoolName}`}>
                    <Icon name="edit" className="text-[18px]" />
                    Sửa
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5 font-body-sm text-body-sm">
                  <span className="text-on-surface-variant">Không ăn</span>
                  <div className="flex flex-wrap gap-1.5">
                    {groups.length === 0 ? (
                      <StatusBadge tone="success">Không cấm nhóm nào</StatusBadge>
                    ) : (
                      groups.map((group) => (
                        <StatusBadge key={group} tone="neutral">
                          {FOOD_GROUP_LABEL[group as ForbiddenFoodGroup] ?? 'Nhóm khác'}
                        </StatusBadge>
                      ))
                    )}
                    {school.forbiddenFoodRules?.forbidAllium && <StatusBadge tone="warning">Ngũ vị tân</StatusBadge>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SchoolDialog school={editing} onClose={() => setEditing(null)} />
    </div>
  );
};

const SchoolDialog: React.FC<{ school: DietarySchool | null; onClose: () => void }> = ({ school, onClose }) => {
  const update = useUpdateDietarySchool();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SchoolValues>({ resolver: zodResolver(schoolSchema) });

  useEffect(() => {
    if (!school) return;
    setFormError(null);
    reset({
      schoolName: school.schoolName,
      forbiddenFoodGroups: (school.forbiddenFoodRules?.forbiddenFoodGroups ?? []).filter((g): g is ForbiddenFoodGroup =>
        (FORBIDDEN_GROUPS as string[]).includes(g)
      ),
      forbidAllium: !!school.forbiddenFoodRules?.forbidAllium,
    });
  }, [school, reset]);

  const groups = watch('forbiddenFoodGroups') ?? [];
  const toggleGroup = (group: ForbiddenFoodGroup) =>
    setValue('forbiddenFoodGroups', groups.includes(group) ? groups.filter((g) => g !== group) : [...groups, group]);

  const submit = handleSubmit((values) => {
    if (!school) return;
    setFormError(null);
    update.mutate(
      {
        id: school.dietarySchoolId,
        body: {
          schoolName: values.schoolName.trim(),
          // Gửi theo thứ tự cố định để dễ đối chiếu nhật ký thay đổi.
          forbiddenFoodRules: { forbiddenFoodGroups: FORBIDDEN_GROUPS.filter((g) => values.forbiddenFoodGroups.includes(g)), forbidAllium: values.forbidAllium },
        },
      },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã cập nhật trường phái.');
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, { setError, fields: ['schoolName'], onConflict: setFormError });
          if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  });

  return (
    <FormDialog
      show={!!school}
      title={school ? `Sửa trường phái: ${dietarySchoolLabel(school.schoolCode)}` : ''}
      onClose={() => !update.isPending && onClose()}
      onSubmit={submit}
      submitLabel="Lưu thay đổi"
      loading={update.isPending}
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <FormRow id="school-name" label="Tên hiển thị" required error={errors.schoolName?.message}>
        <input id="school-name" maxLength={100} aria-invalid={!!errors.schoolName} className={CONTROL} {...register('schoolName')} />
      </FormRow>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-label-md text-label-md text-on-surface">Nhóm thực phẩm cấm</legend>
        {FORBIDDEN_GROUPS.map((group) => (
          <CheckRow key={group} label={FOOD_GROUP_LABEL[group]} checked={groups.includes(group)} onChange={() => toggleGroup(group)} />
        ))}
        <CheckRow
          label="Kiêng ngũ vị tân"
          description="Hành, tỏi, hẹ, kiệu, nén (nguyên liệu có cờ ngũ vị tân)."
          {...register('forbidAllium')}
        />
      </fieldset>
      <FormAlert tone="warning">
        Quy tắc mới áp dụng ngay cho mọi người dùng theo trường phái này: công thức, thực đơn gợi ý và kết luận quét mã vạch có thể thay đổi.
      </FormAlert>
    </FormDialog>
  );
};

export default AdminDietarySchoolsPage;
