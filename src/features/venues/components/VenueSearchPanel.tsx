import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert, LABEL_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { PROVINCES } from '@/constants/provinces';
import { QUOTA } from '@/constants/quota';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import type { GeoStatus } from '../hooks/useGeolocation';
import type { FoodCategory } from '../types/venues.types';

const SELECT_CLASS =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container disabled:opacity-60';

export const MEMBER_RADII = [1, 3, 5, 10] as const;

interface VenueSearchPanelProps {
  isMember: boolean;
  geoStatus: GeoStatus;
  /** Quyền vị trí đã bị chặn từ trước (Permissions API). */
  geoBlocked: boolean;
  outsideVietnam: boolean;
  onLocate: () => void;
  province: string;
  onProvinceChange: (value: string) => void;
  provinceError: string | null;
  provinceSelectRef: React.Ref<HTMLSelectElement>;
  onSearchProvince: (event: React.FormEvent) => void;
  radiusKm: number;
  onRadiusChange: (value: number) => void;
  radiusError: string | null;
  categories: FoodCategory[] | undefined;
  categoryId: number | null;
  onCategoryChange: (value: number | null) => void;
  /** Đang khóa nút sau 429 (giây còn lại). */
  lockSeconds: number;
}

/** Thông báo sau khi xin GPS không thành công: luôn chỉ sang cách chọn tỉnh/thành. */
const GeoAlert: React.FC<{ status: GeoStatus; outsideVietnam: boolean }> = ({ status, outsideVietnam }) => {
  if (outsideVietnam) {
    return (
      <FormAlert tone="warning" title="Bạn đang ở ngoài Việt Nam">
        Bản đồ quán chay hiện chỉ hỗ trợ trong lãnh thổ Việt Nam. Bạn vẫn có thể chọn một tỉnh/thành ở Việt Nam để xem
        quán.
      </FormAlert>
    );
  }
  if (status === 'denied') {
    return (
      <FormAlert tone="warning" title="Bạn đã từ chối quyền vị trí">
        Hãy chọn tỉnh/thành bên dưới để tìm quán. Muốn dùng vị trí hiện tại, bật lại quyền vị trí cho trang này trong
        cài đặt trình duyệt.
      </FormAlert>
    );
  }
  if (status === 'timeout' || status === 'unavailable') {
    return (
      <FormAlert tone="warning" title="Chưa xác định được vị trí">
        Thiết bị chưa lấy được vị trí. Bạn có thể thử lại hoặc chọn tỉnh/thành bên dưới.
      </FormAlert>
    );
  }
  if (status === 'unsupported') {
    return (
      <FormAlert tone="info" title="Không dùng được định vị">
        Trình duyệt này không hỗ trợ định vị (hoặc trang không chạy qua HTTPS). Hãy chọn tỉnh/thành bên dưới.
      </FormAlert>
    );
  }
  return null;
};

/** Khối tìm kiếm của SCR-18: dùng vị trí hiện tại, hoặc chọn tỉnh/thành khi từ chối GPS; kèm bộ lọc. */
export const VenueSearchPanel: React.FC<VenueSearchPanelProps> = ({
  isMember,
  geoStatus,
  geoBlocked,
  outsideVietnam,
  onLocate,
  province,
  onProvinceChange,
  provinceError,
  provinceSelectRef,
  onSearchProvince,
  radiusKm,
  onRadiusChange,
  radiusError,
  categories,
  categoryId,
  onCategoryChange,
  lockSeconds,
}) => {
  const location = useLocation();
  const locked = lockSeconds > 0;

  return (
    <section
      aria-label="Tìm quán chay"
      className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card"
    >
      {/* Cách 1: vị trí hiện tại */}
      <div className="flex flex-col gap-space-sm">
        <Button size="lg" onClick={onLocate} loading={geoStatus === 'locating'} disabled={locked} className="w-full">
          <Icon name="my_location" className="text-[20px]" />
          {geoStatus === 'locating' ? 'Đang xác định vị trí...' : 'Tìm quán gần tôi'}
        </Button>
        <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="lock" className="mt-0.5 text-[16px]" />
          <span>
            Trình duyệt sẽ hỏi quyền vị trí. Vị trí chỉ dùng để tìm quán lần này, không được lưu lại.
            {geoBlocked && ' Quyền vị trí đang bị chặn cho trang này.'}
          </span>
        </p>
        <GeoAlert status={geoStatus} outsideVietnam={outsideVietnam} />
      </div>

      <div className="flex items-center gap-space-sm font-label-sm text-label-sm text-outline" aria-hidden="true">
        <span className="h-px flex-1 bg-surface-container-high" />
        hoặc
        <span className="h-px flex-1 bg-surface-container-high" />
      </div>

      {/* Cách 2: chọn tỉnh/thành (khi từ chối GPS) */}
      <form onSubmit={onSearchProvince} noValidate className="flex flex-col gap-space-sm">
        <label htmlFor="venue-province" className={LABEL_CLASS}>
          Tỉnh/thành phố
        </label>
        <div className="flex flex-col gap-space-sm sm:flex-row">
          <select
            id="venue-province"
            ref={provinceSelectRef}
            value={province}
            onChange={(event) => onProvinceChange(event.target.value)}
            aria-invalid={provinceError ? true : undefined}
            aria-describedby={provinceError ? 'venue-province-error' : undefined}
            className={cn(SELECT_CLASS, provinceError && 'ring-1 ring-error focus:ring-error')}
          >
            <option value="">Chọn tỉnh/thành...</option>
            {PROVINCES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={locked} className="h-auto py-2.5">
            {locked ? `Thử lại sau ${lockSeconds} giây` : 'Tìm quán'}
          </Button>
        </div>
        <FieldError id="venue-province-error">{provinceError}</FieldError>
      </form>

      {/* Bộ lọc dùng cho lần tìm tiếp theo */}
      <div className="flex flex-col gap-space-md border-t border-surface-container pt-space-md">
        <div className="flex flex-col gap-space-xs">
          <span className={LABEL_CLASS} id="venue-radius-label">
            Bán kính quanh bạn
          </span>
          {isMember ? (
            <div role="radiogroup" aria-labelledby="venue-radius-label" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-container p-1">
              {MEMBER_RADII.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={radiusKm === value}
                  onClick={() => onRadiusChange(value)}
                  className={cn(
                    'rounded-lg py-1.5 font-label-md text-label-md transition-colors',
                    radiusKm === value
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {value} km
                </button>
              ))}
            </div>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Khách tìm trong bán kính {QUOTA.guest.mapRadiusKm} km, tối đa {QUOTA.guest.mapSearch} lượt có kết quả.{' '}
              <Link
                to={withReturnUrl(PATHS.AUTH.LOGIN, `${location.pathname}${location.search}`)}
                className="text-primary no-underline hover:underline"
              >
                Đăng nhập để tìm tới {QUOTA.memberMapRadiusKm.max} km, không giới hạn lượt.
              </Link>
            </p>
          )}
          <FieldError>{radiusError}</FieldError>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="venue-category" className={LABEL_CLASS}>
              Danh mục món
            </label>
            <select
              id="venue-category"
              value={categoryId ?? ''}
              onChange={(event) => onCategoryChange(event.target.value ? Number(event.target.value) : null)}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((item) => (
                <option key={item.categoryId} value={item.categoryId}>
                  {item.categoryName}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="font-body-sm text-body-sm text-outline">Bộ lọc áp dụng cho lần tìm tiếp theo.</p>
      </div>
    </section>
  );
};
