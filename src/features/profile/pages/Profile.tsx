/**
 * SCR-07 · profile/Profile · `/me`
 * FN: FN-PROF-01, FN-PROF-02, FN-PROF-03, FN-PROF-07 · Huỳnh Việt Phát · Sprint 5
 * Chỉ Thành viên/VIP (RequireAuth).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import { PATHS } from '@/routes/paths';
import { AvatarUploader } from '../components/AvatarUploader';
import { DeactivateAccountCard } from '../components/DeactivateAccountCard';
import { PersonalInfoCard } from '../components/PersonalInfoCard';
import { ProfileTabs } from '../components/ProfileTabs';
import { useCurrentUser } from '../hooks/useProfile';
import { GOAL_OPTIONS, bmiCategoryLabel, labelOf } from '../lib/healthMetrics';

const PAGE = 'mx-auto flex w-full max-w-[1100px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';
const CARD = 'flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg';
const LINK = 'inline-flex w-fit items-center gap-1 font-label-md text-label-md text-primary no-underline hover:underline';

const Profile: React.FC = () => {
  const me = useCurrentUser();
  const schools = useDietarySchools();

  if (me.isPending) {
    return (
      <div className={PAGE}>
        <ProfileTabs />
        <div role="status" aria-label="Đang tải hồ sơ" className="flex flex-col gap-space-lg">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid gap-space-lg lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }
  if (me.isError) {
    return (
      <div className={PAGE}>
        <ProfileTabs />
        <ErrorState error={me.error} onRetry={() => me.refetch()} retrying={me.isRefetching} />
      </div>
    );
  }

  const data = me.data;
  const health = data.health;
  // Trường phái tự kiêng ngũ vị tân (ví dụ Phật giáo) thì không ghi lặp "kiêng ngũ vị tân".
  const schoolForbidsAllium = schools.data?.find((item) => item.dietarySchoolId === health?.dietarySchool?.id)?.forbidAllium === true;

  return (
    <div className={PAGE}>
      <ProfileTabs />

      <header className="flex flex-col items-center gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-card sm:flex-row sm:items-start">
        <AvatarUploader name={data.fullName} avatarUrl={data.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center sm:items-start sm:pt-space-sm sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-headline-lg text-headline-lg-mobile break-words text-on-surface sm:text-headline-lg">{data.fullName}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm',
                data.isVip ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface'
              )}
            >
              <Icon name={data.isVip ? 'workspace_premium' : 'person'} className="text-[14px]" />
              {data.isVip ? 'Thành viên VIP' : 'Thành viên'}
            </span>
          </div>
          <p className="flex items-center gap-1 font-body-md text-body-md break-all text-on-surface-variant">
            <Icon name="mail" className="text-[18px]" />
            {data.email}
          </p>
          {data.phoneNumber && (
            <p className="flex items-center gap-1 font-body-md text-body-md text-on-surface-variant tabular-nums">
              <Icon name="call" className="text-[18px]" />
              {data.phoneNumber}
            </p>
          )}
          <Link to={PATHS.AUTH.CHANGE_PASSWORD} className={cn(LINK, 'mt-1')}>
            <Icon name="lock_reset" className="text-[18px]" />
            Đổi mật khẩu
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-space-lg lg:grid-cols-2">
        <PersonalInfoCard me={data} />

        <div className="flex flex-col gap-space-lg">
          <section aria-labelledby="health-summary-title" className={CARD}>
            <h2 id="health-summary-title" className="font-headline-sm text-headline-sm text-on-surface">
              Chỉ số thể trạng
            </h2>
            {health ? (
              <>
                {health.isStaleMetrics && (
                  <p className="flex items-center gap-1 rounded-lg bg-warning-container px-3 py-2 font-label-sm text-label-sm text-warning">
                    <Icon name="schedule" className="text-[16px]" />
                    Đã hơn 30 ngày chưa cập nhật số đo.
                  </p>
                )}
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-container-low p-space-sm">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant">Chiều cao</dt>
                    <dd className="font-label-lg text-label-lg text-on-surface tabular-nums">{formatNumber(health.heightCm)} cm</dd>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-space-sm">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant">Cân nặng</dt>
                    <dd className="font-label-lg text-label-lg text-on-surface tabular-nums">{formatNumber(health.currentWeightKg)} kg</dd>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-space-sm">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant">BMI</dt>
                    <dd className="font-label-lg text-label-lg text-on-surface tabular-nums">
                      {formatNumber(health.bmi)} <span className="font-label-sm text-label-sm text-on-surface-variant">{bmiCategoryLabel(health.bmiCategory)}</span>
                    </dd>
                  </div>
                </dl>
                <p className="font-body-md text-body-md text-on-surface">
                  Mục tiêu <strong>{labelOf(GOAL_OPTIONS, health.healthGoal).toLowerCase()}</strong> ·{' '}
                  <strong className="tabular-nums">{formatNumber(health.targetDailyCalories)} kcal</strong>/ngày
                </p>
                <Link to={PATHS.ME.HEALTH} className={LINK}>
                  Xem và cập nhật hồ sơ sức khỏe
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </>
            ) : (
              <>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Bạn chưa lập hồ sơ sức khỏe. Hồ sơ giúp tính BMI, calo mục tiêu và gợi ý thực đơn hợp thể trạng.
                </p>
                <Link
                  to={PATHS.ME.HEALTH}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
                >
                  Lập hồ sơ sức khỏe
                </Link>
              </>
            )}
          </section>

          <section aria-labelledby="prefs-summary-title" className={CARD}>
            <h2 id="prefs-summary-title" className="font-headline-sm text-headline-sm text-on-surface">
              Trường phái & dị ứng
            </h2>
            <p className="font-body-md text-body-md text-on-surface">
              {health?.dietarySchool?.name ?? 'Chưa chọn trường phái'}
              {health?.requiresAlliumFree && !schoolForbidsAllium ? ' · kiêng ngũ vị tân' : ''}
            </p>
            {data.allergens.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Dị ứng đã khai báo">
                {data.allergens.map((item) => (
                  <li key={item.allergenId} className="rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-error-container">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Chưa khai báo dị ứng.</p>
            )}
            <Link to={PATHS.ME.DIETARY_PREFERENCES} className={LINK}>
              Chỉnh trường phái và dị ứng
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </section>
        </div>
      </div>

      <DeactivateAccountCard />
    </div>
  );
};

export default Profile;
