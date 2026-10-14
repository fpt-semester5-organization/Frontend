import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { findProvince, type Province } from '@/constants/provinces';
import { QUOTA } from '@/constants/quota';
import { useCountdown } from '@/hooks/useCountdown';
import { toApiError } from '@/lib/apiError';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { notifyApiError } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { GoongMap, type MapFocus } from '../components/GoongMap';
import { MapQuotaBadge } from '../components/MapQuotaBadge';
import { VenueCard, VenueListSkeleton } from '../components/VenueCard';
import { VenueSearchPanel } from '../components/VenueSearchPanel';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFoodCategories, useNearbyVenues } from '../hooks/useVenues';
import { isOutsideVietnam } from '../lib/geo';
import type { LatLng, NearbyVenuesParams } from '../types/venues.types';

const PAGE_SIZE = 20;
const RATE_LIMIT_LOCK_MS = 10 * 1000;
const PROVINCE_ZOOM = 10;
/** Zoom vừa vòng bán kính quanh người dùng. */
const zoomForRadius = (radiusKm: number) => (radiusKm <= 1 ? 14 : radiusKm <= 3 ? 13 : radiusKm <= 5 ? 12 : 11);

/** Lần tìm đã gửi: vị trí GPS (chỉ giữ trong bộ nhớ) hoặc tỉnh/thành, kèm bộ lọc lúc bấm tìm. */
type Search =
  | { kind: 'gps'; coords: LatLng; radiusKm: number; categoryId: number | null }
  | { kind: 'province'; province: Province; categoryId: number | null };

/**
 * SCR-18 venues/VenueMap — /venues. GET /venues/nearby (FN-MAP-01), GET /categories (FN-PROF-08).
 * Bản đồ Goong; xin GPS khi người dùng bấm, từ chối thì tìm theo tỉnh/thành; ở ngoài Việt Nam thì báo khu vực chưa hỗ trợ.
 */
