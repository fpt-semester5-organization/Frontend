import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map as GoongMapInstance, Marker, Popup } from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { circleBBox, circlePolygon, formatDistance } from '../lib/geo';
import type { LatLng, NearbyVenue } from '../types/venues.types';

/** Maptiles key của Goong (Vite env). Thiếu key thì chỉ hiện thông báo, danh sách quán vẫn dùng được. */
const MAPTILES_KEY = (import.meta.env.VITE_GOONG_MAPTILES_KEY ?? '').trim();
const GOONG_STYLE = 'https://tiles.goong.io/assets/goong_map_web.json';
/** Toàn cảnh Việt Nam khi chưa có vị trí. */
const VIETNAM_VIEW = { center: [106.2, 16.2] as [number, number], zoom: 4.6 };
const RADIUS_SOURCE = 'search-radius';

export interface MapFocus {
  center: LatLng;
  zoom: number;
}

export interface GoongMapProps {
  /** Vị trí cần bay tới (vị trí người dùng hoặc trung tâm tỉnh/thành đã chọn). */
  focus: MapFocus | null;
  /** Chấm vị trí người dùng; null khi tìm theo tỉnh/thành. */
  userLocation: LatLng | null;
  /** Vòng bán kính tìm kiếm quanh người dùng (km). */
  radiusKm: number | null;
  /** Danh sách quán chay hiển thị marker trên bản đồ. */
  venues?: NearbyVenue[];
  /** Mã quán đang được chọn/hover để làm nổi bật marker. */
  selectedVenueId?: number | null;
  /** Callback khi người dùng click vào marker quán chay trên bản đồ. */
  onSelectVenue?: (venue: NearbyVenue) => void;
  /** Tự động mở popup khi quán được chọn (mặc định true; trang chi tiết đặt false). */
  autoOpenPopup?: boolean;
  className?: string;
}

type MapState = 'loading' | 'ready' | 'no-key' | 'unsupported' | 'failed';

const Notice: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <div role="status" className="flex h-full flex-col items-center justify-center gap-space-sm px-space-lg text-center">
    <Icon name={icon} className="text-[40px] text-outline" />
    <p className="font-label-lg text-label-lg text-on-surface">{title}</p>
    <p className="max-w-[360px] font-body-sm text-body-sm text-on-surface-variant">{text}</p>
  </div>
);

function userDot() {
  const element = document.createElement('div');
  element.setAttribute('aria-label', 'Vị trí của bạn');
  element.className = 'h-4 w-4 rounded-full border-2 border-white bg-info shadow-[0_0_0_6px_rgb(36_93_155/0.25)]';
  return element;
}

