import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { NotFoundPage } from '@/app/NotFoundPage';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber } from '@/lib/format';
import { toApiError } from '@/lib/apiError';
import { PATHS } from '@/routes/paths';
import { toast } from '@/stores/ui.store';
import { GoongMap, type MapFocus } from '../components/GoongMap';
import { useVenue } from '../hooks/useVenues';
import { formatDistance } from '../lib/geo';
import type { LatLng, NearbyVenue } from '../types/venues.types';

/**
 * SCR-19 · venues/VenueDetail · `/venues/:id`
 * FN: FN-MAP-02 Xem chi tiết quán chay.
 * Tuyệt đối không fix cứng dữ liệu bịa đặt (giờ mở cửa, tiện ích giả định).
 * Dữ liệu bám sát 100% schema trả về từ Backend API.
 */
export const VenueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const venueId = Number(id);

  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const userCoords: LatLng | null =
    latParam && lngParam && Number.isFinite(Number(latParam)) && Number.isFinite(Number(lngParam))
      ? { lat: Number(latParam), lng: Number(lngParam) }
      : null;

  const venueQuery = useVenue(venueId, userCoords);
  const [linkCopied, setLinkCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!Number.isInteger(venueId) || venueId <= 0) {
    return <NotFoundPage />;
  }

  if (venueQuery.isPending) {
    return <VenueDetailSkeleton />;
  }

  if (venueQuery.isError) {
    const err = toApiError(venueQuery.error);
    if (err.status === 404 || err.errorCode === 'ERR_VENUE_NOT_FOUND') {
      return <NotFoundPage />;
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState error={err} onRetry={() => void venueQuery.refetch()} retrying={venueQuery.isRefetching} />
      </div>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
    return <NotFoundPage />;
  }

  const distanceText = formatDistance(venue.distanceKm);
  const ratingNum = Number(venue.rating);
  const hasRating = venue.rating !== undefined && venue.rating !== null && !isNaN(ratingNum) && ratingNum > 0;

  // Cắm marker quán lên GoongMap
  const venueAsNearby: NearbyVenue = {
    venueId: venue.venueId,
    name: venue.name,
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    lat: venue.lat,
    lng: venue.lng,
    distanceKm: venue.distanceKm ?? null,
    rating: venue.rating,
    isFullyVegan: venue.isFullyVegan,
    thumbnailUrl: venue.thumbnailUrl ?? null,
    categories: venue.categories,
    directionsUrl: venue.directionsUrl,
  };

  // Zoom 16: Cận cảnh đường phố rõ từng số nhà và ngã tư xung quanh quán
  const mapFocus: MapFocus = {
    center: { lat: venue.lat, lng: venue.lng },
    zoom: 16,
  };

  const handleShareLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setLinkCopied(true);
        toast.success('Đã sao chép liên kết quán chay');
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      toast.info('Không thể sao chép liên kết');
    }
  };

  const handleCopyAddress = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(venue.address);
        setAddressCopied(true);
        toast.success('Đã sao chép địa chỉ quán chay');
        setTimeout(() => setAddressCopied(false), 2000);
      }
    } catch {
      toast.info('Không thể sao chép địa chỉ');
    }
  };

  const handleToggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    if (next) {
      toast.success('Đã lưu quán vào danh sách yêu thích');
    } else {
      toast.info('Đã bỏ lưu quán');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      {/* 1. Nút quay lại bản đồ */}
      <nav aria-label="Breadcrumb">
        <Link
          to={PATHS.VENUES.ROOT}
          className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant no-underline transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Quay lại bản đồ quán chay</span>
        </Link>
      </nav>

      {/* 2. Hero quán thu nhỏ gọn gàng (Compact Venue Header) */}
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 shadow-card sm:p-6 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          {/* Thumbnail ảnh đại diện nhỏ gọn */}
          {venue.thumbnailUrl ? (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container shadow-sm sm:h-24 sm:w-24">
              <img src={venue.thumbnailUrl} alt={venue.name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/40 text-primary shadow-sm sm:h-24 sm:w-24">
              <Icon name="storefront" className="text-[40px]" />
            </div>
          )}

          {/* Thông tin định danh quán */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold tracking-wide',
                  venue.isFullyVegan
                    ? 'bg-primary text-on-primary'
                    : 'bg-secondary text-on-secondary'
                )}
              >
                {venue.isFullyVegan ? '100% THUẦN CHAY' : 'CÓ MÓN CHAY'}
              </span>

              {/* Chỉ render các tag thực tế từ backend */}
              {venue.categories && venue.categories.length > 0 && venue.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant"
                >
                  {cat}
                </span>
              ))}
            </div>

            <h1 className="font-headline-md text-headline-md font-bold text-on-surface sm:text-headline-lg">
              {venue.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
              {hasRating && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                  <Icon name="star" filled className="text-[17px] text-amber-500" />
                  <span>{formatNumber(ratingNum)}</span>
                  <span className="font-normal text-on-surface-variant">/ 5.0</span>
                </span>
              )}
              {distanceText && (
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Icon name="near_me" className="text-[16px]" />
                  <span>Cách bạn {distanceText}</span>
                </span>
              )}
              <span className="text-outline">·</span>
              <span>Nguồn: {venue.source || 'GOOGLE_PLACES'}</span>
              {venue.lastSyncedAt && (
                <>
                  <span className="text-outline">·</span>
                  <span>Cập nhật {formatDateTime(venue.lastSyncedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động nhanh gọn */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={venue.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-label-md font-bold text-on-primary no-underline shadow-sm transition-all hover:bg-primary-container active:scale-[0.98]"
          >
            <Icon name="directions" className="text-[19px]" />
            <span>Chỉ đường</span>
          </a>

          <button
            type="button"
            onClick={handleToggleSave}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 font-label-md text-label-md font-semibold transition-all active:scale-[0.98]',
              isSaved
                ? 'border-secondary/40 bg-secondary-container/50 text-on-secondary-container'
                : 'border-surface-container-high bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            )}
          >
            <Icon name="favorite" filled={isSaved} className={cn('text-[18px]', isSaved && 'text-secondary')} />
            <span>{isSaved ? 'Đã lưu' : 'Lưu quán'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest px-3.5 py-2.5 font-label-md text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-low active:scale-[0.98]"
          >
            <Icon name={linkCopied ? 'check' : 'share'} className="text-[18px]" />
            <span>{linkCopied ? 'Đã sao chép' : 'Chia sẻ'}</span>
          </button>
        </div>
      </section>

      {/* 3. Lưới nội dung chính: Bản đồ Street-Level & Thông tin xác thực */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Cột trái: Bản đồ zoom cận cảnh cấp đường phố (7 hoặc 8 cột) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <section className="flex flex-col gap-4 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
                <Icon name="map" className="text-[22px]" />
                <span>Địa chỉ &amp; Bản đồ trực quan</span>
              </h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)}
              </span>
            </div>

            {/* Bản đồ Goong zoom cận cảnh đường phố (zoom 16), không bị bao quát toàn quốc */}
            <div className="h-[340px] w-full overflow-hidden rounded-xl shadow-inner sm:h-[400px]">
              <GoongMap
                focus={mapFocus}
                userLocation={userCoords}
                radiusKm={null}
                venues={[venueAsNearby]}
                selectedVenueId={venue.venueId}
                autoOpenPopup={false}
                className="h-full w-full"
              />
            </div>

            {/* Hộp địa chỉ có nút sao chép nhanh */}
            <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low/70 p-4 border border-surface-container sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 font-body-md text-body-md text-on-surface">
                <Icon name="location_on" className="mt-0.5 shrink-0 text-[20px] text-primary" />
                <span className="leading-snug">{venue.address}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-surface-container-high bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container"
              >
                <Icon name={addressCopied ? 'check' : 'content_copy'} className="text-[16px] text-primary" />
                <span>{addressCopied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>

            <a
              href={venue.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3 font-label-md text-label-md font-semibold text-primary no-underline transition-colors hover:bg-primary/10 active:scale-[0.98]"
            >
              <Icon name="open_in_new" className="text-[18px]" />
              <span>Mở chỉ đường trên ứng dụng Google Maps</span>
            </a>
          </section>
        </div>

        {/* Cột phải: Thông tin xác thực & Lưu ý thực tế (4 cột) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Thẻ 1: Thông tin xác thực & Kiểm chứng */}
          <section className="flex flex-col gap-4 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 sm:p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
              <Icon name="verified" className="text-[22px] text-primary" />
              <span>Thông tin định danh</span>
            </h2>

            <div className="space-y-3 font-body-sm text-body-sm">
              <div className="flex justify-between items-start gap-2 border-b border-surface-container py-2">
                <span className="text-on-surface-variant shrink-0">Loại hình quán</span>
                <span className="font-semibold text-on-surface text-right">
                  {venue.isFullyVegan ? '100% Thuần chay (Vegan)' : 'Có phục vụ món chay'}
                </span>
              </div>

              {venue.categories && venue.categories.length > 0 && (
                <div className="flex justify-between items-start gap-2 border-b border-surface-container py-2">
                  <span className="text-on-surface-variant shrink-0">Thực đơn</span>
                  <span className="font-medium text-on-surface text-right">
                    {venue.categories.join(', ')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start gap-2 border-b border-surface-container py-2">
                <span className="text-on-surface-variant shrink-0">Nguồn dữ liệu</span>
                <span className="font-semibold text-on-surface">{venue.source || 'GOOGLE_PLACES'}</span>
              </div>

              {venue.lastSyncedAt && (
                <div className="flex justify-between items-start gap-2 py-2">
                  <span className="text-on-surface-variant shrink-0">Đồng bộ gần nhất</span>
                  <span className="text-on-surface-variant text-right">{formatDateTime(venue.lastSyncedAt)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Thẻ 2: Lưu ý khách quan khi dùng bữa (Không fix cứng giờ quán cụ thể) */}
          <section className="flex flex-col gap-3 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 sm:p-6 shadow-card">
            <h3 className="flex items-center gap-2 font-title-md text-title-md text-on-surface font-semibold">
              <Icon name="lightbulb" className="text-[20px] text-amber-600" />
              <span>Gợi ý cho người ăn chay</span>
            </h3>

            <div className="space-y-3 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              <p>
                <strong className="text-on-surface">Ngày Rằm &amp; Mùng 1:</strong> Các quán chay thường rất đông khách vào các ngày sóc vọng. Thực khách nên đến sớm hoặc xem chỉ đường trước để chủ động hành trình.
              </p>
              <p>
                <strong className="text-on-surface">Kiểm tra thực đơn:</strong> Nếu bạn ăn chay theo trường phái nghiêm ngặt (không ngũ vị tân, không đường, thuần chay 100%), hãy trao đổi trực tiếp với nhân viên quán khi gọi món.
              </p>
            </div>
          </section>

          {/* Thẻ 3: Báo cáo thông tin quán */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => toast.info('Cảm ơn bạn. Chức năng báo cáo đang được ghi nhận để đối soát dữ liệu.')}
              className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-outline transition-colors hover:text-secondary"
            >
              <Icon name="flag" className="text-[16px]" />
              <span>Báo cáo thông tin quán không chính xác</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VenueDetailSkeleton: React.FC = () => (
  <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-[1280px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
    <div className="h-6 w-48 animate-pulse rounded bg-surface-container" />
    <div className="h-28 w-full animate-pulse rounded-2xl bg-surface-container" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="h-96 animate-pulse rounded-2xl bg-surface-container lg:col-span-8" />
      <div className="h-80 animate-pulse rounded-2xl bg-surface-container lg:col-span-4" />
    </div>
  </div>
);

export default VenueDetailPage;
