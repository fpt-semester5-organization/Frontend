import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePostList } from '../hooks/usePosts';
import type { PostListItem, PostSort } from '../types/community.types';
import { MyPostRow } from './MyPostRow';
import { PostListToolbar } from './PostListToolbar';

const PAGE_SIZE = 10;

interface StatusTab {
  id: string;
  label: string;
  value?: string;
  icon: string;
}

const STATUS_TABS: StatusTab[] = [
  { id: 'ALL', label: 'Tất cả', icon: 'view_list' },
  { id: 'APPROVED', label: 'Đã duyệt', value: 'APPROVED_ACTIVE', icon: 'check_circle' },
  { id: 'PENDING', label: 'Chờ duyệt', value: 'PENDING_REVIEW', icon: 'hourglass_empty' },
  { id: 'DRAFT', label: 'Bản nháp', value: 'DRAFT', icon: 'edit_note' },
  { id: 'HIDDEN', label: 'Bị ẩn / Khóa', value: 'QUARANTINED_HIDDEN', icon: 'visibility_off' },
];

/**
 * Tab "Bài viết" của Nội dung của tôi (SCR-28): GET /posts?authorId=<tôi>&status=<status> (FN-POST-05).
 * Hỗ trợ xem trạng thái bài viết (Đã duyệt, Chờ duyệt, Bản nháp, Bị ẩn/Khóa) và phân loại linh hoạt.
 */
