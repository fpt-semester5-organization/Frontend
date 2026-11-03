import type { CommunityFeedItem } from '../types/community.types';

const RECENT_KEY = 'veggielife_recent_community_items';

/**
 * Lưu trữ danh sách bài viết/công thức vừa được tạo trong phiên làm việc
 * để đảm bảo hiển thị tức thì ở vị trí số 1 trên http://localhost:3000/community bên NEWEST.
 */
export function getRecentCreatedItems(): CommunityFeedItem[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const items: CommunityFeedItem[] = JSON.parse(raw);
    // Chỉ giữ các mục tạo trong vòng 2 giờ
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return items.filter((item) => {
      if (!item.createdAt) return true;
      const t = new Date(item.createdAt).getTime();
      return Number.isNaN(t) || t > twoHoursAgo;
    });
  } catch {
    return [];
  }
}

export function addRecentCreatedItem(item: CommunityFeedItem) {
  try {
    const current = getRecentCreatedItems().filter(
      (existing) =>
        existing.key !== item.key &&
        existing.id !== item.id &&
        existing.title.trim().toLowerCase() !== item.title.trim().toLowerCase()
    );
    const updated = [item, ...current].slice(0, 10);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('vl_recent_item_added'));
  } catch {
    // Bỏ qua lỗi storage (private mode/quota)
  }
}

/**
 * Gỡ một mục theo `key` (POST-5, RECIPE-5): bài viết và công thức có thể trùng id nên không gỡ theo id.
 * Trả về mục đã gỡ để khôi phục khi thao tác thất bại.
 */
export function removeRecentCreatedItem(key: string): CommunityFeedItem | undefined {
  try {
    const current = getRecentCreatedItems();
    const removed = current.find((item) => item.key === key);
    if (!removed) return undefined;
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(current.filter((item) => item !== removed)));
    window.dispatchEvent(new Event('vl_recent_item_added'));
    return removed;
  } catch {
    return undefined;
  }
}

export function updateRecentCreatedItem(
  predicate: (item: CommunityFeedItem) => boolean,
  updater: (item: CommunityFeedItem) => CommunityFeedItem
) {
  try {
    const current = getRecentCreatedItems();
    const updated = current.map((item) => (predicate(item) ? updater(item) : item));
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('vl_recent_item_added'));
  } catch {
    // Bỏ qua lỗi storage
  }
}
