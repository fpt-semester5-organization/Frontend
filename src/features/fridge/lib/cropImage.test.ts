import { describe, expect, it } from 'vitest';
import {
  cropAllDetectedThumbnails,
  cropFromImageElement,
  isValidBox2D,
} from './cropImage';
import type { DetectedItem } from '../types/fridge.types';

describe('cropImage Utility Tests', () => {
  describe('isValidBox2D', () => {
    it('trả về true đối với toạ độ hợp lệ chuẩn hóa trong khoảng 0..1000', () => {
      expect(isValidBox2D([0, 0, 1000, 1000])).toBe(true);
      expect(isValidBox2D([145, 230, 420, 510])).toBe(true);
      expect(isValidBox2D([10, 50, 100, 200])).toBe(true);
    });

    it('trả về false đối với toạ độ vượt ngưỡng âm hoặc vượt 1000', () => {
      expect(isValidBox2D([-1, 0, 500, 500])).toBe(false);
      expect(isValidBox2D([0, -10, 500, 500])).toBe(false);
      expect(isValidBox2D([0, 0, 1001, 500])).toBe(false);
      expect(isValidBox2D([0, 0, 500, 1005])).toBe(false);
    });

    it('trả về false khi toạ độ bị đảo ngược ymin >= ymax hoặc xmin >= xmax', () => {
      expect(isValidBox2D([500, 100, 400, 300])).toBe(false); // ymin > ymax
      expect(isValidBox2D([100, 500, 300, 400])).toBe(false); // xmin > xmax
      expect(isValidBox2D([200, 200, 200, 400])).toBe(false); // ymin == ymax
      expect(isValidBox2D([100, 200, 300, 200])).toBe(false); // xmin == xmax
    });

    it('trả về false đối với dữ liệu không hợp lệ, mảng thiếu phần tử hoặc sai kiểu', () => {
      expect(isValidBox2D(null)).toBe(false);
      expect(isValidBox2D(undefined)).toBe(false);
      expect(isValidBox2D('invalid')).toBe(false);
      expect(isValidBox2D([100, 200, 300])).toBe(false); // chỉ có 3 phần tử
      expect(isValidBox2D([100, 200, 300, 400, 500])).toBe(false); // có 5 phần tử
      expect(isValidBox2D([100, '200', 300, 400] as unknown)).toBe(false); // chứa string
    });
  });

  describe('cropFromImageElement', () => {
    it('trả về null nếu box2d không hợp lệ', () => {
      const mockImg = { width: 800, height: 600, naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
      expect(cropFromImageElement(mockImg, [-1, 0, 100, 100])).toBeNull();
    });

    it('trả về null nếu ảnh có kích thước 0 px', () => {
      const mockImg = { width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
      expect(cropFromImageElement(mockImg, [100, 100, 200, 200])).toBeNull();
    });
  });

  describe('cropAllDetectedThumbnails', () => {
    it('trả về danh sách rỗng nếu đầu vào rỗng', async () => {
      const result = await cropAllDetectedThumbnails('fake-url', []);
      expect(result).toEqual([]);
    });

    it('giữ nguyên các mục không có box2d', async () => {
      const items: DetectedItem[] = [
        { name: 'Nấm rơm', freshnessStatus: 'FRESH', box2d: null },
        { name: 'Rau muống', freshnessStatus: 'NON-FRESH' },
      ];
      const result = await cropAllDetectedThumbnails('fake-url', items);
      expect(result).toEqual(items);
    });
  });
});
