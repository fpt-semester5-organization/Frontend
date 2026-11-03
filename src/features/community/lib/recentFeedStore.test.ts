import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addRecentCreatedItem,
  getRecentCreatedItems,
  isAllowedInCommunityFeed,
  removeRecentCreatedItem,
} from './recentFeedStore';
import type { CommunityFeedItem } from '../types/community.types';

const item = (kind: 'POST' | 'RECIPE', id: number, title: string): CommunityFeedItem => ({
  key: `${kind}-${id}`,
  kind,
  id,
  title,
  voteCount: 0,
  createdAt: new Date().toISOString(),
  moderationStatus: 'APPROVED_ACTIVE',
});

describe('recentFeedStore.removeRecentCreatedItem theo key (dev)', () => {
  beforeEach(() => sessionStorage.clear());

  it('gỡ đúng mục theo key, trả về mục đã gỡ và báo cho feed cập nhật', () => {
    addRecentCreatedItem(item('POST', 5, 'Bài năm'));
    const listener = vi.fn();
    window.addEventListener('vl_recent_item_added', listener);
    expect(removeRecentCreatedItem('POST-5')?.title).toBe('Bài năm');
    window.removeEventListener('vl_recent_item_added', listener);
    expect(getRecentCreatedItems()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('không gỡ nhầm công thức trùng id với bài viết', () => {
    sessionStorage.setItem(
      'veggielife_recent_community_items',
      JSON.stringify([item('POST', 5, 'Bài năm'), item('RECIPE', 5, 'Công thức năm')])
    );
    removeRecentCreatedItem('POST-5');
    expect(getRecentCreatedItems().map((entry) => entry.key)).toEqual(['RECIPE-5']);
  });

  it('không có mục thì không báo gì', () => {
    const listener = vi.fn();
    window.addEventListener('vl_recent_item_added', listener);
    expect(removeRecentCreatedItem('POST-404')).toBeUndefined();
    window.removeEventListener('vl_recent_item_added', listener);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('recentFeedStore - Lọc bài viết vi phạm trên bảng tin cộng đồng (HEAD)', () => {
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
    title: 'Tôi muốn đánh lộn',
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
    sessionStorage.setItem(
      'veggielife_recent_community_items',
      JSON.stringify([quarantinedPost, validPost, rejectedPost])
    );

    const cleanedItems = getRecentCreatedItems();
    expect(cleanedItems).toHaveLength(1);
    expect(cleanedItems[0].id).toBe(101);

    const raw = JSON.parse(sessionStorage.getItem('veggielife_recent_community_items') || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(101);
  });

  it('removeRecentCreatedItem xóa đúng bài viết khớp điều kiện predicate', () => {
    addRecentCreatedItem(validPost);
    expect(getRecentCreatedItems()).toHaveLength(1);

    removeRecentCreatedItem((it) => it.id === 101);
    expect(getRecentCreatedItems()).toHaveLength(0);
  });
});
