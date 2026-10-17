import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert, LABEL_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { PROVINCES, getDistrictsForProvince } from '@/constants/provinces';
import { QUOTA } from '@/constants/quota';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useGuestStore } from '@/stores/guest.store';
import { useUiStore } from '@/stores/ui.store';
import type { GeoStatus } from '../hooks/useGeolocation';
import type { FoodCategory } from '../types/venues.types';

const SELECT_CLASS =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container disabled:opacity-60';

export const MEMBER_RADII = [1, 3, 5, 10] as const;

export type SearchMode = 'gps' | 'area';

export interface VenueSearchPanelProps {
  isMember: boolean;
  geoStatus: GeoStatus;
  /** Quyền vị trí đã bị chặn từ trước (Permissions API). */
  geoBlocked: boolean;
  outsideVietnam: boolean;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  onLocate: () => void;
  province: string;
  onProvinceChange: (value: string) => void;
  district: string;
  onDistrictChange: (value: string) => void;
  provinceError: string | null;
  provinceSelectRef: React.Ref<HTMLSelectElement>;
  onSearchArea: (event: React.FormEvent) => void;
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
        Bản đồ quán chay hiện chỉ hỗ trợ trong lãnh thổ Việt Nam. Bạn hãy chuyển sang tab “Theo Tỉnh / Quận” để xem quán.
      </FormAlert>
    );
  }
  if (status === 'denied') {
    return (
      <FormAlert tone="warning" title="Bạn đã từ chối quyền vị trí">
        Hãy chuyển sang tab “Theo Tỉnh / Quận” để tìm quán. Muốn dùng vị trí hiện tại, bạn hãy bật lại quyền vị trí trong
        cài đặt trình duyệt.
      </FormAlert>
    );
  }
  if (status === 'timeout' || status === 'unavailable') {
    return (
      <FormAlert tone="warning" title="Chưa xác định được vị trí">
        Thiết bị chưa lấy được vị trí GPS. Bạn có thể thử bấm tìm lại hoặc chuyển sang tab “Theo Tỉnh / Quận”.
      </FormAlert>
    );
  }
  if (status === 'unsupported') {
    return (
      <FormAlert tone="info" title="Không dùng được định vị">
        Trình duyệt này không hỗ trợ định vị (hoặc trang không chạy qua HTTPS). Hãy chuyển sang tab “Theo Tỉnh / Quận”.
      </FormAlert>
    );
  }
  return null;
};

/**
 * Khối tìm kiếm hợp nhất của SCR-18:
 * - Hỗ trợ 2 chế độ: "Vị trí hiện tại (GPS)" và "Theo Tỉnh / Quận" thông qua Segmented Tabs.
 * - Hỗ trợ lọc theo trường District (Quận / Huyện).
 * - Gộp thành 1 NÚT HÀNH ĐỘNG DUY NHẤT ở cuối form, không gây nhầm lẫn giữa 2 nút riêng biệt.
 */
