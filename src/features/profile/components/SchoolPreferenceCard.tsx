import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useUpdateHealthProfile } from '../hooks/useProfile';
import { healthBodyFrom } from '../types/profile.schemas';
import type { HealthProfile } from '../types/profile.types';

const FOOD_GROUP_LABEL: Record<string, string> = { EGG: 'trứng', DAIRY: 'sữa', POULTRY: 'thịt trắng', SEAFOOD: 'hải sản' };

const CHOICE =
  'flex cursor-pointer items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm transition-colors hover:bg-surface-container has-[:checked]:bg-primary-fixed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary';

/**
 * Chọn trường phái & kiêng ngũ vị tân (SCR-09). Hai giá trị này thuộc hồ sơ sức khỏe nên lưu bằng PUT /users/me/health-profile
 * với các số đo hiện có (người dùng chọn cách làm này 17/10/2026).
 * UNSPECIFIED: PUT health-profile luôn ghi thêm một mốc cân nặng (FN-PROF-04) nên mỗi lần đổi trường phái có thêm mốc trùng.
 */
export const SchoolPreferenceCard: React.FC<{ health: HealthProfile | null; isMember: boolean }> = ({ health, isMember }) => {
  const { requireMember } = useRequireMember();
  const schools = useDietarySchools();
  const updateHealth = useUpdateHealthProfile();
  const [schoolId, setSchoolId] = useState<number | null>(health?.dietarySchool?.id ?? null);
  const [alliumFree, setAlliumFree] = useState(health?.requiresAlliumFree ?? false);
  const [error, setError] = useState<string>();

  const selected = schools.data?.find((item) => item.dietarySchoolId === schoolId);
  const alliumForced = selected?.forbidAllium === true;
  const effectiveAllium = alliumForced || alliumFree;
  const changed = schoolId !== (health?.dietarySchool?.id ?? null) || effectiveAllium !== (health?.requiresAlliumFree ?? false);
  const needsHealthProfile = isMember && !health;

  const save = () =>
    requireMember(() => {
      if (!schoolId) {
        setError('Vui lòng chọn một trường phái ăn chay.');
        return;
      }
      if (!health) return;
      updateHealth.mutate(healthBodyFrom(health, { dietarySchoolId: schoolId, requiresAlliumFree: effectiveAllium }), {
        onSuccess: (res) => notifySuccess(res.message || 'Đã lưu trường phái ăn chay.'),
        onError: (err) => {
          const apiError = toApiError(err);
          if (apiError.status === 404) setError(apiError.message || 'Trường phái không tồn tại.');
          else notifyApiError(err);
        },
      });
    });

  return (
    <section aria-labelledby="school-title" className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <div>
        <h2 id="school-title" className="font-headline-sm text-headline-sm text-on-surface">
          Trường phái ăn chay
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Công thức, thực đơn và cảnh báo mã vạch sẽ theo trường phái bạn chọn.</p>
      </div>

      {needsHealthProfile && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-info-container p-space-sm font-body-sm text-body-sm text-info">
          <Icon name="info" className="text-[18px]" />
          Trường phái được lưu cùng hồ sơ sức khỏe. Hãy lập hồ sơ sức khỏe trước.
          <Link to={PATHS.ME.HEALTH} className="font-label-md text-label-md text-primary">
            Lập hồ sơ sức khỏe
          </Link>
        </p>
      )}

      {schools.isPending ? (
        <div className="grid gap-2 sm:grid-cols-2" role="status" aria-label="Đang tải trường phái">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : schools.isError ? (
        <ErrorState error={schools.error} onRetry={() => schools.refetch()} retrying={schools.isRefetching} className="py-space-md" />
      ) : schools.data.length === 0 ? (
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Chưa có dữ liệu trường phái.
        </p>
      ) : (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Chọn trường phái</legend>
          {schools.data.map((school) => {
            const banned = (school.forbiddenFoodGroups as string[]).map((group) => FOOD_GROUP_LABEL[group] ?? group);
            return (
              <label key={school.dietarySchoolId} className={CHOICE}>
                <input
                  type="radio"
                  name="dietary-school"
                  value={school.dietarySchoolId}
                  checked={schoolId === school.dietarySchoolId}
                  onChange={() => {
                    setSchoolId(school.dietarySchoolId);
                    setError(undefined);
                  }}
                  className="mt-1 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block font-label-md text-label-md text-on-surface">{school.schoolName}</span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">
                    {banned.length ? `Không dùng ${banned.join(', ')}` : 'Không kiêng nhóm động vật nào'}
                    {school.forbidAllium ? ' · kiêng ngũ vị tân' : ''}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
      <FieldError>{error}</FieldError>

      <label className={cn(CHOICE, alliumForced && 'cursor-not-allowed opacity-80')}>
        <input
          type="checkbox"
          checked={effectiveAllium}
          aria-disabled={alliumForced || undefined}
          onChange={(event) => !alliumForced && setAlliumFree(event.target.checked)}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="block font-label-md text-label-md text-on-surface">Kiêng ngũ vị tân</span>
          <span className="block font-label-sm text-label-sm text-on-surface-variant">
            {alliumForced ? `${selected?.schoolName} luôn kiêng hành, tỏi, hẹ, kiệu, nén.` : 'Loại bỏ hành, tỏi, hẹ, kiệu, nén khỏi gợi ý món.'}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button onClick={save} loading={updateHealth.isPending} disabled={needsHealthProfile || (isMember && !changed)}>
          {!updateHealth.isPending && <Icon name="save" className="text-[18px]" />}
          Lưu trường phái
        </Button>
        {isMember && health && !changed && <span className="font-label-sm text-label-sm text-on-surface-variant">Chưa có thay đổi.</span>}
      </div>
    </section>
  );
};
