import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityFeedItem } from '../types/community.types';
import { addRecentCreatedItem, getRecentCreatedItems, removeRecentCreatedItem } from './recentFeedStore';

const item = (kind: 'POST' | 'RECIPE', id: number, title: string): CommunityFeedItem => ({
  key: `${kind}-${id}`,
  kind,
  id,
  title,
  voteCount: 0,
  createdAt: new Date().toISOString(),
});

describe('recentFeedStore.removeRecentCreatedItem', () => {
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
    sessionStorage.setItem('veggielife_recent_community_items', JSON.stringify([item('POST', 5, 'Bài năm'), item('RECIPE', 5, 'Công thức năm')]));
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
