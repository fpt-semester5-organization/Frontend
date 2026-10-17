import { formatNumber } from '@/lib/format';
import type { LatLng } from '../types/venues.types';

/** 0.8 → "800 m", 1.25 → "1,3 km". */
export function formatDistance(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${formatNumber(Math.round(km * 10) / 10)} km`;
}

/**
 * Làm tròn tọa độ GPS trước khi dùng (4 chữ số ≈ 11 m): đủ cho bán kính tìm quán tính bằng km,
 * giảm độ chính xác của vị trí người dùng gửi đi (BR-AUTH-002).
 */
export const roundCoord = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Đa giác GeoJSON xấp xỉ vòng tròn bán kính tìm kiếm quanh vị trí người dùng. */
export function circlePolygon(center: LatLng, radiusKm: number, steps = 64) {
  const coordinates: [number, number][] = [];
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRad(center.lat)));
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    coordinates.push([center.lng + lngDelta * Math.cos(angle), center.lat + latDelta * Math.sin(angle)]);
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coordinates] },
  };
}

// --- Kiểm tra vị trí ngoài Việt Nam (BR-GUEST-06) ---
// Chỉ để báo sớm trên giao diện khi có GPS; BE mới là nơi quyết định (theo IP, ERR_GUEST_REGION_UNSUPPORTED).
// Ranh giới đất liền là đa giác gần đúng [vĩ độ, kinh độ]; điểm nằm ngoài đa giác nhưng cách biên dưới
// BORDER_BUFFER_KM vẫn coi là trong nước, để không báo nhầm với người ở sát biên giới.

const VIETNAM_OUTLINE: [number, number][] = [
  // Biên giới phía bắc (tây → đông)
  [22.4, 102.14], [22.7, 102.65], [22.55, 103.1], [22.5, 103.97], [22.88, 104.84], [23.39, 105.32],
  [23.1, 105.62], [22.86, 106.72], [22.3, 106.48], [21.97, 106.72], [21.75, 107.2], [21.58, 107.5],
  [21.53, 107.97], [21.45, 108.1],
  // Bờ biển phía đông (bắc → nam)
  [21.05, 107.75], [20.7, 107.15], [20.45, 106.75], [20.0, 106.3], [19.7, 105.95], [18.85, 105.8],
  [18.0, 106.55], [17.45, 106.75], [16.85, 107.25], [16.4, 107.95], [16.1, 108.35], [15.4, 109.2],
  [14.5, 109.15], [13.75, 109.35], [12.65, 109.55], [11.8, 109.3], [11.3, 109.05], [10.8, 108.35],
  [10.3, 107.2], [9.9, 106.75], [9.45, 106.3], [8.95, 105.65], [8.5, 104.75],
  // Bờ biển phía tây, Thổ Chu và Phú Quốc
  [9.0, 104.75], [9.1, 103.35], [10.5, 103.75], [10.42, 104.45],
  // Biên giới phía tây với Campuchia và Lào (nam → bắc)
  [10.65, 104.95], [10.95, 105.3], [11.05, 105.9], [11.15, 106.2], [11.75, 105.95], [12.0, 106.45],
  [12.2, 107.1], [12.4, 107.5], [13.2, 107.45], [13.9, 107.45], [14.7, 107.55], [15.5, 107.35],
  [16.15, 107.1], [16.62, 106.58], [17.68, 105.73], [18.35, 105.15], [19.4, 104.12], [19.85, 104.35],
  [20.4, 104.43], [20.85, 104.55], [20.65, 103.8], [21.05, 103.2], [21.24, 102.95], [21.7, 102.7],
  [22.15, 102.45],
];

/** Đảo xa bờ: [vĩ độ, kinh độ, bán kính km]. */
const VIETNAM_ISLANDS: [number, number, number][] = [
  [8.69, 106.61, 40], // Côn Đảo
  [10.52, 108.94, 25], // Phú Quý
  [20.13, 107.73, 25], // Bạch Long Vĩ
  [16.5, 111.8, 180], // Quần đảo Hoàng Sa
  [9.8, 114.0, 380], // Quần đảo Trường Sa
];

const BORDER_BUFFER_KM = 30;

function insideOutline(point: LatLng): boolean {
  let inside = false;
  for (let i = 0, j = VIETNAM_OUTLINE.length - 1; i < VIETNAM_OUTLINE.length; j = i, i += 1) {
    const [latI, lngI] = VIETNAM_OUTLINE[i];
    const [latJ, lngJ] = VIETNAM_OUTLINE[j];
    const crosses = latI > point.lat !== latJ > point.lat;
    if (crosses && point.lng < ((lngJ - lngI) * (point.lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
}

/** Khoảng cách (km) từ điểm tới đoạn thẳng AB, chiếu phẳng quanh điểm (đủ chính xác ở vài chục km). */
function distanceToSegmentKm(point: LatLng, a: [number, number], b: [number, number]): number {
  const kx = 111.32 * Math.cos(toRad(point.lat));
  const ky = 110.574;
  const ax = (a[1] - point.lng) * kx;
  const ay = (a[0] - point.lat) * ky;
  const bx = (b[1] - point.lng) * kx;
  const by = (b[0] - point.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** true khi tọa độ chắc chắn nằm ngoài lãnh thổ Việt Nam (kể cả các đảo). */
export function isOutsideVietnam(point: LatLng): boolean {
  if (insideOutline(point)) return false;
  if (VIETNAM_ISLANDS.some(([lat, lng, radius]) => haversineKm(point, { lat, lng }) <= radius)) return false;
  for (let i = 0; i < VIETNAM_OUTLINE.length; i += 1) {
    const next = VIETNAM_OUTLINE[(i + 1) % VIETNAM_OUTLINE.length];
    if (distanceToSegmentKm(point, VIETNAM_OUTLINE[i], next) <= BORDER_BUFFER_KM) return false;
  }
  return true;
}

/**
 * Tính Bounding Box [sw, ne] của vòng tròn bán kính tìm kiếm quanh tâm.
 * sw = [tây (minLng), nam (minLat)], ne = [đông (maxLng), bắc (maxLat)].
 */
export function circleBBox(center: LatLng, radiusKm: number): [[number, number], [number, number]] {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRad(center.lat)));
  return [
    [center.lng - lngDelta, center.lat - latDelta],
    [center.lng + lngDelta, center.lat + latDelta],
  ];
}

/** Trích xuất tọa độ {lat, lng} từ link Google Maps directionsUrl (vd. destination=10.77253,106.69124). */
export function coordsFromDirectionsUrl(url?: string | null): LatLng | null {
  if (!url) return null;
  const match = url.match(/destination=([0-9.-]+),([0-9.-]+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

