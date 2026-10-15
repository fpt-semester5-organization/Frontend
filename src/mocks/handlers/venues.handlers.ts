import { http } from 'msw';
import { haversineKm } from '@/features/venues/lib/geo';
import { api, currentUser, fail, latency, ok, validationError } from '../utils';

// Mô phỏng FN-MAP-01 (docs/09. Task Cards) và FN-PROF-08 (GET /categories). Dữ liệu chỉ dùng khi dev.

const GUEST_RADIUS_KM = 5;
const GUEST_MAP_LIMIT = 3;
const MIN_MEMBER_RATING = 2.5;

/** Giả lập IP ngoài Việt Nam (BE thật kiểm tra theo IP, BR-GUEST-06). Bật/tắt ở bảng MSW. */
const FOREIGN_IP_KEY = 'vl_mock_foreign_ip';
export const mockForeignIp = {
  get: () => {
    try {
      return sessionStorage.getItem(FOREIGN_IP_KEY) === '1';
    } catch {
      return false;
    }
  },
  set: (value: boolean) => {
    try {
      if (value) sessionStorage.setItem(FOREIGN_IP_KEY, '1');
      else sessionStorage.removeItem(FOREIGN_IP_KEY);
    } catch {
      // Bỏ qua khi trình duyệt chặn lưu trữ.
    }
  },
};

/** Hạn mức tìm quán của Khách trong phiên mock (Redis guest_quota:{guestId}:map ở bản thật). */
const guestMap = { used: 0 };

const CATEGORIES = [
  { categoryId: 1, categoryName: 'Cơm chay', isCore: true },
  { categoryId: 2, categoryName: 'Bún, phở chay', isCore: true },
  { categoryId: 3, categoryName: 'Lẩu chay', isCore: true },
  { categoryId: 4, categoryName: 'Buffet chay', isCore: false },
  { categoryId: 5, categoryName: 'Món Âu chay', isCore: false },
  { categoryId: 6, categoryName: 'Bánh, đồ ăn vặt chay', isCore: false },
];

