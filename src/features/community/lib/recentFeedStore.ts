import type { CommunityFeedItem } from '../types/community.types';

const RECENT_KEY = 'veggielife_recent_community_items';

/**
 * Kiểm tra xem một bài viết/công thức có đủ điều kiện hiển thị trên feed cộng đồng công khai hay không.
 * Đối với bài viết (POST) trong recent store: BẮT BUỘC phải có moderationStatus === 'APPROVED_ACTIVE'.
 * Bất kỳ bài viết nào bị tạm ẩn/khóa (QUARANTINED_HIDDEN), từ chối (REJECTED), chờ duyệt (PENDING_REVIEW),
 * bản nháp (DRAFT) HOẶC không có trường moderationStatus (dữ liệu cũ còn sót lại trong sessionStorage)
 * ĐỀU BỊ LOẠI BỎ TRIỆT ĐỂ VÀ TỰ ĐỘNG LÀM SẠCH KHỎI TRÌNH DUYỆT.
 */
export function isAllowedInCommunityFeed(item: CommunityFeedItem): boolean {
  if (item.kind === 'POST') {
    return item.moderationStatus === 'APPROVED_ACTIVE';
  }
  if (item.kind === 'RECIPE') {
    if (item.moderationStatus) {
      return item.moderationStatus === 'APPROVED_ACTIVE';
    }
    return true;
  }
  return false;
}

/**
 * Lưu trữ danh sách bài viết/công thức vừa được tạo trong phiên làm việc
 * để đảm bảo hiển thị tức thì ở vị trí số 1 trên http://localhost:3000/community bên NEWEST.
 */
export function getRecentCreatedItems(): CommunityFeedItem[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const items: CommunityFeedItem[] = JSON.parse(raw);
    // Chỉ giữ các mục tạo trong vòng 2 giờ và hợp lệ về kiểm duyệt
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const valid = items.filter((item) => {
      if (!isAllowedInCommunityFeed(item)) return false;
      if (!item.createdAt) return true;
      const t = new Date(item.createdAt).getTime();
      return Number.isNaN(t) || t > twoHoursAgo;
    });

    // Nếu phát hiện có bài viết vi phạm hoặc hết hạn, tự động làm sạch sessionStorage
    if (valid.length !== items.length) {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch {
    return [];
  }
}

export function addRecentCreatedItem(item: CommunityFeedItem) {
  try {
    // Nếu nội dung không hợp lệ hoặc đang bị tạm ẩn/khóa/kiểm duyệt vi phạm, tuyệt đối không thêm
    if (!isAllowedInCommunityFeed(item)) {
      removeRecentCreatedItem(
        (existing) =>
          existing.key === item.key ||
          existing.id === item.id ||
          existing.title.trim().toLowerCase() === item.title.trim().toLowerCase()
      );
      return;
    }

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

export function removeRecentCreatedItem(predicate: (item: CommunityFeedItem) => boolean) {
  try {
    const current = getRecentCreatedItems();
    const updated = current.filter((item) => !predicate(item));
    if (updated.length !== current.length) {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('vl_recent_item_added'));
    }
  } catch {
    // Bỏ qua lỗi storage
  }
}

export function updateRecentCreatedItem(
  predicate: (item: CommunityFeedItem) => boolean,
  updater: (item: CommunityFeedItem) => CommunityFeedItem
) {
  try {
    const current = getRecentCreatedItems();
    const updated = current
      .map((item) => (predicate(item) ? updater(item) : item))
      .filter(isAllowedInCommunityFeed);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('vl_recent_item_added'));
  } catch {
    // Bỏ qua lỗi storage
  }
}
