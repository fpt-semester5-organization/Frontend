import { http, unwrap, unwrapPaged } from '@/api/http';
import type { AddItemForm, EditItemForm } from '../schemas/fridge.schema';
import type {
  DetectionResult,
  Freshness,
  FridgeItem,
  IngredientOption,
  RecipeSuggestion,
} from '../types/fridge.types';

export const AI_DETECTION_TIMEOUT_MS = 35000;

/**
 * FN-VIS-01 — POST /fridge/detections (multipart/form-data, trường `image`).
 * Thành viên: kết quả tự động lưu vào tủ lạnh ảo.
 * Khách: xem thử kết quả không lưu, trừ vào 3 lượt dùng thử AI.
 */
export const createDetection = (image: File): Promise<DetectionResult> => {
  const body = new FormData();
  body.append('image', image);
  return unwrap<DetectionResult>(
    http.post('/fridge/detections', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: AI_DETECTION_TIMEOUT_MS,
    }),
  );
};

/**
 * FN-VIS-02 — GET /fridge/items
 * Xem danh sách nguyên liệu trong tủ lạnh ảo (lọc theo độ tươi nếu có).
 */
export const listFridgeItems = (freshness?: Freshness): Promise<FridgeItem[]> =>
  unwrap<FridgeItem[]>(http.get('/fridge/items', { params: { freshness } }));

/**
 * FN-VIS-02 — POST /fridge/items
 * Thêm thủ công một nguyên liệu vào tủ lạnh ảo.
 */
export const createFridgeItem = (f: AddItemForm): Promise<FridgeItem> =>
  unwrap<FridgeItem>(
    http.post('/fridge/items', {
      ingredientId: f.ingredientId,
      customItemName: f.customItemName?.trim() || undefined,
      freshnessStatus: f.freshnessStatus ?? 'FRESH',
    }),
  );

/**
 * FN-VIS-02 — PUT /fridge/items/{id}
 * Cập nhật tên hiển thị và độ tươi (FRESH / NON-FRESH) của nguyên liệu trong tủ.
 */
export const updateFridgeItem = (id: number, f: EditItemForm): Promise<FridgeItem> =>
  unwrap<FridgeItem>(
    http.put(`/fridge/items/${id}`, {
      customItemName: f.customItemName?.trim() || undefined,
      freshnessStatus: f.freshnessStatus,
    }),
  );

/**
 * FN-VIS-02 — DELETE /fridge/items/{id}
 * Xóa nguyên liệu khỏi tủ lạnh ảo.
 */
export const deleteFridgeItem = async (id: number): Promise<void> => {
  await http.delete(`/fridge/items/${id}`);
};

/**
 * FN-VIS-03 — GET /fridge/recipe-suggestions
 * Gợi ý công thức dựa trên nguyên liệu trong tủ lạnh (độ tương đồng ≥ 70%).
 */
export const listRecipeSuggestions = (
  minSimilarity = 0.7,
  limit = 10,
): Promise<RecipeSuggestion[]> =>
  unwrap<RecipeSuggestion[]>(
    http.get('/fridge/recipe-suggestions', {
      params: { minSimilarity, limit },
    }),
  );

/**
 * FN-PROF-08 — Tra cứu danh mục nguyên liệu để thêm thủ công vào tủ.
 */
export async function searchIngredients(keyword: string): Promise<IngredientOption[]> {
  const paged = await unwrapPaged<IngredientOption>(
    http.get('/ingredients', {
      params: { keyword: keyword.trim() || undefined, page: 1, size: 20 },
    }),
  );
  return paged.items;
}