const cover = (background: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${background}"/><circle cx="84" cy="36" r="26" fill="${accent}" opacity="0.5"/><path d="M30 92c10-30 34-42 58-38-4 26-24 46-58 38z" fill="#ffffff" opacity="0.85"/></svg>`
  )}`;

interface MockVenue {
  venueId: number;
  name: string;
  address: string;
  /** Tên tỉnh/thành theo src/constants/provinces.ts (34 đơn vị từ 01/07/2025). */
  province: string;
  lat: number;
  lng: number;
  rating: number;
  isFullyVegan: boolean;
  categoryIds: number[];
  thumbnailUrl: string | null;
  isActive: boolean;
}

const VENUES: MockVenue[] = [
  // TP. Hồ Chí Minh
  { venueId: 301, name: 'Cơm chay Tâm An', address: '12 Lê Lợi, Phường Sài Gòn, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.7729, lng: 106.7015, rating: 4.6, isFullyVegan: true, categoryIds: [1], thumbnailUrl: cover('#dfeadf', '#4f6f58'), isActive: true },
  { venueId: 302, name: 'Bún chay Hoa Sen', address: '85 Nguyễn Trãi, Phường Bến Thành, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.769, lng: 106.693, rating: 4.3, isFullyVegan: true, categoryIds: [2], thumbnailUrl: cover('#f8e3d6', '#94532f'), isActive: true },
  { venueId: 303, name: 'Buffet chay Thiện Tâm', address: '210 Võ Văn Tần, Phường Xuân Hòa, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.7775, lng: 106.688, rating: 4.5, isFullyVegan: true, categoryIds: [4, 3], thumbnailUrl: null, isActive: true },
  { venueId: 304, name: 'Quán Cỏ Xanh', address: '45 Hai Bà Trưng, Phường Sài Gòn, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.7795, lng: 106.704, rating: 3.9, isFullyVegan: false, categoryIds: [1, 5], thumbnailUrl: cover('#f1ede8', '#7a4429'), isActive: true },
  { venueId: 305, name: 'Lẩu nấm chay An Nhiên', address: '120 Lý Chính Thắng, Phường Xuân Hòa, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.787, lng: 106.6855, rating: 4.1, isFullyVegan: true, categoryIds: [3], thumbnailUrl: cover('#e8e6df', '#636a60'), isActive: true },
  { venueId: 306, name: 'Bánh mì chay Mộc', address: '30 Phan Xích Long, Phường Cầu Kiệu, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.8005, lng: 106.6875, rating: 4.0, isFullyVegan: true, categoryIds: [6], thumbnailUrl: null, isActive: true },
  // Dưới 2.5 sao: Thành viên không thấy (BR-USR-11), Khách vẫn thấy.
  { venueId: 307, name: 'Cơm chay Phổ Quang', address: '300 Phổ Quang, Phường Tân Sơn Hòa, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.803, lng: 106.67, rating: 2.3, isFullyVegan: false, categoryIds: [1], thumbnailUrl: null, isActive: true },
  { venueId: 308, name: 'Chay Thủ Đức', address: '15 Võ Văn Ngân, Phường Thủ Đức, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.851, lng: 106.758, rating: 4.4, isFullyVegan: true, categoryIds: [1, 2], thumbnailUrl: cover('#bfd3c3', '#3d5c47'), isActive: true },
  // Admin đã ẩn: không bao giờ xuất hiện (BR-ADM-MAP-001).
  { venueId: 309, name: 'Quán chay đã đóng cửa', address: '1 Pasteur, Phường Sài Gòn, TP. Hồ Chí Minh', province: 'Hồ Chí Minh', lat: 10.775, lng: 106.7, rating: 4.0, isFullyVegan: true, categoryIds: [1], thumbnailUrl: null, isActive: false },
  // Hà Nội
  { venueId: 401, name: 'Nhà hàng chay Mộc Hương', address: '25 Hàng Bông, Phường Hoàn Kiếm, Hà Nội', province: 'Hà Nội', lat: 21.031, lng: 105.848, rating: 4.7, isFullyVegan: true, categoryIds: [1, 3], thumbnailUrl: cover('#dfeadf', '#4f6f58'), isActive: true },
  { venueId: 402, name: 'Phở chay Bồ Đề', address: '14 Lý Quốc Sư, Phường Hoàn Kiếm, Hà Nội', province: 'Hà Nội', lat: 21.03, lng: 105.849, rating: 4.2, isFullyVegan: true, categoryIds: [2], thumbnailUrl: null, isActive: true },
  { venueId: 403, name: 'Buffet chay Hương Thiền', address: '9 Phạm Ngọc Thạch, Phường Kim Liên, Hà Nội', province: 'Hà Nội', lat: 21.009, lng: 105.833, rating: 4.4, isFullyVegan: true, categoryIds: [4], thumbnailUrl: cover('#f8e3d6', '#bd7653'), isActive: true },
  { venueId: 404, name: 'Sen Xanh Bistro', address: '50 Trần Hưng Đạo, Phường Cửa Nam, Hà Nội', province: 'Hà Nội', lat: 21.024, lng: 105.847, rating: 3.6, isFullyVegan: false, categoryIds: [5], thumbnailUrl: null, isActive: true },
  // Đà Nẵng, Huế, Cần Thơ, Lâm Đồng
  { venueId: 501, name: 'Chay Tịnh Tâm', address: '100 Lê Duẩn, Phường Hải Châu, Đà Nẵng', province: 'Đà Nẵng', lat: 16.07, lng: 108.215, rating: 4.5, isFullyVegan: true, categoryIds: [1], thumbnailUrl: cover('#e6e2dd', '#4f6f58'), isActive: true },
  { venueId: 502, name: 'Bún chay Hòa Khánh', address: '22 Âu Cơ, Phường Hòa Khánh, Đà Nẵng', province: 'Đà Nẵng', lat: 16.075, lng: 108.15, rating: 3.8, isFullyVegan: true, categoryIds: [2], thumbnailUrl: null, isActive: true },
  { venueId: 601, name: 'Quán chay Liên Hoa', address: '3 Lê Quý Đôn, Phường Thuận Hóa, TP. Huế', province: 'Huế', lat: 16.46, lng: 107.592, rating: 4.6, isFullyVegan: true, categoryIds: [1, 6], thumbnailUrl: cover('#f2d2c0', '#94532f'), isActive: true },
  { venueId: 701, name: 'Cơm chay Ninh Kiều', address: '18 Hai Bà Trưng, Phường Ninh Kiều, TP. Cần Thơ', province: 'Cần Thơ', lat: 10.034, lng: 105.788, rating: 4.1, isFullyVegan: true, categoryIds: [1], thumbnailUrl: null, isActive: true },
  { venueId: 801, name: 'Lẩu chay Đà Lạt Xanh', address: '7 Nguyễn Chí Thanh, Phường Xuân Hương - Đà Lạt, Lâm Đồng', province: 'Lâm Đồng', lat: 11.942, lng: 108.438, rating: 4.3, isFullyVegan: true, categoryIds: [3], thumbnailUrl: cover('#bfd3c3', '#3d5c47'), isActive: true },
];

const categoryNames = (ids: number[]) =>
  ids.map((id) => CATEGORIES.find((item) => item.categoryId === id)?.categoryName).filter(Boolean) as string[];

const numberParam = (url: URL, key: string) => {
  const raw = url.searchParams.get(key);
  return raw === null || raw === '' ? undefined : Number(raw);
};

export const venuesHandlers = [
  // GET /categories — FN-PROF-08
  http.get(api('/categories'), async () => {
    await latency();
    return ok(CATEGORIES);
  }),

  // GET /venues/nearby — FN-MAP-01
  http.get(api('/venues/nearby'), async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const me = currentUser(request);
    const lat = numberParam(url, 'lat');
    const lng = numberParam(url, 'lng');
    const province = url.searchParams.get('province')?.trim() || undefined;
    const radiusKm = numberParam(url, 'radiusKm') ?? GUEST_RADIUS_KM;
    const categoryId = numberParam(url, 'categoryId');
    const page = numberParam(url, 'page') ?? 1;
    const size = numberParam(url, 'size') ?? 10;
    const hasCoords = lat !== undefined && lng !== undefined;

    // 1. Kiểm tra tham số
    const details: { field: string; message: string }[] = [];
    if (!hasCoords && !province) details.push({ field: 'province', message: 'Cần vị trí hiện tại hoặc tỉnh/thành.' });
    if (lat !== undefined && !(lat >= -90 && lat <= 90)) details.push({ field: 'lat', message: 'Vĩ độ trong khoảng -90…90.' });
    if (lng !== undefined && !(lng >= -180 && lng <= 180)) details.push({ field: 'lng', message: 'Kinh độ trong khoảng -180…180.' });
    if (province && province.length > 50) details.push({ field: 'province', message: 'Tỉnh/thành tối đa 50 ký tự.' });
    if (!me && radiusKm !== GUEST_RADIUS_KM) {
      details.push({ field: 'radiusKm', message: 'Khách chỉ tìm trong bán kính 5 km.' });
    } else if (me && !(radiusKm >= 1 && radiusKm <= 10)) {
      details.push({ field: 'radiusKm', message: 'Bán kính từ 1 đến 10 km.' });
    }
    if (!Number.isInteger(page) || page < 1) details.push({ field: 'page', message: 'page phải ≥ 1.' });
    if (!Number.isInteger(size) || size < 1 || size > 20) details.push({ field: 'size', message: 'size trong khoảng 1–20.' });
    if (details.length) return validationError(details);

    // 2. Ngoài Việt Nam (theo IP)
    if (mockForeignIp.get()) {
      return fail(403, 'ERR_GUEST_REGION_UNSUPPORTED', 'Dịch vụ bản đồ chưa hỗ trợ khu vực của bạn.');
    }
    // 3. Hạn mức của Khách
    if (!me && guestMap.used >= GUEST_MAP_LIMIT) {
      return fail(403, 'ERR_QUOTA_MAP_EXCEEDED', 'Bạn đã dùng hết 03 lượt tìm quán. Đăng ký để tìm không giới hạn.');
    }

    // 4–6. Lọc, tính khoảng cách, xếp hạng
    const origin = hasCoords ? { lat: lat!, lng: lng! } : null;
    const matches = VENUES.filter((venue) => venue.isActive)
      .filter((venue) => !me || venue.rating >= MIN_MEMBER_RATING)
      .filter((venue) => !categoryId || venue.categoryIds.includes(categoryId))
      .map((venue) => ({ venue, distanceKm: origin ? haversineKm(origin, venue) : null }))
      .filter(({ venue, distanceKm }) => (distanceKm !== null ? distanceKm <= radiusKm : venue.province === province));

    // Thành viên: kết hợp khoảng cách và điểm (BR-USR-11); Khách: gần nhất trước; theo tỉnh: điểm cao trước.
    const score = ({ venue, distanceKm }: (typeof matches)[number]) =>
      distanceKm === null ? -venue.rating : me ? distanceKm / radiusKm - venue.rating / 5 : distanceKm;
    matches.sort((a, b) => score(a) - score(b));

    // 7. Khách: chỉ trừ lượt khi có kết quả
    if (!me && matches.length > 0) guestMap.used += 1;

    const items = matches.slice((page - 1) * size, page * size).map(({ venue, distanceKm }) => ({
      venueId: venue.venueId,
      name: venue.name,
      address: venue.address,
      distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      rating: venue.rating,
      isFullyVegan: venue.isFullyVegan,
      thumbnailUrl: venue.thumbnailUrl,
      categories: categoryNames(venue.categoryIds),
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`,
    }));

    return ok(items, matches.length ? 'Tìm thấy quán chay quanh bạn.' : 'Không tìm thấy quán chay phù hợp.', 200, {
      page,
      size,
      total: matches.length,
      ...(origin ? { radiusKm } : {}),
      ...(!me ? { quota: { used: guestMap.used, limit: GUEST_MAP_LIMIT, remaining: GUEST_MAP_LIMIT - guestMap.used } } : {}),
    } as { page: number; size: number; total: number });
  }),
];
