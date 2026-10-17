/**
 * SCR-09 · profile/DietaryPreferences · `/me/dietary-preferences`
 * FN: FN-PROF-05, FN-PROF-08 (+ FN-PROF-04 để đổi trường phái) · Huỳnh Việt Phát · Sprint 5
 * Khách xem được danh mục; Lưu cần Thành viên (guard theo nút).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FormAlert } from '@/components/ui/forms';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { AllergyCard } from '../components/AllergyCard';
import { ProfileTabs } from '../components/ProfileTabs';
import { SchoolPreferenceCard } from '../components/SchoolPreferenceCard';
import { useCurrentUser } from '../hooks/useProfile';

const PAGE = 'mx-auto flex w-full max-w-[1100px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';

const DietaryPreferences: React.FC = () => {
  const { isMember } = useRequireMember();
  const me = useCurrentUser();

  const header = (
    <>
      <ProfileTabs />
      <header>
        <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Trường phái & dị ứng</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Cá nhân hóa bộ lọc an toàn cho công thức, thực đơn tuần và cảnh báo khi quét mã vạch.
        </p>
      </header>
    </>
  );

  if (isMember && me.isPending) {
    return (
      <div className={PAGE}>
        {header}
        <div role="status" aria-label="Đang tải sở thích ăn uống" className="grid gap-space-lg lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
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
          Đăng nhập để lưu trường phái và dị ứng của bạn.{' '}
          <Link to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.ME.DIETARY_PREFERENCES)} className="font-label-md text-label-md text-primary">
            Đăng nhập
          </Link>
        </FormAlert>
      )}
      <div className="grid items-start gap-space-lg lg:grid-cols-2">
        {/* key theo lần cập nhật hồ sơ: lưu trường phái xong thì khởi tạo lại lựa chọn theo dữ liệu server. */}
        <SchoolPreferenceCard key={`school-${health?.updatedAt ?? 'none'}`} health={health} isMember={isMember} />
        {/* Không khởi tạo lại sau khi lưu dị ứng: server không trả ghi chú, giữ ghi chú người dùng vừa nhập. */}
        <AllergyCard current={me.data?.allergens ?? []} isMember={isMember} />
      </div>
    </div>
  );
};

export default DietaryPreferences;
