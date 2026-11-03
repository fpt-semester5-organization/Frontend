import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRecentCreatedItem,
  getRecentCreatedItems,
  isAllowedInCommunityFeed,
  removeRecentCreatedItem,
} from './recentFeedStore';
import type { CommunityFeedItem } from '../types/community.types';

describe('recentFeedStore - Lọc bài viết vi phạm trên bảng tin cộng đồng', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const validPost: CommunityFeedItem = {
    key: 'POST-101',
    kind: 'POST',
    id: 101,
    title: 'Món ăn chay tôi yêu thích',
    voteCount: 0,
    moderationStatus: 'APPROVED_ACTIVE',
  };

  const quarantinedPost: CommunityFeedItem = {
    key: 'POST-102',
    kind: 'POST',
    id: 102,
    title: 'Bán hàng đa cấp giá 100k',
    voteCount: 0,
    moderationStatus: 'QUARANTINED_HIDDEN',
  };

  const rejectedPost: CommunityFeedItem = {
    key: 'POST-103',
    kind: 'POST',
    id: 103,
    title: 'Tôi muốn quánk đánh lộn',
    voteCount: 0,
    moderationStatus: 'REJECTED',
  };

  it('isAllowedInCommunityFeed xác định chính xác các trạng thái được phép và bị cấm', () => {
    expect(isAllowedInCommunityFeed(validPost)).toBe(true);
    expect(isAllowedInCommunityFeed(quarantinedPost)).toBe(false);
    expect(isAllowedInCommunityFeed(rejectedPost)).toBe(false);
    expect(isAllowedInCommunityFeed({ ...validPost, moderationStatus: 'PENDING_REVIEW' })).toBe(false);
    expect(isAllowedInCommunityFeed({ ...validPost, moderationStatus: 'DRAFT' })).toBe(false);
  });

  it('addRecentCreatedItem chỉ thêm bài viết hợp lệ, tuyệt đối không thêm bài vi phạm', () => {
    addRecentCreatedItem(validPost);
    expect(getRecentCreatedItems()).toHaveLength(1);
    expect(getRecentCreatedItems()[0].title).toBe('Món ăn chay tôi yêu thích');

    // Thử thêm bài vi phạm
    addRecentCreatedItem(quarantinedPost);
    addRecentCreatedItem(rejectedPost);

    const items = getRecentCreatedItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(101);
  });

  it('getRecentCreatedItems tự động dọn sạch bài vi phạm đã lưu trong sessionStorage', () => {
    // Giả lập sessionStorage đã lưu sẵn bài vi phạm từ phiên trước
    sessionStorage.setItem(
      'veggielife_recent_community_items',
      JSON.stringify([quarantinedPost, validPost, rejectedPost])
    );

    const cleanedItems = getRecentCreatedItems();
    expect(cleanedItems).toHaveLength(1);
    expect(cleanedItems[0].id).toBe(101);

    // Kiểm tra sessionStorage cũng được làm sạch
    const raw = JSON.parse(sessionStorage.getItem('veggielife_recent_community_items') || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(101);
  });

  it('removeRecentCreatedItem xóa đúng bài viết khớp điều kiện', () => {
    addRecentCreatedItem(validPost);
    expect(getRecentCreatedItems()).toHaveLength(1);

    removeRecentCreatedItem((item) => item.id === 101);
    expect(getRecentCreatedItems()).toHaveLength(0);
  });

  it('loại bỏ bài viết không có moderationStatus (dữ liệu cũ trong sessionStorage)', () => {
    const legacyPostWithoutStatus: CommunityFeedItem = {
      key: 'POST-999',
      kind: 'POST',
      id: 999,
      title: 'Bán hàng đa cấp giá 100k (cũ)',
      voteCount: 0,
    };
    expect(isAllowedInCommunityFeed(legacyPostWithoutStatus)).toBe(false);

    sessionStorage.setItem(
      'veggielife_recent_community_items',
      JSON.stringify([legacyPostWithoutStatus])
    );
    expect(getRecentCreatedItems()).toHaveLength(0);
    expect(sessionStorage.getItem('veggielife_recent_community_items')).toBe('[]');
  });
});
