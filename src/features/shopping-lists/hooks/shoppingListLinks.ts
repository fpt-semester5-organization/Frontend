import { useAuthStore } from '@/stores/auth.store';

/**
 * Liên kết thực đơn ↔ danh sách đi chợ nhớ trong trình duyệt (đã thống nhất 14/10/2026).
 * API chưa có: GET /meal-plans/{id} không trả shoppingListId, GET /shopping-lists/{id} không trả planId,
 * và 409 ERR_SHOPPING_LIST_EXISTS không kèm mã danh sách. Đã đề xuất Leader bổ sung; khi có thì bỏ file này.
 * Hạn chế: chỉ mở lại được trên trình duyệt đã tạo danh sách.
 */
interface Links {
  /** planId → listId */
  plans: Record<string, number>;
  /** listId → planId */
  lists: Record<string, number>;
}

const storageKey = () => `vl_shopping_links:${useAuthStore.getState().user?.userId ?? 'anonymous'}`;

function read(): Links {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) ?? 'null') as Links | null;
    return parsed && typeof parsed === 'object' ? { plans: parsed.plans ?? {}, lists: parsed.lists ?? {} } : { plans: {}, lists: {} };
  } catch {
    return { plans: {}, lists: {} };
  }
}

function write(links: Links) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(links));
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ mất khả năng mở lại danh sách sau này.
  }
}

export function rememberShoppingList(planId: number, listId: number) {
  const links = read();
  links.plans[planId] = listId;
  links.lists[listId] = planId;
  write(links);
}

export const listIdOfPlan = (planId: number): number | null => read().plans[planId] ?? null;
export const planIdOfList = (listId: number): number | null => read().lists[listId] ?? null;

/** Danh sách không còn mở được (404): bỏ liên kết cũ. */
export function forgetShoppingList(listId: number) {
  const links = read();
  const planId = links.lists[listId];
  delete links.lists[listId];
  if (planId !== undefined && links.plans[planId] === listId) delete links.plans[planId];
  write(links);
}
