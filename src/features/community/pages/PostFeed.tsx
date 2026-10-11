import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PenSquare, SearchX, Users } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useRequireMember } from '@/hooks/useRequireMember';
import { SIGNUP_PROMPT_AT_ITEM, useSignupPromptAtItem } from '@/hooks/useSignupPromptAtItem';
import { PATHS } from '@/routes/paths';
import { PostCard, PostGridSkeleton } from '../components/PostCard';
import { PostListToolbar } from '../components/PostListToolbar';
import { usePostList } from '../hooks/usePosts';
import type { PostSort } from '../types/community.types';

const PAGE_SIZE = 10;

/** SCR-25 community/PostFeed — GET /posts (FN-POST-05). Khách xem được. */
const PostFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requireMember } = useRequireMember();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cộng đồng</h1>
          <p className="mt-1 text-sm text-gray-600">
            Câu chuyện, kinh nghiệm và mẹo nấu ăn chay từ các thành viên VeggieLife.
          </p>
        </div>
        <Button onClick={writePost}>
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          Viết bài
        </Button>
      </div>

      <PostListToolbar
        keyword={keyword}
        sort={sort}
        onSearch={(value) => updateParams({ keyword: value })}
        onSortChange={(value) => updateParams({ sort: value })}
      />

      {posts.isPending ? (
        <PostGridSkeleton />
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} retrying={posts.isRefetching} />
      ) : posts.data.items.length === 0 ? (
        keyword ? (
          <EmptyState
            icon={SearchX}
            title="Không tìm thấy bài viết phù hợp"
            description={`Không có bài viết nào khớp với "${keyword}". Hãy thử từ khóa khác.`}
            action={
              <Button variant="secondary" onClick={() => updateParams({ keyword: '' })}>
                Xóa tìm kiếm
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Chưa có bài viết nào"
            description="Hãy là người đầu tiên chia sẻ hành trình ăn chay của bạn."
            action={<Button onClick={writePost}>Viết bài đầu tiên</Button>}
          />
        )
      ) : (
        <>
          <p className="text-sm text-gray-500" aria-live="polite">
            {posts.data.meta.total} bài viết
          </p>
          <div
            className="grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 aria-busy:opacity-60"
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
    </div>
  );
};

export default PostFeed;
