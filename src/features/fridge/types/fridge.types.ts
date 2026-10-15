/**
 * Hợp đồng dữ liệu Tủ lạnh ảo (FN-VIS-01, FN-VIS-02, FN-VIS-03).
 */
export type Freshness = 'FRESH' | 'NON-FRESH';

export interface FridgeItem {
  inventoryId: number;
  ingredientId: number;
  name: string;
  freshnessStatus: Freshness;
}

export interface DetectedItem {
  inventoryId?: number | null;
  ingredientId?: number | null;
  name: string;
  freshnessStatus: Freshness;
}

export interface DetectionQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface DetectionResult {
  saved: boolean;
  detected: DetectedItem[];
  warnings?: string[];
  quota?: DetectionQuota | null;
}

export interface RecipeSuggestion {
  recipeId: number;
  title: string;
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
  width: number;
  height: number;
  reductionPercentage: number;
}
