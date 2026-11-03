import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/api/http';
import type { Paged } from '../api/community.api';
import { addRecentCreatedItem, getRecentCreatedItems } from '../lib/recentFeedStore';
import type { PostListItem } from '../types/community.types';
import { communityKeys } from './communityKeys';
import { useDeletePost } from './usePostMutations';

const post = (postId: number) => ({ postId, title: `Bài ${postId}` }) as PostListItem;
const paged = (ids: number[], page = 1): Paged<PostListItem> => ({ items: ids.map(post), meta: { page, size: 10, total: 12 } });

const PAGED_KEY = communityKeys.postList({ authorId: 1, page: 1, size: 10 });
const INFINITE_KEY = [...communityKeys.postLists(), 'infinite', { sort: 'NEWEST' }];
const DETAIL_KEY = communityKeys.post(5);

/** DELETE chờ test quyết định kết quả, để kiểm tra màn hình trước khi server trả lời. */
function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(PAGED_KEY, paged([5, 4]));
  queryClient.setQueryData<InfiniteData<Paged<PostListItem>>>(INFINITE_KEY, { pages: [paged([9, 8]), paged([5, 4], 2)], pageParams: [1, 2] });
  queryClient.setQueryData(DETAIL_KEY, post(5));
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useDeletePost(), { wrapper });
  let respond!: { resolve: (value: unknown) => void; reject: (error: unknown) => void };
  const server = new Promise((resolve, reject) => {
    respond = { resolve, reject };
  });
  vi.spyOn(http, 'delete').mockReturnValue(server as never);
  return { queryClient, invalidate, result, respond };
}

describe('useDeletePost', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('gỡ bài khỏi cả danh sách phân trang và cuộn vô hạn trước khi server trả lời', async () => {
    const { queryClient, result } = setup();
    act(() => result.current.mutate(5));
    await waitFor(() => expect(queryClient.getQueryData<Paged<PostListItem>>(PAGED_KEY)?.items.map((p) => p.postId)).toEqual([4]));
    expect(queryClient.getQueryData<Paged<PostListItem>>(PAGED_KEY)?.meta.total).toBe(11);
    const feed = queryClient.getQueryData<InfiniteData<Paged<PostListItem>>>(INFINITE_KEY);
    expect(feed?.pages.map((page) => page.items.map((p) => p.postId))).toEqual([[9, 8], [4]]);
    expect(feed?.pages.map((page) => page.meta.total)).toEqual([11, 11]);
    expect(http.delete).toHaveBeenCalledWith('/posts/5');
  });

  it('gỡ khỏi bài vừa tạo trong phiên, không gỡ công thức trùng id', async () => {
    addRecentCreatedItem({ key: 'RECIPE-5', kind: 'RECIPE', id: 5, title: 'Công thức năm', voteCount: 0 });
    sessionStorage.setItem(
      'veggielife_recent_community_items',
      JSON.stringify([{ key: 'POST-5', kind: 'POST', id: 5, title: 'Bài năm', voteCount: 0, moderationStatus: 'APPROVED_ACTIVE' }, ...getRecentCreatedItems()])
    );
    const { result } = setup();
    act(() => result.current.mutate(5));
    await waitFor(() => expect(getRecentCreatedItems().map((entry) => entry.key)).toEqual(['RECIPE-5']));
  });

  it('thành công: xóa cache chi tiết và tải lại danh sách', async () => {
    const { queryClient, invalidate, result, respond } = setup();
    act(() => result.current.mutate(5));
    await waitFor(() => expect(http.delete).toHaveBeenCalled());
    expect(queryClient.getQueryData(DETAIL_KEY)).toBeDefined();
    await act(async () => {
      respond.resolve({ data: { statusCode: 200, message: 'Đã xóa bài viết.', data: null } });
    });
    await waitFor(() => expect(queryClient.getQueryData(DETAIL_KEY)).toBeUndefined());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: communityKeys.postLists() });
  });

  it('xóa lỗi: khôi phục danh sách, chi tiết và bài vừa tạo', async () => {
    addRecentCreatedItem({ key: 'POST-5', kind: 'POST', id: 5, title: 'Bài năm', voteCount: 0, moderationStatus: 'APPROVED_ACTIVE' });
    const { queryClient, invalidate, result, respond } = setup();
    act(() => result.current.mutate(5));
    await waitFor(() => expect(getRecentCreatedItems()).toEqual([]));
    await act(async () => {
      respond.reject(new Error('500'));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Paged<PostListItem>>(PAGED_KEY)).toEqual(paged([5, 4]));
    expect(queryClient.getQueryData<InfiniteData<Paged<PostListItem>>>(INFINITE_KEY)?.pages[1]).toEqual(paged([5, 4], 2));
    expect(queryClient.getQueryData(DETAIL_KEY)).toBeDefined();
    expect(getRecentCreatedItems().map((entry) => entry.key)).toEqual(['POST-5']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: communityKeys.postLists() });
  });

  it('danh sách không chứa bài thì giữ nguyên, kể cả tổng số', async () => {
    const { queryClient, result } = setup();
    act(() => result.current.mutate(777));
    await waitFor(() => expect(http.delete).toHaveBeenCalled());
    expect(queryClient.getQueryData(PAGED_KEY)).toEqual(paged([5, 4]));
  });
});