export const MyPostsPanel: React.FC<{ userId: number }> = ({ userId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword')?.trim() ?? '';
  const sort: PostSort = searchParams.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST';
  const status = searchParams.get('status')?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const posts = usePostList({
    authorId: userId,
    keyword: keyword || undefined,
    sort,
    page,
    size: PAGE_SIZE,
  });
  const deletePost = useDeletePost();
  const [toDelete, setToDelete] = useState<PostListItem | null>(null);

  const updateParams = (next: { keyword?: string; sort?: PostSort; page?: number; status?: string }) => {
    const params = new URLSearchParams(searchParams);
    const merged = { keyword, sort, status, page, ...next };
    if (merged.keyword) params.set('keyword', merged.keyword);
    else params.delete('keyword');
    if (merged.sort !== 'NEWEST') params.set('sort', merged.sort);
    else params.delete('sort');
    if (merged.status) params.set('status', merged.status);
    else params.delete('status');
    if (merged.page > 1) params.set('page', String(merged.page));
    else params.delete('page');
    setSearchParams(params);
  };

  // Dòng đã biến mất ngay (cập nhật lạc quan) nên đóng hộp thoại luôn. Dùng promise để vẫn báo kết quả nếu người dùng đã rời trang.
  const handleDelete = () => {
    if (!toDelete) return;
    setToDelete(null);
    deletePost.mutateAsync(toDelete.postId).then((res) => notifySuccess(res.message), notifyApiError);
  };

  const allItems = posts.data?.items ?? [];

  // Xóa hết bài ở trang cuối: lùi về trang còn dữ liệu, không báo nhầm "Bạn chưa đăng bài nào".
  const lastPage = posts.data ? Math.max(1, Math.ceil(posts.data.meta.total / PAGE_SIZE)) : page;
  useEffect(() => {
    if (page <= lastPage) return;
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (lastPage > 1) params.set('page', String(lastPage));
        else params.delete('page');
        return params;
      },
      { replace: true }
    );
  }, [page, lastPage, setSearchParams]);

  // Lọc bài viết hoàn toàn ở Frontend theo trạng thái đã chọn
  const filteredItems = React.useMemo(() => {
    if (!status) return allItems;
    if (status === 'QUARANTINED_HIDDEN') {
      return allItems.filter(
        (p) => p.moderationStatus === 'QUARANTINED_HIDDEN' || p.moderationStatus === 'REJECTED'
      );
    }
    return allItems.filter((p) => p.moderationStatus === status);
  }, [allItems, status]);

  // Đếm số lượng bài viết theo từng trạng thái tại Frontend
  const counts = React.useMemo(() => {
    return {
      ALL: allItems.length,
      APPROVED: allItems.filter((p) => p.moderationStatus === 'APPROVED_ACTIVE').length,
      PENDING: allItems.filter((p) => p.moderationStatus === 'PENDING_REVIEW').length,
      DRAFT: allItems.filter((p) => p.moderationStatus === 'DRAFT').length,
      HIDDEN: allItems.filter(
        (p) => p.moderationStatus === 'QUARANTINED_HIDDEN' || p.moderationStatus === 'REJECTED'
      ).length,
    };
  }, [allItems]);

  const stats: { label: string; value: number | undefined; tone: string }[] = [
    { label: 'Tổng số bài', value: posts.data?.meta.total, tone: 'text-tertiary' },
    { label: 'Lượt thích (trang này)', value: posts.data ? filteredItems.reduce((n, p) => n + p.voteCount, 0) : undefined, tone: 'text-secondary' },
    { label: 'Bình luận (trang này)', value: posts.data ? filteredItems.reduce((n, p) => n + p.commentCount, 0) : undefined, tone: 'text-tertiary' },
  ];

  return (
    <>
      <dl className="mb-space-xl grid grid-cols-1 gap-space-md sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface-container-lowest p-space-md shadow-card">
            <dt className="font-label-sm text-label-sm text-outline">{stat.label}</dt>
            <dd className={`mt-0.5 font-headline-md text-headline-md font-bold tabular-nums ${stat.tone}`}>
              {stat.value === undefined ? '-' : formatNumber(stat.value)}
            </dd>
          </div>
        ))}
      </dl>

      {/* Bộ lọc trạng thái bài viết (Status Filter Tabs) */}
      <div className="mb-space-lg flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const isActive = (tab.value ?? '') === status;
          const count = counts[tab.id as keyof typeof counts];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateParams({ status: tab.value ?? '' })}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-label-md text-label-md font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/20'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface shadow-xs'
              }`}
            >
              <Icon name={tab.icon} className="text-[18px]" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-label-sm font-bold ${
                    isActive ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-space-lg rounded-xl bg-surface-container-lowest p-space-md shadow-card">
        <PostListToolbar
          keyword={keyword}
          sort={sort}
          placeholder="Tìm theo tiêu đề…"
          onSearch={(value) => updateParams({ keyword: value })}
          onSortChange={(value) => updateParams({ sort: value })}
        />
      </div>

      {posts.isPending || page > lastPage ? (
        <div className="space-y-space-md" role="status" aria-busy="true" aria-label="Đang tải bài viết">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} retrying={posts.isRefetching} />
      ) : filteredItems.length === 0 ? (
        status ? (
          <EmptyState
            icon="filter_alt_off"
            title="Không có bài viết nào ở trạng thái này"
            description="Bạn chưa có bài viết nào thuộc mục trạng thái đã chọn."
            action={<Button onClick={() => updateParams({ status: '' })}>Xem tất cả bài viết</Button>}
          />
        ) : keyword ? (
          <EmptyState
            icon="search_off"
            title="Không tìm thấy bài viết phù hợp"
            description="Thử từ khóa khác hoặc xóa tìm kiếm."
            action={<Button onClick={() => updateParams({ keyword: '' })}>Xóa tìm kiếm</Button>}
          />
        ) : (
          <EmptyState
            icon="edit_note"
            title="Bạn chưa đăng bài nào"
            description="Chia sẻ trải nghiệm ẩm thực đầu tiên với cộng đồng."
            action={<Button onClick={() => navigate(PATHS.COMMUNITY.NEW_POST)}>Viết bài</Button>}
          />
        )
      ) : (
        <>
          <div className="space-y-space-md">
            {filteredItems.map((post) => (
              <MyPostRow key={post.postId} post={post} onDelete={setToDelete} />
            ))}
          </div>
          <Pagination
            page={posts.data.meta.page}
            size={posts.data.meta.size}
            total={posts.data.meta.total}
            onPageChange={(next) => {
              updateParams({ page: next });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      <ConfirmDialog
        show={toDelete !== null}
        title="Xóa bài viết?"
        message={
          <>
            Bài <strong className="text-on-surface">{toDelete?.title}</strong> sẽ bị xóa khỏi cộng đồng cùng với bình luận
            và lượt thả tim. Bạn không thể hoàn tác thao tác này.
          </>
        }
        confirmLabel="Xóa bài viết"
        danger
        loading={deletePost.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
};
