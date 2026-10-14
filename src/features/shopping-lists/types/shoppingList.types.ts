import type { DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

type CreatedList = DeepRequired<Schemas['CreateMealPlanShoppingListResponse']['data']>;

/** 4 quầy hàng (Ingredients.Default_Stall_Type, D74). */
export type AisleCode = 'PRODUCE' | 'CONDIMENTS' | 'DRY_GOODS' | 'PLANT_PROTEIN';
export type ShoppingItem = CreatedList['aisles'][number]['items'][number];
export type ShoppingAisle = { aisle: AisleCode | string; items: ShoppingItem[] };

export type ShoppingListStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/** POST /meal-plans/{id}/shopping-list (FN-MEAL-05). */
export type CreateShoppingListBody = Schemas['CreateMealPlanShoppingListRequest'];
export type CreatedShoppingList = Omit<CreatedList, 'aisles' | 'status'> & {
  status: ShoppingListStatus;
  aisles: ShoppingAisle[];
};

/**
 * GET /shopping-lists/{id} (FN-MEAL-06).
 * UNSPECIFIED: phần tử aisles[] để trống trong OpenAPI; đọc theo cấu trúc của POST /meal-plans/{id}/shopping-list.
 * Không có planId: mã thực đơn lấy từ liên kết FE đã nhớ (xem hooks/shoppingListLinks.ts).
 */
export type ShoppingList = {
  listId: number;
  status: ShoppingListStatus;
  progress: { purchased: number; total: number };
  aisles: ShoppingAisle[];
};

/** PATCH /shopping-lists/{id}/items/{itemId}. */
export type PatchItemResult = DeepRequired<Schemas['PatchShoppingListItemResponse']['data']>;
/** PATCH /shopping-lists/{id}. */
export type PatchListBody = Schemas['PatchShoppingListRequest'];
