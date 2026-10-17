import { describe, expect, it } from 'vitest';
import { circleBBox, circlePolygon, coordsFromDirectionsUrl, formatDistance, isOutsideVietnam } from './geo';

describe('geo utilities', () => {
  it('formatDistance định dạng mét và km chính xác', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(undefined)).toBeNull();
    expect(formatDistance(0.45)).toBe('450 m');
    expect(formatDistance(1.23)).toBe('1,2 km');
    expect(formatDistance(5)).toBe('5 km');
  });

  it('circleBBox tính toán bounding box chính xác quanh tọa độ', () => {
    const center = { lat: 10.7725, lng: 106.6912 };
    const radiusKm = 5;
    const [sw, ne] = circleBBox(center, radiusKm);

    // Kinh độ tây (sw[0]) phải nhỏ hơn kinh độ đông (ne[0])
    expect(sw[0]).toBeLessThan(center.lng);
    expect(ne[0]).toBeGreaterThan(center.lng);

    // Vĩ độ nam (sw[1]) phải nhỏ hơn vĩ độ bắc (ne[1])
    expect(sw[1]).toBeLessThan(center.lat);
    expect(ne[1]).toBeGreaterThan(center.lat);
  });

  it('circlePolygon tạo polygon GeoJSON khép kín', () => {
    const poly = circlePolygon({ lat: 10.8, lng: 106.7 }, 3, 16);
    expect(poly.type).toBe('Feature');
    expect(poly.geometry.type).toBe('Polygon');
    const ring = poly.geometry.coordinates[0];
    expect(ring.length).toBe(17); // 16 bước: i từ 0 đến 16 là 17 điểm
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0]);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1]);
  });

  it('coordsFromDirectionsUrl trích xuất vĩ độ và kinh độ từ link Google Maps', () => {
    expect(coordsFromDirectionsUrl(null)).toBeNull();
    expect(coordsFromDirectionsUrl('')).toBeNull();
    expect(coordsFromDirectionsUrl('https://example.com')).toBeNull();

    const parsed = coordsFromDirectionsUrl('https://www.google.com/maps/dir/?api=1&destination=10.77253,106.69124');
    expect(parsed).toEqual({ lat: 10.77253, lng: 106.69124 });
  });

  it('isOutsideVietnam nhận biết điểm trong và ngoài lãnh thổ Việt Nam', () => {
    // TP. Hồ Chí Minh thuộc Việt Nam
    expect(isOutsideVietnam({ lat: 10.7725, lng: 106.6912 })).toBe(false);
    // Hà Nội thuộc Việt Nam
    expect(isOutsideVietnam({ lat: 21.0285, lng: 105.8542 })).toBe(false);
    // Điểm tại châu Âu / Mỹ là ngoài Việt Nam
    expect(isOutsideVietnam({ lat: 48.8566, lng: 2.3522 })).toBe(true);
  });
});
