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
