import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type {
  CreatedShoppingList,
  CreateShoppingListBody,
  PatchItemResult,
  PatchListBody,
  ShoppingList,
  ShoppingListStatus,
} from '../types/shoppingList.types';

/** POST /meal-plans/{id}/shopping-list — FN-MEAL-05 Sinh danh sách đi chợ từ thực đơn ACTIVE. */
export async function createShoppingList(planId: number, body: CreateShoppingListBody) {
  const res = await http.post<ApiEnvelope<CreatedShoppingList>>(`/meal-plans/${planId}/shopping-list`, body);
  return res.data;
}

/** GET /shopping-lists/{id} — FN-MEAL-06 Danh sách theo quầy kèm tiến độ mua. */
export async function getShoppingList(listId: number) {
  const res = await http.get<ApiEnvelope<ShoppingList>>(`/shopping-lists/${listId}`);
  return res.data.data;
}

/** PATCH /shopping-lists/{id}/items/{itemId} — đánh dấu đã mua. */
export async function setShoppingItemPurchased(listId: number, itemId: number, isPurchased: boolean) {
  const res = await http.patch<ApiEnvelope<PatchItemResult>>(`/shopping-lists/${listId}/items/${itemId}`, { isPurchased });
  return res.data.data;
}

/** PATCH /shopping-lists/{id} — hoàn tất hoặc hủy danh sách. */
export async function setShoppingListStatus(listId: number, status: PatchListBody['status']) {
  const res = await http.patch<ApiEnvelope<{ listId: number; status: ShoppingListStatus }>>(`/shopping-lists/${listId}`, {
    status,
  });
  return res.data;
}
