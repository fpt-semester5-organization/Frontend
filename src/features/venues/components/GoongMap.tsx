import React, { useEffect, useRef, useState } from 'react';
import type { Map as GoongMapInstance, Marker } from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { circlePolygon } from '../lib/geo';
import type { LatLng } from '../types/venues.types';

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

interface GoongMapProps {
  /** Vị trí cần bay tới (vị trí người dùng hoặc trung tâm tỉnh/thành đã chọn). */
  focus: MapFocus | null;
  /** Chấm vị trí người dùng; null khi tìm theo tỉnh/thành. */
  userLocation: LatLng | null;
  /** Vòng bán kính tìm kiếm quanh người dùng (km). */
  radiusKm: number | null;
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

/**
 * Bản đồ Goong (@goongmaps/goong-js, Maptiles key).
 * Chưa cắm marker quán: API GET /venues/nearby chưa trả tọa độ quán (chờ Leader bổ sung latitude/longitude).
 */
export const GoongMap: React.FC<GoongMapProps> = ({ focus, userLocation, radiusKm, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerClassRef = useRef<typeof Marker | null>(null);
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
        map = new goongjs.Map({ container: containerRef.current, style: GOONG_STYLE, ...VIETNAM_VIEW });
        map.addControl(new goongjs.NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => !cancelled && setState('ready'));
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
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Bay tới vị trí cần xem.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;
    if (focus) map.flyTo({ center: [focus.center.lng, focus.center.lat], zoom: focus.zoom, essential: true });
    else map.flyTo({ ...VIETNAM_VIEW, essential: true });
  }, [state, focus]);

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

  // Vòng bán kính tìm kiếm.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;
    const data =
      userLocation && radiusKm
        ? { type: 'FeatureCollection', features: [circlePolygon(userLocation, radiusKm)] }
        : { type: 'FeatureCollection', features: [] };
    const source = map.getSource(RADIUS_SOURCE);
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

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-surface-container shadow-card', className)}>
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
