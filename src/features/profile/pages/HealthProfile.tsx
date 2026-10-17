/**
 * SCR-08 · profile/HealthProfile · `/me/health`
 * FN: FN-PROF-04, FN-PROF-06, FN-PROF-08 (+ FN-PROF-01 để điền sẵn) · Huỳnh Việt Phát · Sprint 5
 * Khách xem được và thử BMI xem trước; Lưu cần Thành viên (guard theo nút). Kiểm tra giá trị ngay trên màn hình.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UseFormSetError } from 'react-hook-form';
import { ErrorState } from '@/components/common/ErrorState';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCountdown } from '@/hooks/useCountdown';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { HealthForm } from '../components/HealthForm';
import { ProfileTabs } from '../components/ProfileTabs';
import { WeightSection } from '../components/WeightSection';
import { useCurrentUser, useUpdateHealthProfile } from '../hooks/useProfile';
import { GOAL_OPTIONS, bmiCategoryLabel, labelOf } from '../lib/healthMetrics';
import { toHealthBody, toHealthFormValues, type HealthFormValues } from '../types/profile.schemas';
import type { HealthProfile as HealthProfileData } from '../types/profile.types';

const PAGE = 'mx-auto flex w-full max-w-[1200px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';
const RATE_LIMIT_LOCK_MS = 30 * 1000;
const HEALTH_FIELDS = [
  'heightCm',
  'weightKg',
  'dateOfBirth',
  'gender',
  'dietarySchoolId',
  'healthGoal',
  'targetWeightKg',
  'requiresAlliumFree',
  'regionPreference',
] as const;

const Metric: React.FC<{ label: string; value: string; note?: string; accent?: boolean }> = ({ label, value, note, accent }) => (
  <div className="flex flex-col gap-1 rounded-2xl bg-surface-container-lowest p-space-md shadow-card">
    <p className="font-label-sm text-label-sm tracking-wide text-on-surface-variant uppercase">{label}</p>
    <p className={cn('font-headline-md text-headline-md tabular-nums', accent ? 'text-primary' : 'text-on-surface')}>{value}</p>
    {note && <p className="font-label-sm text-label-sm text-on-surface-variant">{note}</p>}
  </div>
);

/** Chỉ số server đã tính lần lưu gần nhất (BMI/BMR/TDEE/calo mục tiêu, BR-USR-NUT-03). */
const MetricCards: React.FC<{ health: HealthProfileData }> = ({ health }) => (
  <section aria-label="Chỉ số hiện tại" className="grid grid-cols-2 gap-space-sm lg:grid-cols-4">
    <Metric label="BMI" value={formatNumber(health.bmi)} note={bmiCategoryLabel(health.bmiCategory)} />
    <Metric label="BMR / TDEE" value={`${formatNumber(health.bmrKcal)} / ${formatNumber(health.tdeeKcal)}`} note="kcal mỗi ngày" />
    <Metric
      label="Calo mục tiêu"
      value={formatNumber(health.targetDailyCalories)}
      note={`kcal/ngày · ${labelOf(GOAL_OPTIONS, health.healthGoal)}`}
      accent
    />
    <Metric
      label="Cân nặng"
      value={`${formatNumber(health.currentWeightKg)} kg`}
      note={health.targetWeightKg !== null ? `Mục tiêu ${formatNumber(health.targetWeightKg)} kg` : 'Chưa đặt mục tiêu'}
    />
  </section>
);

const HealthProfile: React.FC = () => {
  const { isMember } = useRequireMember();
  const me = useCurrentUser();
  const updateHealth = useUpdateHealthProfile();
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockedSeconds = useCountdown(lockedUntil);

  const handleSave = (values: HealthFormValues, setError: UseFormSetError<HealthFormValues>) =>
    updateHealth.mutate(toHealthBody(values), {
      onSuccess: (res) => notifySuccess(res.message || 'Đã lưu hồ sơ sức khỏe.'),
      onError: (error) => {
        const apiError = toApiError(error);
        if (applyServerFieldErrors(error, setError, HEALTH_FIELDS)) return;
        // ERR_DIET_SCHOOL_NOT_FOUND: báo ngay tại ô trường phái.
        if (apiError.status === 404) {
          setError('dietarySchoolId', { type: 'server', message: apiError.message || 'Trường phái không tồn tại.' });
          return;
        }
        if (apiError.status === 429) setLockedUntil(Date.now() + RATE_LIMIT_LOCK_MS);
        notifyApiError(error);
      },
    });

  const header = (
    <>
      <ProfileTabs />
      <header>
        <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Hồ sơ sức khỏe</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Chiều cao, cân nặng và mục tiêu giúp VeggieLife tính BMI, nhu cầu năng lượng và gợi ý thực đơn phù hợp.
        </p>
      </header>
    </>
  );

  if (isMember && me.isPending) {
    return (
      <div className={PAGE}>
        {header}
        <div role="status" aria-label="Đang tải hồ sơ sức khỏe" className="grid gap-space-lg lg:grid-cols-12">
          <Skeleton className="h-[560px] rounded-2xl lg:col-span-8" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-4" />
        </div>
      </div>
    );
  }
  if (isMember && me.isError) {
    return (
      <div className={PAGE}>
        {header}
        <ErrorState error={me.error} onRetry={() => me.refetch()} retrying={me.isRefetching} />
      </div>
    );
  }

  const health = me.data?.health ?? null;

  return (
    <div className={PAGE}>
      {header}

      {!isMember && (
        <FormAlert tone="info" title="Bạn đang xem với tư cách Khách">
          Bạn có thể thử tính BMI ngay bên dưới. Đăng nhập để lưu hồ sơ và nhận thực đơn theo thể trạng.{' '}
          <Link to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.ME.HEALTH)} className="font-label-md text-label-md text-primary">
            Đăng nhập
          </Link>
        </FormAlert>
      )}
      {isMember && !health && (
        <FormAlert tone="info" title="Bạn chưa có hồ sơ sức khỏe">
          Điền các thông số bên dưới để bắt đầu. Hồ sơ cần cho thực đơn tuần và gợi ý món phù hợp.
        </FormAlert>
      )}
      {health?.isStaleMetrics && (
        <FormAlert tone="warning" title="Đã hơn 30 ngày bạn chưa cập nhật số đo">
          Hãy cân lại và cập nhật để chỉ số và calo mục tiêu luôn chính xác.
        </FormAlert>
      )}

      {health && (
        <>
          <MetricCards health={health} />
          <p className="-mt-space-sm flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <Icon name="update" className="text-[16px]" />
            Cập nhật lần cuối {formatDateTime(health.updatedAt)}
          </p>
        </>
      )}

      <HealthForm
        key={health?.updatedAt ?? 'new'}
        defaultValues={toHealthFormValues(health)}
        saving={updateHealth.isPending}
        lockedSeconds={lockedSeconds}
        onSubmit={handleSave}
      />

      {isMember ? (
        <WeightSection health={health} />
      ) : (
        <p className="rounded-2xl bg-surface-container-lowest p-space-md text-center font-body-md text-body-md text-on-surface-variant shadow-card">
          Đăng nhập để ghi và theo dõi lịch sử cân nặng.
        </p>
      )}
    </div>
  );
};

export default HealthProfile;
