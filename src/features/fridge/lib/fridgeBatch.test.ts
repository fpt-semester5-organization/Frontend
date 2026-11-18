import { describe, expect, it } from 'vitest';
import type { DetectedItem, FridgeBatchSaveResult } from '../types/fridge.types';
import { formatSaveSummary, isNonVegetarianMeat, toBatchItems } from './fridgeBatch';

const item = (name: string, extra: Partial<DetectedItem> = {}): DetectedItem => ({
  name,
  freshnessStatus: 'FRESH',
  ...extra,
});

const result = (over: Partial<FridgeBatchSaveResult>): FridgeBatchSaveResult => ({
  requested: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  items: [],
  skippedItems: [],
  ...over,
});

describe('isNonVegetarianMeat', () => {
  it('nhận ra thịt, xúc xích và đồ nguội', () => {
    expect(isNonVegetarianMeat(item('Thịt'))).toBe(true);
    expect(isNonVegetarianMeat(item('Xúc xích khô'))).toBe(true);
    expect(isNonVegetarianMeat(item('Giăm bông'))).toBe(true);
    expect(isNonVegetarianMeat(item('Nấm', { isRedMeat: true }))).toBe(true);
  });

  it('giữ lại đồ chay, trứng sữa và rau củ', () => {
    expect(isNonVegetarianMeat(item('Xúc xích chay'))).toBe(false);
    expect(isNonVegetarianMeat(item('Phô mai'))).toBe(false);
    expect(isNonVegetarianMeat(item('Trứng gà'))).toBe(false);
    expect(isNonVegetarianMeat(item('Cà chua'))).toBe(false);
  });
});

describe('toBatchItems', () => {
  it('bỏ đồ mặn, ghép số lượng vào tên và giữ mọi mục trùng để backend gộp', () => {
    const items = toBatchItems([
      item('Cà chua', { quantity: '1 hộp', ingredientId: 6 }),
      item('Cà chua', { quantity: '1 quả', freshnessStatus: 'NON-FRESH' }),
      item('Thịt', { quantity: '1 miếng' }),
    ]);

    expect(items).toEqual([
      { ingredientId: 6, customItemName: 'Cà chua (1 hộp)', freshnessStatus: 'FRESH', thumbnailUrl: undefined },
      { ingredientId: undefined, customItemName: 'Cà chua (1 quả)', freshnessStatus: 'NON-FRESH', thumbnailUrl: undefined },
    ]);
  });

  it('lấy ảnh từ cache khi mục chưa có thumbnail', () => {
    const [first] = toBatchItems([item('Gừng')], (name) => (name === 'Gừng' ? 'data:img' : null));
    expect(first.thumbnailUrl).toBe('data:img');
  });
});

describe('formatSaveSummary', () => {
  it('báo số dòng thật sự lưu, số món đã gộp và cộng cả món lọc ở client vào số bỏ qua', () => {
    expect(formatSaveSummary(result({ created: 21, updated: 1, skipped: 1 }), 43, 1)).toBe(
      'Đã lưu 22 nguyên liệu vào tủ lạnh (gộp từ 41 món nhận diện); 1 món đã có sẵn được cập nhật, 2 món đồ mặn bị bỏ qua.',
    );
  });

  it('không nhắc gộp khi số món bằng số dòng', () => {
    expect(formatSaveSummary(result({ created: 3 }), 3)).toBe('Đã lưu 3 nguyên liệu vào tủ lạnh.');
  });
});