export const VenueSearchPanel: React.FC<VenueSearchPanelProps> = ({
  isMember,
  geoStatus,
  geoBlocked,
  outsideVietnam,
  searchMode,
  onSearchModeChange,
  onLocate,
  province,
  onProvinceChange,
  district,
  onDistrictChange,
  provinceError,
  provinceSelectRef,
  onSearchArea,
  radiusKm,
  onRadiusChange,
  radiusError,
  categories,
  categoryId,
  onCategoryChange,
  lockSeconds,
}) => {
  const location = useLocation();
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);
  const guestQuota = useGuestStore((state) => state.quota?.mapSearch ?? null);
  const guestRemaining = guestQuota ? Math.max(0, guestQuota.remaining) : QUOTA.guest.mapSearch;
  const guestLimit = guestQuota?.limit ?? QUOTA.guest.mapSearch;
  const isGuestExhausted = !isMember && guestRemaining <= 0;

  const locked = lockSeconds > 0;
  const availableDistricts = useMemo(() => (province ? getDistrictsForProvince(province) : []), [province]);

  const handleProvinceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onProvinceChange(val);
    onDistrictChange('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestExhausted) {
      openSignupPrompt();
      return;
    }
    if (searchMode === 'gps') {
      onLocate();
    } else {
      onSearchArea(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Tìm quán chay"
      className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card"
    >
      {/* 1. Tab chuyển chế độ tìm kiếm: GPS vs Tỉnh/Quận */}
      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Chế độ tìm kiếm</span>
        <div role="tablist" aria-label="Chế độ tìm kiếm" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1">
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === 'gps'}
            onClick={() => onSearchModeChange('gps')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 font-label-md text-label-md transition-all',
              searchMode === 'gps'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <Icon name="my_location" className="text-[18px]" />
            <span>Vị trí hiện tại</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === 'area'}
            onClick={() => onSearchModeChange('area')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 font-label-md text-label-md transition-all',
              searchMode === 'area'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <Icon name="location_city" className="text-[18px]" />
            <span>Theo Tỉnh / Quận</span>
          </button>
        </div>
      </div>

      {/* 2. Nội dung tương ứng theo chế độ */}
      {searchMode === 'gps' ? (
        <div className="flex flex-col gap-space-sm rounded-lg border border-surface-container bg-surface-container-low/60 p-3.5">
          <div className="flex items-start gap-2 text-on-surface">
            <Icon name="near_me" className="mt-0.5 text-[18px] text-primary" />
            <div className="flex flex-col text-xs leading-relaxed text-on-surface-variant">
              <span className="font-semibold text-on-surface">Định vị GPS tự động</span>
              <span>Dùng tọa độ thực tế của thiết bị để gợi ý các quán chay gần nhất xung quanh bạn.</span>
            </div>
          </div>
          <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="lock" className="mt-0.5 text-[15px] text-outline" />
            <span className="text-[12px]">
              Vị trí chỉ dùng để tìm quán lần này, không được lưu trữ trên hệ thống.
              {geoBlocked && ' Quyền vị trí hiện đang bị chặn trong trình duyệt.'}
            </span>
          </p>
          <GeoAlert status={geoStatus} outsideVietnam={outsideVietnam} />
        </div>
      ) : (
        <div className="flex flex-col gap-space-sm">
          {/* Ô chọn Tỉnh / Thành phố */}
          <div className="flex flex-col gap-1">
            <label htmlFor="venue-province" className={LABEL_CLASS}>
              Tỉnh / Thành phố <span className="text-error">*</span>
            </label>
            <select
              id="venue-province"
              ref={provinceSelectRef}
              value={province}
              onChange={handleProvinceSelect}
              aria-invalid={provinceError ? true : undefined}
              aria-describedby={provinceError ? 'venue-province-error' : undefined}
              className={cn(SELECT_CLASS, provinceError && 'ring-1 ring-error focus:ring-error')}
            >
              <option value="">Chọn tỉnh/thành phố...</option>
              {PROVINCES.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError id="venue-province-error">{provinceError}</FieldError>
          </div>

          {/* Ô chọn Quận / Huyện */}
          <div className="flex flex-col gap-1">
            <label htmlFor="venue-district" className={LABEL_CLASS}>
              Quận / Huyện <span className="font-normal text-on-surface-variant">(tùy chọn)</span>
            </label>
            {availableDistricts.length > 0 ? (
              <select
                id="venue-district"
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                className={SELECT_CLASS}
                disabled={!province}
              >
                <option value="">Tất cả quận/huyện ({availableDistricts.length} khu vực)</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="venue-district"
                type="text"
                placeholder={province ? 'Nhập tên quận/huyện/thị xã...' : 'Chọn tỉnh/thành trước'}
                value={district}
                disabled={!province}
                onChange={(e) => onDistrictChange(e.target.value)}
                className={SELECT_CLASS}
              />
            )}
            <p className="text-[12px] text-outline">
              {province ? 'Để trống nếu muốn tìm trên toàn tỉnh/thành phố.' : 'Chọn tỉnh/thành để lọc theo quận/huyện.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. Bộ lọc chung: Bán kính & Danh mục món */}
      <div className="flex flex-col gap-space-md border-t border-surface-container pt-space-md">
        <div className="flex flex-col gap-space-xs">
          <span className={LABEL_CLASS} id="venue-radius-label">
            Bán kính tìm kiếm
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
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {value} km
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 rounded-xl border border-surface-container bg-surface-container-low/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">Lượt tìm kiếm của Khách:</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-bold shadow-2xs',
                    isGuestExhausted
                      ? 'bg-error-container text-on-error-container border border-error/30'
                      : 'bg-primary-fixed/40 text-primary border border-primary/20'
                  )}
                >
                  <Icon name="travel_explore" className="text-[14px]" />
                  <span>{isGuestExhausted ? 'Đã hết lượt (0/3)' : `Còn ${guestRemaining}/${guestLimit} lượt`}</span>
                </span>
              </div>

              {/* Progress bar 3 nấc trực quan */}
              <div className="grid grid-cols-3 gap-1.5 py-0.5">
                {[1, 2, 3].map((step) => {
                  const active = step <= guestRemaining;
                  return (
                    <div
                      key={step}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        isGuestExhausted
                          ? 'bg-error/30'
                          : active
                            ? 'bg-primary'
                            : 'bg-surface-container-high'
                      )}
                    />
                  );
                })}
              </div>

              {isGuestExhausted ? (
                <div className="flex flex-col gap-1 rounded-lg bg-error-container/40 p-2.5 text-on-error-container border border-error/20">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold text-error">
                    <Icon name="lock" className="text-[16px]" />
                    <span>Đã dùng hết 03 lượt dùng thử miễn phí</span>
                  </div>
                  <p className="font-body-xs text-body-xs text-on-surface-variant">
                    Vui lòng đăng ký tài khoản miễn phí để tiếp tục tìm quán chay quanh bạn không giới hạn và mở rộng bán kính tới 10 km.
                  </p>
                </div>
              ) : (
                <p className="font-body-xs text-body-xs text-on-surface-variant leading-relaxed">
                  Khách vãng lai tìm trong bán kính {QUOTA.guest.mapRadiusKm} km, tối đa {QUOTA.guest.mapSearch} lượt có kết quả (BR-GUEST-03).{' '}
                  <Link
                    to={withReturnUrl(PATHS.AUTH.LOGIN, `${location.pathname}${location.search}`)}
                    className="font-medium text-primary no-underline hover:underline"
                  >
                    Đăng nhập để tìm tới {QUOTA.memberMapRadiusKm.max} km &amp; không giới hạn lượt.
                  </Link>
                </p>
              )}
            </div>
          )}
          <FieldError>{radiusError}</FieldError>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="venue-category" className={LABEL_CLASS}>
              Danh mục món chay
            </label>
            <select
              id="venue-category"
              value={categoryId ?? ''}
              onChange={(event) => onCategoryChange(event.target.value ? Number(event.target.value) : null)}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả danh mục món</option>
              {categories.map((item) => (
                <option key={item.categoryId} value={item.categoryId}>
                  {item.categoryName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. DUY NHẤT 1 NÚT HÀNH ĐỘNG CHÍNH (Single Primary Action Button) */}
      <div className="pt-space-xs">
        {isGuestExhausted ? (
          <Button
            type="button"
            size="lg"
            variant="primary"
            onClick={() => openSignupPrompt()}
            className="w-full shadow-sm bg-secondary hover:bg-secondary-container"
          >
            <Icon name="person_add" className="text-[20px]" />
            Đăng ký miễn phí để tiếp tục tìm quán
          </Button>
        ) : searchMode === 'gps' ? (
          <Button
            type="submit"
            size="lg"
            loading={geoStatus === 'locating'}
            disabled={locked}
            className="w-full shadow-sm"
          >
            <Icon name="my_location" className="text-[20px]" />
            {geoStatus === 'locating' ? 'Đang xác định vị trí...' : 'Tìm quán quanh vị trí của tôi'}
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={locked}
            className="w-full shadow-sm"
          >
            <Icon name="search" className="text-[20px]" />
            {locked ? `Thử lại sau ${lockSeconds} giây` : 'Tìm quán theo khu vực'}
          </Button>
        )}
      </div>
    </form>
  );
};
