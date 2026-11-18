/**
 * Hợp đồng dữ liệu Tủ lạnh ảo (FN-VIS-01, FN-VIS-02, FN-VIS-03).
 */
export type Freshness = 'FRESH' | 'NON-FRESH';

export interface FridgeItem {
  inventoryId: number;
  ingredientId: number;
  name: string;
  freshnessStatus: Freshness;
  thumbnailUrl?: string | null;
}

export interface DetectedItem {
  inventoryId?: number | null;
  ingredientId?: number | null;
  name: string;
  quantity?: string | null;
  freshnessStatus: Freshness;
  box2d?: [number, number, number, number] | null;
  thumbnailUrl?: string | null;
  confidence?: number;
  foodGroup?: string | null;
  isAnimalProduct?: boolean;
  isRedMeat?: boolean;
}

export interface DetectionQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface DetectionResult {
  saved: boolean;
  /** Mã phiên nhận diện (chỉ Thành viên) — gửi lại khi lưu hàng loạt để gắn Session_ID. */
  sessionId?: number | null;
  detected: DetectedItem[];
  warnings?: string[];
  quota?: DetectionQuota | null;
}

export interface FridgeBatchItem {
  ingredientId?: number;
  customItemName: string;
  freshnessStatus: Freshness;
  thumbnailUrl?: string;
}

export interface FridgeBatchSaveResult {
  requested: number;
  created: number;
  updated: number;
  skipped: number;
  items: FridgeItem[];
  skippedItems: { name: string; reason: 'NON_VEGETARIAN' | 'INVALID_NAME' }[];
}

export interface RecipeSuggestion {
  recipeId: number;
  title: string;
  imageUrl?: string | null;
  similarity: number;
  missingIngredients: { ingredientId: number; name: string }[];
  usesNonFreshItems: boolean;
}

export interface IngredientOption {
  ingredientId: number;
  name: string;
  standardUnit?: string;
  foodGroup?: string;
}

export interface ImageOptimizationResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  width?: number;
  height?: number;
  reductionPercentage?: number;
}
