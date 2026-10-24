import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bootstrapGuestSession } from '@/api/session';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { QUOTA } from '@/constants/quota';
import { useRecipe } from '@/features/recipes/hooks/useRecipes';
import { toApiError } from '@/lib/apiError';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { MapQuotaBadge } from '../components/MapQuotaBadge';
import { VenueCard, VenueListSkeleton } from '../components/VenueCard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRecipeVenues } from '../hooks/useVenues';
import { isOutsideVietnam } from '../lib/geo';
import type { LatLng } from '../types/venues.types';

const GEO_MESSAGE: Partial<Record<ReturnType<typeof useGeolocation>['status'], { title: string; text: string }>> = {
  denied: { title: 'Bạn đã từ chối quyền vị trí', text: 'Bật lại quyền vị trí trong cài đặt trình duyệt rồi bấm tìm lại, hoặc mở bản đồ để tìm quán theo tỉnh/thành.' },
  timeout: { title: 'Chưa xác định được vị trí', text: 'Thiết bị chưa lấy được vị trí GPS. Thử bấm tìm lại.' },
  unavailable: { title: 'Chưa xác định được vị trí', text: 'Thiết bị chưa lấy được vị trí GPS. Thử bấm tìm lại.' },
  unsupported: { title: 'Không dùng được định vị', text: 'Trình duyệt không hỗ trợ định vị hoặc trang không chạy qua HTTPS. Mở bản đồ để tìm quán theo tỉnh/thành.' },
};

/**
 * SCR-20 venues/SuggestVenue · `/venues/suggest?recipeId=` — FN-MAP-03 gợi ý quán liên quan tới món đang xem.
 * Vào từ trang chi tiết công thức. Cần vị trí hiện tại (xin khi người dùng bấm, BR-AUTH-002); tối đa 05 quán.
 */
const SuggestVenuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const recipeId = Number(searchParams.get('recipeId'));
  const validRecipe = Number.isInteger(recipeId) && recipeId > 0;
  const isMember = useAuthStore((state) => state.isAuthenticated);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);
  const recipe = useRecipe(validRecipe ? recipeId : 0);
  const geo = useGeolocation();
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [outside, setOutside] = useState(false);
  const venues = useRecipeVenues(recipeId, coords);
  const error = venues.error ? toApiError(venues.error) : null;
  const radiusKm = isMember ? QUOTA.memberMapRadiusKm.max : QUOTA.guest.mapRadiusKm;

  useEffect(() => {
    if (!isMember) void bootstrapGuestSession();
  }, [isMember]);

  // Có kết quả GPS: kiểm tra lãnh thổ rồi mới gọi API (Khách không mất lượt khi ở ngoài Việt Nam).
  useEffect(() => {
    if (geo.status !== 'ready' || !geo.coords) return;
    if (isOutsideVietnam(geo.coords)) {
      setOutside(true);
      setCoords(null);
      return;
    }
    setOutside(false);
    setCoords(geo.coords);
  }, [geo.status, geo.coords]);

  // Thành viên đã cấp quyền vị trí từ trước: tìm ngay (Khách phải tự bấm để không tốn lượt).
  const autoLocated = useRef(false);
  const requestGeo = geo.request;
  useEffect(() => {
    if (isMember && geo.permission === 'granted' && !autoLocated.current) {
      autoLocated.current = true;
      requestGeo();
    }
  }, [isMember, geo.permission, requestGeo]);

  useEffect(() => {
    if (error?.errorCode === 'ERR_QUOTA_MAP_EXCEEDED')
      mergeGuestQuota({ mapSearch: { limit: QUOTA.guest.mapSearch, used: QUOTA.guest.mapSearch, remaining: 0 } }, !isMember);
  }, [error, isMember]);

  const locate = () => {
    if (geo.status === 'ready' && coords) void venues.refetch();
    else geo.request();
  };

  if (!validRecipe) {
    return (
      <Page>
        <EmptyState
          icon="restaurant_menu"
          title="Chọn một món để gợi ý quán"
          description="Mở một công thức rồi bấm “Tìm quán có món này” để xem các quán chay gần bạn có món tương tự."
          action={
            <Link to={PATHS.RECIPES.ROOT} className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary">
              Xem công thức
            </Link>
          }
        />
      </Page>
    );
  }

  const recipeMissing =
    (recipe.isError && toApiError(recipe.error).status === 404) || error?.errorCode === 'ERR_CONTENT_NOT_FOUND';
  if (recipeMissing) {
    return (
      <Page>
        <EmptyState
          icon="search_off"
          title="Không tìm thấy công thức"
          description="Công thức không tồn tại hoặc chưa được công khai nên chưa thể gợi ý quán."
          action={<Link to={PATHS.RECIPES.ROOT} className="font-label-md text-label-md text-primary">Xem công thức khác</Link>}
        />
      </Page>
    );
  }

  const geoMessage = GEO_MESSAGE[geo.status];

  const renderResults = () => {
    if (outside)
      return (
        <EmptyState
          icon="public_off"
          title="Khu vực của bạn chưa được hỗ trợ"
          description="Gợi ý quán chay hiện chỉ phục vụ trong lãnh thổ Việt Nam."
        />
      );
    if (!coords)
      return (
        <EmptyState
          icon="my_location"
          title="Cho biết vị trí để gợi ý quán"
          description={`Chúng tôi tìm quán trong bán kính ${radiusKm} km quanh bạn có danh mục món trùng với món này.`}
          action={
            <Button onClick={locate} loading={geo.status === 'locating'}>
              <Icon name="near_me" className="text-[18px]" />
              {geo.status === 'locating' ? 'Đang xác định vị trí...' : 'Dùng vị trí của tôi'}
            </Button>
          }
        />
      );
    if (venues.isPending) return <VenueListSkeleton />;
    if (error) {
      if (error.errorCode === 'ERR_GUEST_REGION_UNSUPPORTED')
        return <EmptyState icon="public_off" title="Khu vực của bạn chưa được hỗ trợ" description={error.message || 'Gợi ý quán chay hiện chỉ phục vụ trong lãnh thổ Việt Nam.'} />;
      if (error.errorCode === 'ERR_QUOTA_MAP_EXCEEDED')
        return (
          <EmptyState
            icon="lock"
            title={`Bạn đã dùng hết ${QUOTA.guest.mapSearch} lượt tìm quán`}
            description="Đăng ký tài khoản miễn phí để tìm quán chay không giới hạn, trong bán kính tới 10 km."
            action={<Button onClick={() => openSignupPrompt()}>Đăng ký miễn phí</Button>}
          />
        );
      if (error.errorCode === 'ERR_VALIDATION') return <FormAlert tone="warning" title="Vị trí chưa hợp lệ">{error.message}</FormAlert>;
      return <ErrorState error={error} onRetry={() => void venues.refetch()} retrying={venues.isRefetching} />;
    }
    const list = venues.data ?? [];
    if (list.length === 0)
      return (
        <EmptyState
          icon="storefront"
          title="Chưa có quán phù hợp gần bạn"
          description={`Không có quán nào trong bán kính ${radiusKm} km phục vụ món cùng loại. Thử mở bản đồ để xem mọi quán chay quanh bạn.`}
          action={
            <Link to={PATHS.VENUES.ROOT} className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary">
              Mở bản đồ quán chay
            </Link>
          }
        />
      );
    return (
      <div className="flex flex-col gap-space-sm">
        <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">
          {list.length} quán trong bán kính {radiusKm} km, gần nhất ở trên
        </p>
        <ul className="flex flex-col gap-space-sm">
          {list.map((venue) => (
            <li key={venue.venueId}>
              <VenueCard venue={venue} />
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Page>
      <nav aria-label="Breadcrumb">
        <Link
          to={PATHS.RECIPES.DETAIL(recipeId)}
          className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Quay lại công thức
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex min-w-0 items-center gap-space-md">
          {recipe.data?.imageUrl ? (
            <img src={recipe.data.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Icon name="restaurant" className="text-[28px]" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface-variant">Quán gợi ý cho món</p>
            {recipe.isPending ? (
              <div className="mt-1 h-7 w-56 animate-pulse rounded bg-surface-container" />
            ) : (
              <h1 className="break-words font-headline-md text-headline-md text-on-surface">{recipe.data?.title ?? `Công thức #${recipeId}`}</h1>
            )}
          </div>
        </div>
        {!isMember && <MapQuotaBadge />}
      </header>

      {geoMessage && !coords && (
        <FormAlert tone="warning" title={geoMessage.title}>
          {geoMessage.text}{' '}
          <Link to={PATHS.VENUES.ROOT} className="font-label-md text-label-md text-primary">
            Mở bản đồ quán chay
          </Link>
        </FormAlert>
      )}

      {renderResults()}
    </Page>
  );
};

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">{children}</div>
);

export default SuggestVenuePage;