function escapeHtml(str: string): string {
  return str.replace(
    /[&<>'"]/g,
    (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[tag] || tag
  );
}

/**
 * Bản đồ Goong (@goongmaps/goong-js, Maptiles key).
 * Cắm marker quán chay, vòng tròn bán kính và tự động fitBounds vừa vặn màn hình.
 */
export const GoongMap: React.FC<GoongMapProps> = ({
  focus,
  userLocation,
  radiusKm,
  venues = [],
  selectedVenueId,
  onSelectVenue,
  autoOpenPopup = true,
  className,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerClassRef = useRef<typeof Marker | null>(null);
  const popupClassRef = useRef<typeof Popup | null>(null);
  const venueMarkersRef = useRef<Map<number, { marker: Marker; popup: Popup; el: HTMLElement }>>(new Map());
  const [state, setState] = useState<MapState>(MAPTILES_KEY ? 'loading' : 'no-key');

  // Tạo bản đồ một lần; thư viện tải động để không làm chậm phần danh sách.
  useEffect(() => {
    if (!MAPTILES_KEY || !containerRef.current) return;
    let cancelled = false;
    let map: GoongMapInstance | null = null;

    import('@goongmaps/goong-js')
      .then(({ default: goongjs }) => {
        if (cancelled || !containerRef.current) return;
        if (!goongjs.supported()) {
          setState('unsupported');
          return;
        }
        goongjs.accessToken = MAPTILES_KEY;
        markerClassRef.current = goongjs.Marker;
        popupClassRef.current = goongjs.Popup;

        const defaultCenter = focus
          ? [focus.center.lng, focus.center.lat]
          : venues.length === 1 && (venues[0].longitude ?? venues[0].lng) != null
            ? [venues[0].longitude ?? venues[0].lng!, venues[0].latitude ?? venues[0].lat!]
            : VIETNAM_VIEW.center;
        const defaultZoom = focus ? focus.zoom : venues.length === 1 ? 16 : VIETNAM_VIEW.zoom;

        map = new goongjs.Map({
          container: containerRef.current,
          style: GOONG_STYLE,
          center: defaultCenter as [number, number],
          zoom: defaultZoom,
        });
        map.addControl(new goongjs.NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => {
          if (cancelled) return;
          map?.resize();
          setState('ready');
        });
        // Sai key (401/403) hoặc không tải được style thì báo lỗi; lỗi lẻ của từng ô bản đồ thì bỏ qua.
        map.on('error', (event) => {
          const status = event.error?.status;
          if (!cancelled && (status === 401 || status === 403 || !map?.isStyleLoaded())) setState('failed');
        });
        mapRef.current = map;
      })
      .catch(() => !cancelled && setState('failed'));

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      venueMarkersRef.current.forEach(({ marker }) => marker.remove());
      venueMarkersRef.current.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Chấm vị trí người dùng.
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    if (state !== 'ready' || !map || !MarkerClass) return;
    markerRef.current?.remove();
    markerRef.current = userLocation
      ? new MarkerClass({ element: userDot() }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map)
      : null;
  }, [state, userLocation]);

  // Vòng bán kính tìm kiếm (GeoJSON layer).
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;
    const data =
      userLocation && radiusKm
        ? { type: 'FeatureCollection' as const, features: [circlePolygon(userLocation, radiusKm)] }
        : { type: 'FeatureCollection' as const, features: [] };
    const source = map.getSource(RADIUS_SOURCE) as any;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(RADIUS_SOURCE, { type: 'geojson', data });
    map.addLayer({
      id: `${RADIUS_SOURCE}-fill`,
      type: 'fill',
      source: RADIUS_SOURCE,
      paint: { 'fill-color': '#4f6f58', 'fill-opacity': 0.12 },
    });
    map.addLayer({
      id: `${RADIUS_SOURCE}-line`,
      type: 'line',
      source: RADIUS_SOURCE,
      paint: { 'line-color': '#3d5c47', 'line-width': 1.5, 'line-dasharray': [2, 2] },
    });
  }, [state, userLocation, radiusKm]);

  // Cắm Marker và Popup cho danh sách quán chay.
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    const PopupClass = popupClassRef.current;
    if (state !== 'ready' || !map || !MarkerClass || !PopupClass) return;

    // Dọn các marker cũ
    venueMarkersRef.current.forEach(({ marker }) => marker.remove());
    venueMarkersRef.current.clear();

    venues.forEach((venue) => {
      const vLat = venue.latitude ?? venue.lat;
      const vLng = venue.longitude ?? venue.lng;
      if (vLat == null || vLng == null || !Number.isFinite(vLat) || !Number.isFinite(vLng)) return;

      const isSelected = selectedVenueId === venue.venueId;
      const distanceText = formatDistance(venue.distanceKm);
      const ratingNum = Number(venue.rating);
      const hasRating = venue.rating !== undefined && venue.rating !== null && !isNaN(ratingNum) && ratingNum > 0;

      const el = document.createElement('div');
      el.className = 'venue-marker-root cursor-pointer select-none';
      el.innerHTML = `
        <div class="venue-pin-wrapper group flex flex-col items-center animate-marker-drop transition-transform duration-200 ${
          isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
        }">
          <!-- Thẻ tên & đánh giá: Nền rêu đậm thảo mộc sang trọng (tương phản cao trên bản đồ sáng, hài hòa chủ đề thuần chay) -->
          <div class="venue-pin-badge mb-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold shadow-md whitespace-nowrap transition-all ${
            isSelected
              ? 'bg-[#94532f] text-white ring-2 ring-white shadow-xl'
              : 'bg-[#243b2c] text-[#fdf9f4] border border-[#4f6f58]/50 hover:bg-[#1b2d22]'
          }">
            ${
              hasRating
                ? `<span class="material-symbols-outlined text-[13px] text-amber-400 leading-none">star</span><span>${formatNumber(ratingNum)}</span>`
                : ''
            }
            <span class="max-w-[120px] truncate">${escapeHtml(venue.name)}</span>
          </div>

          <!-- Ghim giọt nước thảo mộc cắm mũi nhọn xuống đúng tọa độ bản đồ -->
          <div class="relative flex items-center justify-center filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.3)]">
            <svg class="venue-pin-svg" width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 0C6.71573 0 0 6.71573 0 15C0 25.5 13.5 37 14.2 37.7C14.6 38.1 15.4 38.1 15.8 37.7C16.5 37 30 25.5 30 15C30 6.71573 23.2843 0 15 0Z" fill="${isSelected ? '#94532f' : '#3d5c47'}"/>
              <circle cx="15" cy="14" r="9" fill="white"/>
            </svg>
            <span class="venue-pin-icon material-symbols-outlined absolute text-[15px] top-[6px] ${isSelected ? 'text-[#94532f]' : 'text-[#3d5c47]'} font-bold select-none leading-none">
              ${venue.isFullyVegan ? 'spa' : 'restaurant'}
            </span>
          </div>
          <!-- Bóng chân ghim trên mặt đường -->
          <div class="w-3.5 h-1 rounded-full bg-black/30 blur-[1px] -mt-0.5 mx-auto"></div>
        </div>
      `;

      // Tạo DOM cho Popup
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-3 font-sans max-w-[270px] text-left text-[#2a2b27]';

      popupDiv.innerHTML = `
        ${
          venue.thumbnailUrl
            ? `<div class="mb-2 h-24 w-full overflow-hidden rounded-md bg-[#f7f3ee]">
                 <img src="${escapeHtml(venue.thumbnailUrl)}" alt="${escapeHtml(venue.name)}" class="h-full w-full object-cover" />
               </div>`
            : ''
        }
        <h4 class="mb-1 text-sm font-bold text-[#1e3326] leading-tight">${escapeHtml(venue.name)}</h4>
        <p class="mb-2 line-clamp-2 text-xs text-[#4b5048]">${escapeHtml(venue.address)}</p>
        <div class="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          ${
            hasRating
              ? `<span class="inline-flex items-center gap-0.5 font-semibold text-[#d97706]">
                   <span class="material-symbols-outlined text-[14px]">star</span>
                   ${formatNumber(ratingNum)}
                 </span>`
              : ''
          }
          ${
            distanceText
              ? `<span class="inline-flex items-center gap-0.5 text-[#636a60]">
                   <span class="material-symbols-outlined text-[14px]">near_me</span>
                   ${escapeHtml(distanceText)}
                 </span>`
              : ''
          }
          <span class="rounded-md px-2 py-0.5 text-[10px] font-semibold ${
            venue.isFullyVegan ? 'bg-[#e3f4ea] text-[#1e4620]' : 'bg-[#f8e3d6] text-[#7a4429]'
          }">
            ${venue.isFullyVegan ? 'Thuần chay' : 'Có món chay'}
          </span>
        </div>
        <div class="flex gap-2">
          <a
            href="${escapeHtml(venue.directionsUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#3d5c47] px-2.5 py-1.5 text-xs font-semibold text-white no-underline transition-colors hover:bg-[#2d4736] shadow-sm"
          >
            <span class="material-symbols-outlined text-[14px]">directions</span>
            Chỉ đường
          </a>
          <button
            type="button"
            class="popup-detail-btn inline-flex flex-1 items-center justify-center rounded-lg border border-[#cdd1c8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2a2b27] transition-colors hover:bg-[#f7f3ee] shadow-sm"
          >
            Chi tiết
          </button>
        </div>
      `;

      // Bắt sự kiện click nút Chi tiết trong popup
      const detailBtn = popupDiv.querySelector('.popup-detail-btn');
      if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(PATHS.VENUES.DETAIL(venue.venueId));
        });
      }

      // anchor: 'bottom' để mũi nhọn của ghim cắm chính xác vào tọa độ
      const popup = new PopupClass({ offset: [0, -36], closeButton: true, closeOnClick: false }).setDOMContent(popupDiv);

      el.addEventListener('click', () => {
        onSelectVenue?.(venue);
        if (!autoOpenPopup) {
          if (popup.isOpen()) {
            popup.remove();
          } else {
            popup.addTo(map);
          }
        }
      });

      const marker = new MarkerClass({ element: el, anchor: 'bottom' })
        .setLngLat([vLng, vLat])
        .setPopup(popup)
        .addTo(map);

      venueMarkersRef.current.set(venue.venueId, { marker, popup, el });
    });
  }, [state, venues, navigate, onSelectVenue, autoOpenPopup]);

  // FitBounds thông minh: bao trọn vòng tròn bán kính và tất cả marker quán chay.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;

    if (userLocation && radiusKm) {
      // Tìm quanh GPS: tính bounding box từ vòng tròn và mở rộng nếu có quán ngoài rìa
      const [sw, ne] = circleBBox(userLocation, radiusKm);
      let minLng = sw[0];
      let minLat = sw[1];
      let maxLng = ne[0];
      let maxLat = ne[1];

      venues.forEach((v) => {
        const vLat = v.latitude ?? v.lat;
        const vLng = v.longitude ?? v.lng;
        if (vLat != null && vLng != null && Number.isFinite(vLat) && Number.isFinite(vLng)) {
          minLng = Math.min(minLng, vLng);
          maxLng = Math.max(maxLng, vLng);
          minLat = Math.min(minLat, vLat);
          maxLat = Math.max(maxLat, vLat);
        }
      });

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 48, bottom: 48, left: 48, right: 48 },
          maxZoom: 15,
          duration: 800,
        }
      );
    } else if (venues.length > 0) {
      // Khi chỉ có đúng 1 quán (vd. trang VenueDetailPage): zoom cận cảnh cấp đường phố (street-level)
      if (venues.length === 1) {
        const single = venues[0];
        const sLat = single.latitude ?? single.lat;
        const sLng = single.longitude ?? single.lng;
        if (sLat != null && sLng != null && Number.isFinite(sLat) && Number.isFinite(sLng)) {
          const targetZoom = focus?.zoom ?? 16;
          map.resize();
          map.jumpTo({ center: [sLng, sLat], zoom: targetZoom });
        } else if (focus) {
          map.resize();
          map.jumpTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom });
        }
      } else {
        // Tìm theo tỉnh/thành: fit bounds theo danh sách nhiều quán tìm được
        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;
        let count = 0;

        venues.forEach((v) => {
          const vLat = v.latitude ?? v.lat;
          const vLng = v.longitude ?? v.lng;
          if (vLat != null && vLng != null && Number.isFinite(vLat) && Number.isFinite(vLng)) {
            minLng = Math.min(minLng, vLng);
            maxLng = Math.max(maxLng, vLng);
            minLat = Math.min(minLat, vLat);
            maxLat = Math.max(maxLat, vLat);
            count++;
          }
        });

        if (count > 1) {
          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            {
              padding: { top: 48, bottom: 48, left: 48, right: 48 },
              maxZoom: 14,
              duration: 800,
            }
          );
        } else if (count === 1) {
          map.jumpTo({ center: [minLng, minLat], zoom: focus?.zoom ?? 16 });
        } else if (focus) {
          map.flyTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom, essential: true });
        }
      }
    } else if (focus) {
      map.flyTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom, essential: true });
    } else {
      map.flyTo({ ...VIETNAM_VIEW, essential: true });
    }
  }, [state, userLocation, radiusKm, venues, focus]);

  // Làm nổi bật marker khi quán được chọn (click từ card hoặc marker khác).
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;

    venueMarkersRef.current.forEach(({ popup, el }, venueId) => {
      const isSelected = selectedVenueId === venueId;
      const badge = el.querySelector('.venue-pin-badge');
      const pinSvgPath = el.querySelector('.venue-pin-svg path');
      const pinIcon = el.querySelector('.venue-pin-icon');
      const pinWrapper = el.querySelector('.venue-pin-wrapper');

      if (isSelected) {
        badge?.classList.add('bg-[#94532f]', 'ring-2', 'ring-white', 'shadow-xl');
        badge?.classList.remove('bg-[#243b2c]');
        pinSvgPath?.setAttribute('fill', '#94532f');
        pinIcon?.classList.add('text-[#94532f]');
        pinIcon?.classList.remove('text-[#3d5c47]');
        pinWrapper?.classList.add('scale-125', 'z-30');
        pinWrapper?.classList.remove('hover:scale-110', 'z-20');

        if (autoOpenPopup) {
          popup.addTo(map);
        }

        const venue = venues.find((v) => v.venueId === venueId);
        const vLat = venue?.latitude ?? venue?.lat;
        const vLng = venue?.longitude ?? venue?.lng;
        if (vLat != null && vLng != null && Number.isFinite(vLat) && Number.isFinite(vLng)) {
          const targetZoom = focus?.zoom ?? (venues.length === 1 ? 16 : map.getZoom());
          map.easeTo({
            center: [vLng, vLat],
            zoom: targetZoom,
            offset: autoOpenPopup ? [0, -50] : [0, 0],
            duration: 500,
          });
        }
      } else {
        badge?.classList.remove('bg-[#94532f]', 'ring-2', 'ring-white', 'shadow-xl');
        badge?.classList.add('bg-[#243b2c]');
        pinSvgPath?.setAttribute('fill', '#3d5c47');
        pinIcon?.classList.remove('text-[#94532f]');
        pinIcon?.classList.add('text-[#3d5c47]');
        pinWrapper?.classList.remove('scale-125', 'z-30');
        pinWrapper?.classList.add('hover:scale-110', 'z-20');
        popup.remove();
      }
    });
  }, [state, selectedVenueId, venues, autoOpenPopup, focus]);

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-surface-container shadow-card', className)}>
      <style>{`
        @keyframes markerDrop {
          0% {
            transform: translateY(-24px) scale(0.65);
            opacity: 0;
          }
          65% {
            transform: translateY(3px) scale(1.04);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-marker-drop {
          animation: markerDrop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" aria-label="Bản đồ quán chay" />
      {/* z-10: nằm trên các nút điều khiển của bản đồ (z-index 2 trong CSS của Goong). */}
      {state === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container">
          <Icon name="progress_activity" className="animate-spin text-[32px] text-outline" />
        </div>
      )}
      {state !== 'loading' && state !== 'ready' && (
        <div className="absolute inset-0 z-10 bg-surface-container">
          {state === 'no-key' && (
            <Notice
              icon="map"
              title="Bản đồ chưa sẵn sàng"
              text={
                import.meta.env.DEV
                  ? 'Thêm VITE_GOONG_MAPTILES_KEY vào .env.local để hiển thị bản đồ Goong. Danh sách quán vẫn dùng được.'
                  : 'Bản đồ tạm thời chưa hiển thị được. Danh sách quán bên cạnh vẫn dùng được.'
              }
            />
          )}
          {state === 'unsupported' && (
            <Notice
              icon="browser_not_supported"
              title="Trình duyệt chưa hỗ trợ bản đồ"
              text="Trình duyệt này không bật WebGL nên không vẽ được bản đồ. Danh sách quán vẫn dùng được."
            />
          )}
          {state === 'failed' && (
            <Notice
              icon="cloud_off"
              title="Không tải được bản đồ Goong"
              text="Kiểm tra kết nối mạng hoặc Maptiles key của Goong. Danh sách quán vẫn dùng được."
            />
          )}
        </div>
      )}
    </div>
  );
};

