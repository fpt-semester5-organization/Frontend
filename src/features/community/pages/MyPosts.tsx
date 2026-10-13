import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { MyPostRow } from '../components/MyPostRow';
import { PostListToolbar } from '../components/PostListToolbar';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePostList } from '../hooks/usePosts';
import type { PostListItem, PostSort } from '../types/community.types';

const PAGE_SIZE = 10;

/**
 * SCR-28 community/MyPosts — GET /posts?authorId=<tôi> (FN-POST-05); chỉ hiện khi đã đăng nhập.
 * UNSPECIFIED: danh sách không trả moderationStatus/visibility nên chưa hiện được nhãn Nháp/Chờ duyệt.
 */
const MyPosts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, sessionStatus } = useAuthStore();
  const keyword = searchParams.get('keyword')?.trim() ?? '';
  const sort: PostSort = searchParams.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const posts = usePostList(
    { authorId: user?.userId, keyword: keyword || undefined, sort, page, size: PAGE_SIZE },
    { enabled: !!user }
  );
  const deletePost = useDeletePost();
  const [toDelete, setToDelete] = useState<PostListItem | null>(null);

  if (sessionStatus === 'restoring') return <PageLoader />;

  if (!user) {
    return (
      <EmptyState
        icon="edit_note"
        title="Bài viết của tôi"
        description="Đăng nhập để xem và quản lý bài viết của bạn."
        action={
          <>
            <Link
              to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.ME.POSTS)}
              className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
            >
              Đăng nhập
            </Link>
            <Link
              to={withReturnUrl(PATHS.AUTH.REGISTER, PATHS.ME.POSTS)}
              className="rounded-lg bg-surface-container px-5 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
            >
              Đăng ký
            </Link>
          </>
        }
      />
    );
  }

  const updateParams = (next: { keyword?: string; sort?: PostSort; page?: number }) => {
    const params = new URLSearchParams(searchParams);
    const merged = { keyword, sort, page: 1, ...next };
    if (merged.keyword) params.set('keyword', merged.keyword);
    else params.delete('keyword');
    if (merged.sort !== 'NEWEST') params.set('sort', merged.sort);
    else params.delete('sort');
    if (merged.page > 1) params.set('page', String(merged.page));
    else params.delete('page');
    setSearchParams(params);
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deletePost.mutate(toDelete.postId, {
      onSuccess: (res) => notifySuccess(res.message),
      onError: notifyApiError,
      onSettled: () => setToDelete(null),
    });
  };

  const items = posts.data?.items ?? [];
  const stats: { label: string; value: number | undefined; tone: string }[] = [
    { label: 'Tổng số bài', value: posts.data?.meta.total, tone: 'text-tertiary' },
    { label: 'Lượt thích (trang này)', value: posts.data ? items.reduce((n, p) => n + p.voteCount, 0) : undefined, tone: 'text-secondary' },
    { label: 'Bình luận (trang này)', value: posts.data ? items.reduce((n, p) => n + p.commentCount, 0) : undefined, tone: 'text-tertiary' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-margin-mobile py-space-xl sm:px-margin">
      <div className="mb-space-xl flex flex-col justify-between gap-space-lg md:flex-row md:items-end">
        <h1 className="font-headline-lg text-headline-lg-mobile tracking-tight text-tertiary sm:text-headline-lg">
          Bài viết của tôi
        </h1>
        <Button size="lg" onClick={() => navigate(PATHS.COMMUNITY.NEW_POST)}>
          <Icon name="edit_note" className="text-[20px]" />
          Viết bài mới
        </Button>
      </div>

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

      <div className="mb-space-lg rounded-xl bg-surface-container-lowest p-space-md shadow-card">
        <PostListToolbar
          keyword={keyword}
          sort={sort}
          placeholder="Tìm theo tiêu đề…"
          onSearch={(value) => updateParams({ keyword: value })}
          onSortChange={(value) => updateParams({ sort: value })}
        />
      </div>

      {posts.isPending ? (
        <div className="space-y-space-md" role="status" aria-busy="true" aria-label="Đang tải bài viết">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} retrying={posts.isRefetching} />
      ) : items.length === 0 ? (
        keyword ? (
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
            {items.map((post) => (
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
    </div>
  );
};

export default MyPosts;