const VenueMap: React.FC = () => {
  const isMember = useAuthStore((state) => state.isAuthenticated);
  const pushToast = useUiStore((state) => state.pushToast);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);
  const geo = useGeolocation();
  const categories = useFoodCategories();

  const [province, setProvince] = useState('');
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(QUOTA.guest.mapRadiusKm);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState<Search | null>(null);
  const [page, setPage] = useState(1);
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [outsideVietnam, setOutsideVietnam] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockSeconds = useCountdown(lockedUntil);
  const provinceSelectRef = useRef<HTMLSelectElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);

  /** Màn hẹp: bảng tìm kiếm chiếm gần hết màn hình, nên cuộn xuống bản đồ + kết quả sau khi tìm. */
  const revealResultsOnMobile = useCallback(() => {
    if (window.matchMedia('(max-width: 1023.98px)').matches) {
      mapAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const effectiveRadius = isMember ? radiusKm : QUOTA.guest.mapRadiusKm;

  const params = useMemo<NearbyVenuesParams | null>(() => {
    if (!search) return null;
    const base = search.kind === 'gps'
      ? { lat: search.coords.lat, lng: search.coords.lng, radiusKm: search.radiusKm }
      : { province: search.province.name };
    return { ...base, ...(search.categoryId ? { categoryId: search.categoryId } : {}), page, size: PAGE_SIZE };
  }, [search, page]);

  const nearby = useNearbyVenues(params);
  const error = nearby.error ? toApiError(nearby.error) : null;

  // Bấm tìm lại đúng điều kiện vừa lỗi (vd. vừa tắt giả lập nước ngoài) thì phải gọi lại API;
  // điều kiện đã có kết quả thì dùng cache, không tốn thêm lượt của Khách.
  const latestNearby = useRef(nearby);
  latestNearby.current = nearby;
  useEffect(() => {
    if (search && latestNearby.current.isError) void latestNearby.current.refetch();
  }, [search]);

  const requestGeo = geo.request;
  const locate = useCallback(() => {
    setOutsideVietnam(false);
    setWaitingForGps(true);
    requestGeo();
  }, [requestGeo]);

  // Có kết quả GPS: kiểm tra lãnh thổ rồi tìm; không có thì đưa người dùng sang ô chọn tỉnh/thành.
  useEffect(() => {
    if (!waitingForGps || geo.status === 'idle' || geo.status === 'locating') return;
    setWaitingForGps(false);
    if (geo.status === 'ready' && geo.coords) {
      if (isOutsideVietnam(geo.coords)) {
        // Không gọi API (không tốn lượt) và bỏ kết quả của vị trí trước đó.
        setOutsideVietnam(true);
        setSearch(null);
        return;
      }
      setPage(1);
      setSearch({ kind: 'gps', coords: geo.coords, radiusKm: effectiveRadius, categoryId });
      revealResultsOnMobile();
    } else {
      provinceSelectRef.current?.focus();
    }
  }, [waitingForGps, geo.status, geo.coords, effectiveRadius, categoryId, revealResultsOnMobile]);

  // Thành viên đã cấp quyền vị trí từ trước: tìm ngay (Khách phải tự bấm để không tốn lượt).
  const autoLocated = useRef(false);
  useEffect(() => {
    if (isMember && geo.permission === 'granted' && !autoLocated.current) {
      autoLocated.current = true;
      locate();
    }
  }, [isMember, geo.permission, locate]);

  // Phản hồi lỗi theo bảng mã lỗi của SCR-18.
  useEffect(() => {
    if (!error) return;
    if (error.errorCode === 'ERR_QUOTA_MAP_EXCEEDED') {
      mergeGuestQuota({ mapSearch: { limit: QUOTA.guest.mapSearch, used: QUOTA.guest.mapSearch, remaining: 0 } }, !isMember);
    } else if (error.status === 429) {
      setLockedUntil(Date.now() + RATE_LIMIT_LOCK_MS);
      notifyApiError(error);
    } else if (error.status >= 500) {
      notifyApiError(error);
    }
  }, [error, isMember]);

  const searchByProvince = (event: React.FormEvent) => {
    event.preventDefault();
    const selected = findProvince(province);
    if (!selected) {
      setProvinceError('Hãy chọn tỉnh/thành để tìm quán.');
      provinceSelectRef.current?.focus();
      return;
    }
    setProvinceError(null);
    setOutsideVietnam(false);
    setPage(1);
    setSearch({ kind: 'province', province: selected, categoryId });
    revealResultsOnMobile();
  };

  const changePage = (next: number) => {
    setPage(next);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const widenRadius = () => {
    if (search?.kind !== 'gps') return;
    setRadiusKm(QUOTA.memberMapRadiusKm.max);
    setPage(1);
    setSearch({ ...search, radiusKm: QUOTA.memberMapRadiusKm.max });
  };

  const fieldError = (field: string) =>
    error?.errorCode === 'ERR_VALIDATION' ? (error.details.find((item) => item.field === field)?.message ?? null) : null;

  const focus: MapFocus | null = !search
    ? null
    : search.kind === 'gps'
      ? { center: search.coords, zoom: zoomForRadius(search.radiusKm) }
      : { center: search.province.center, zoom: PROVINCE_ZOOM };

  const renderResults = () => {
    if (!search) {
      return (
        <EmptyState
          icon="storefront"
          title="Tìm quán chay quanh bạn"
          description="Dùng vị trí hiện tại hoặc chọn tỉnh/thành để xem danh sách quán chay."
        />
      );
    }
    if (nearby.isPending) return <VenueListSkeleton />;

    if (error) {
      if (error.errorCode === 'ERR_GUEST_REGION_UNSUPPORTED') {
        return (
          <EmptyState
            icon="public_off"
            title="Khu vực của bạn chưa được hỗ trợ"
            description={`${error.message || 'Bạn đang truy cập từ ngoài lãnh thổ Việt Nam.'} Bản đồ quán chay hiện chỉ phục vụ trong lãnh thổ Việt Nam.`}
          />
        );
      }
      if (error.errorCode === 'ERR_QUOTA_MAP_EXCEEDED') {
        return (
          <EmptyState
            icon="lock"
            title="Bạn đã dùng hết 03 lượt tìm quán"
            description="Đăng ký tài khoản miễn phí để tìm quán chay không giới hạn, trong bán kính tới 10 km."
            action={<Button onClick={() => openSignupPrompt()}>Đăng ký miễn phí</Button>}
          />
        );
      }
      if (error.errorCode === 'ERR_VALIDATION') {
        return <FormAlert tone="warning" title="Thông tin tìm kiếm chưa hợp lệ">{error.message}</FormAlert>;
      }
      return <ErrorState error={error} onRetry={() => nearby.refetch()} retrying={nearby.isRefetching} />;
    }

    const items = nearby.data?.items ?? [];
    const meta = nearby.data?.meta;
    const total = meta?.total ?? items.length;
    const scope =
      search.kind === 'gps'
        ? `trong bán kính ${meta?.radiusKm ?? search.radiusKm} km quanh bạn`
        : `tại ${search.province.label}`;

    if (items.length === 0) {
      const canWiden = isMember && search.kind === 'gps' && search.radiusKm < QUOTA.memberMapRadiusKm.max;
      return (
        <EmptyState
          icon="search_off"
          title="Chưa có quán chay nào ở khu vực này"
          description={
            canWiden
              ? `Không tìm thấy quán ${scope}. Thử mở rộng bán kính tìm kiếm.`
              : `Không tìm thấy quán ${scope}. Thử chọn tỉnh/thành khác.`
          }
          action={canWiden ? <Button onClick={widenRadius}>Mở rộng tới {QUOTA.memberMapRadiusKm.max} km</Button> : undefined}
        />
      );
    }

    return (
      <div className={nearby.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <p className="mb-space-sm font-body-sm text-body-sm text-on-surface-variant" role="status">
          Tìm thấy <span className="font-semibold text-on-surface">{total}</span> quán {scope}
        </p>
        <ul className="flex flex-col gap-space-sm">
          {items.map((venue) => (
            <li key={venue.venueId}>
              <VenueCard venue={venue} />
            </li>
          ))}
        </ul>
        <Pagination className="mt-space-lg" page={meta?.page ?? page} size={PAGE_SIZE} total={total} onPageChange={changePage} />
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Quán chay quanh bạn</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tìm quán chay gần vị trí hiện tại hoặc theo tỉnh/thành, rồi mở chỉ đường tới quán.
          </p>
        </div>
        {!isMember && <MapQuotaBadge />}
      </header>

      <div className="grid grid-cols-1 gap-gutter [grid-template-areas:'panel'_'map'_'results'] lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:[grid-template-areas:'panel_map'_'results_map']">
        <div className="min-w-0 [grid-area:panel]">
          <VenueSearchPanel
            isMember={isMember}
            geoStatus={geo.status}
            geoBlocked={geo.permission === 'denied'}
            outsideVietnam={outsideVietnam}
            onLocate={locate}
            province={province}
            onProvinceChange={(value) => {
              setProvince(value);
              setProvinceError(null);
            }}
            provinceError={provinceError ?? fieldError('province')}
            provinceSelectRef={provinceSelectRef}
            onSearchProvince={searchByProvince}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            radiusError={fieldError('radiusKm')}
            categories={categories.data}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            lockSeconds={lockSeconds}
          />
        </div>

        <div ref={mapAreaRef} className="min-w-0 scroll-mt-[88px] [grid-area:map] lg:sticky lg:top-[88px] lg:self-start">
          <GoongMap
            focus={focus}
            userLocation={search?.kind === 'gps' ? search.coords : null}
            radiusKm={search?.kind === 'gps' ? search.radiusKm : null}
            className="h-[300px] sm:h-[380px] lg:h-[calc(100vh-112px)] lg:min-h-[480px]"
          />
          {search && (
            <p className="mt-space-xs flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <Icon name="info" className="text-[16px]" />
              Bấm “Chỉ đường” ở từng quán để xem vị trí quán và đường đi.
            </p>
          )}
        </div>

        <div ref={resultsRef} className="min-w-0 scroll-mt-[88px] [grid-area:results]">
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default VenueMap;
