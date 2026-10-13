import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { useRequireMember } from '@/hooks/useRequireMember';
import { SIGNUP_PROMPT_AT_ITEM, useSignupPromptAtItem } from '@/hooks/useSignupPromptAtItem';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { PostCard, PostFeedSkeleton } from '../components/PostCard';
import { PostListToolbar } from '../components/PostListToolbar';
import { usePostList } from '../hooks/usePosts';
import type { PostSort } from '../types/community.types';

const PAGE_SIZE = 10;

/** SCR-25 community/PostFeed — GET /posts (FN-POST-05). Khách xem được. */
const PostFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMember, requireMember } = useRequireMember();
  const promptRef = useSignupPromptAtItem<HTMLElement>();

  const keyword = searchParams.get('keyword')?.trim() ?? '';
  const sort: PostSort = searchParams.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const posts = usePostList({ keyword: keyword || undefined, sort, page, size: PAGE_SIZE });

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

  const goToPage = (nextPage: number) => {
    updateParams({ page: nextPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const writePost = () => requireMember(() => navigate(PATHS.COMMUNITY.NEW_POST));

  const sideLink =
    'flex items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-md no-underline shadow-card transition-shadow hover:shadow-card-hover';

  return (
    <div className="mx-auto w-full max-w-[1200px] px-margin-mobile py-space-lg sm:px-margin">
      <div className="grid gap-space-lg lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Tạo nội dung" className="flex flex-col gap-space-md sm:flex-row lg:sticky lg:top-24 lg:flex-col lg:self-start">
          <Button size="lg" className="w-full sm:w-auto lg:w-full" onClick={writePost}>
            <Icon name="edit_square" className="text-[20px]" />
            Viết bài mới
          </Button>
          {isMember ? (
            <Link to={PATHS.ME.POSTS} className={cn(sideLink, 'flex-1 lg:flex-none')}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
                <Icon name="article" />
              </span>
              <span className="font-label-md text-label-md text-on-surface">Bài viết của tôi</span>
              <Icon name="chevron_right" className="ml-auto text-[20px] text-outline" />
            </Link>
          ) : (
            <div className={cn(sideLink, 'flex-1 flex-col items-start gap-space-xs lg:flex-none')}>
              <p className="font-label-md text-label-md text-on-surface">Tham gia cộng đồng</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Đăng ký để thả tim, bình luận và chia sẻ hành trình ăn chay của bạn.
              </p>
            </div>
          )}
        </aside>

        <section aria-labelledby="community-title" className="flex min-w-0 max-w-[760px] flex-col gap-space-md">
          <h1 id="community-title" className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
            Cộng đồng
          </h1>

          <PostListToolbar
            keyword={keyword}
            sort={sort}
            onSearch={(value) => updateParams({ keyword: value })}
            onSortChange={(value) => updateParams({ sort: value })}
          />

          {posts.isPending ? (
            <PostFeedSkeleton />
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => posts.refetch()} retrying={posts.isRefetching} />
          ) : posts.data.items.length === 0 ? (
            keyword ? (
              <EmptyState
                icon="search_off"
                title="Không tìm thấy bài viết phù hợp"
                description={`Không có bài viết nào khớp với "${keyword}". Hãy thử từ khóa khác.`}
                action={<Button onClick={() => updateParams({ keyword: '' })}>Xóa tìm kiếm</Button>}
              />
            ) : (
              <EmptyState
                icon="forum"
                title="Chưa có bài viết"
                description="Hãy là người đầu tiên chia sẻ với cộng đồng."
                action={<Button onClick={writePost}>Viết bài</Button>}
              />
            )
          ) : (
            <>
              <p className="px-1 font-label-sm text-label-sm tabular-nums text-on-surface-variant" aria-live="polite">
                {formatNumber(posts.data.meta.total)} bài viết
              </p>
              <div
                className="flex flex-col gap-space-md transition-opacity aria-busy:opacity-60"
                aria-busy={posts.isPlaceholderData}
              >
                {posts.data.items.map((post, index) => (
                  <PostCard
                    key={post.postId}
                    post={post}
                    ref={index === SIGNUP_PROMPT_AT_ITEM - 1 ? promptRef : undefined}
                  />
                ))}
              </div>
              <Pagination
                page={posts.data.meta.page}
                size={posts.data.meta.size}
                total={posts.data.meta.total}
                onPageChange={goToPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default PostFeed;
