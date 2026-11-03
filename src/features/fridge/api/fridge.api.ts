import { http, unwrap, unwrapPaged } from '@/api/http';
import type { AddItemForm, EditItemForm } from '../schemas/fridge.schema';
import type {
  DetectedItem,
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
      thumbnailUrl: f.thumbnailUrl,
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
      thumbnailUrl: f.thumbnailUrl,
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
 * FN-VIS-03 — GET /fridge/recipes/suggestions
 * Gợi ý công thức từ nguyên liệu tủ lạnh ảo theo độ tương đồng giảm dần.
 */
export const listRecipeSuggestions = (
  minSimilarity?: number,
  limit?: number,
): Promise<RecipeSuggestion[]> =>
  unwrap<RecipeSuggestion[]>(
    http.get('/fridge/recipes/suggestions', {
      params: { minSimilarity, limit },
    }),
  );

/**
 * GET /ingredients?query=...
 * Tìm kiếm nhanh nguyên liệu chuẩn trong hệ thống để người dùng chọn khi thêm tủ.
 */
export const searchIngredients = (query: string): Promise<IngredientOption[]> =>
  unwrapPaged<IngredientOption>(
    http.get('/ingredients', { params: { search: query, pageSize: 20 } }),
  ).then((r) => r.items);

export interface LatestFridgeSession {
  sessionId: number;
  imageCdnUrl: string;
  detectedItemsCount: number;
  createdAt: string;
  detected: DetectedItem[];
}

/**
 * GET /fridge/sessions/latest
 * Lấy phiên quét nhận diện tủ lạnh gần nhất của thành viên hiện tại.
 */
export const getLatestFridgeSession = async (): Promise<LatestFridgeSession | null> => {
  try {
    return await unwrap<LatestFridgeSession>(http.get('/fridge/sessions/latest'));
  } catch {
    return null;
  }
};
