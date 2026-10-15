import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import {
  createShoppingList,
  getShoppingList,
  setShoppingItemPurchased,
  setShoppingListStatus,
} from '../api/shoppingLists.api';
import type { CreateShoppingListBody, PatchListBody, ShoppingList, ShoppingListStatus } from '../types/shoppingList.types';
import { rememberShoppingList } from './shoppingListLinks';

export const shoppingListKeys = {
  detail: (listId: number) => ['shopping-lists', listId] as const,
};

const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

const countProgress = (aisles: ShoppingList['aisles']) => {
  const items = aisles.flatMap((aisle) => aisle.items);
  return { purchased: items.filter((item) => item.isPurchased).length, total: items.length };
};

export function useShoppingList(listId: number) {
  return useQuery({
    queryKey: shoppingListKeys.detail(listId),
    queryFn: () => getShoppingList(listId),
    enabled: Number.isInteger(listId) && listId > 0,
    retry: retryServerErrorsOnce,
  });
}

/** Tạo danh sách từ thực đơn ACTIVE; nhớ liên kết thực đơn ↔ danh sách để mở lại sau. */
export function useCreateShoppingList(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShoppingListBody) => createShoppingList(planId, body),
    onSuccess: (res) => {
      const { listId, status, aisles } = res.data;
      rememberShoppingList(planId, listId);
      queryClient.setQueryData<ShoppingList>(shoppingListKeys.detail(listId), {
        listId,
        status,
        aisles,
        progress: countProgress(aisles),
      });
    },
  });
}

/** Đánh dấu đã mua: cập nhật ngay, lỗi thì trả lại; server tự hoàn tất danh sách khi đã mua đủ. */
export function useToggleShoppingItem(listId: number) {
  const queryClient = useQueryClient();
  const key = shoppingListKeys.detail(listId);
  const update = (change: (list: ShoppingList) => ShoppingList) =>
    queryClient.setQueryData<ShoppingList>(key, (list) => (list ? change(list) : list));
  const setPurchased = (itemId: number, isPurchased: boolean) =>
    update((list) => {
      const aisles = list.aisles.map((aisle) => ({
        ...aisle,
        items: aisle.items.map((item) => (item.itemId === itemId ? { ...item, isPurchased } : item)),
      }));
      return { ...list, aisles, progress: countProgress(aisles) };
    });

  return useMutation({
    mutationFn: ({ itemId, isPurchased }: { itemId: number; isPurchased: boolean }) =>
      setShoppingItemPurchased(listId, itemId, isPurchased),
    onMutate: async ({ itemId, isPurchased }) => {
      await queryClient.cancelQueries({ queryKey: key });
      setPurchased(itemId, isPurchased);
    },
    onError: (_error, { itemId, isPurchased }) => setPurchased(itemId, !isPurchased),
    onSuccess: (result) => update((list) => ({ ...list, status: result.listStatus as ShoppingListStatus })),
  });
}

export function useSetShoppingListStatus(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PatchListBody['status']) => setShoppingListStatus(listId, status),
    onSuccess: (res) =>
      queryClient.setQueryData<ShoppingList>(shoppingListKeys.detail(listId), (list) =>
        list ? { ...list, status: res.data.status } : list
      ),
  });
}
