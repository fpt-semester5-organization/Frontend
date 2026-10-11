import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, LogIn, Pencil, PenSquare, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { PostCard, PostGridSkeleton } from '../components/PostCard';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePostList } from '../hooks/usePosts';
import type { PostListItem } from '../types/community.types';

const PAGE_SIZE = 10;

const linkButton =
  'inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

/**
 * SCR-28 community/MyPosts — GET /posts?authorId=<tôi> (FN-POST-05); chỉ hiện khi đã đăng nhập.
 * UNSPECIFIED: danh sách không trả moderationStatus/visibility nên chưa hiện được nhãn Nháp/Chờ duyệt.
 */
const MyPosts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, sessionStatus } = useAuthStore();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const posts = usePostList(
    { authorId: user?.userId, sort: 'NEWEST', page, size: PAGE_SIZE },
    { enabled: !!user }
  );
  const deletePost = useDeletePost();
  const [toDelete, setToDelete] = useState<PostListItem | null>(null);

  if (sessionStatus === 'restoring') return <PageLoader />;

  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="Đăng nhập để xem bài viết của bạn"
        description="Bài viết bạn đã đăng, bản nháp và bài riêng tư sẽ hiển thị ở đây."
        action={
          <>
            <Link to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.ME.POSTS)} className={`${linkButton} bg-brand-600 text-white hover:bg-brand-700`}>
              Đăng nhập
            </Link>
            <Link
              to={withReturnUrl(PATHS.AUTH.REGISTER, PATHS.ME.POSTS)}
              className={`${linkButton} bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50`}
            >
              Đăng ký
            </Link>
          </>
        }
      />
    );
  }

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) params.set('page', String(nextPage));
    else params.delete('page');
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deletePost.mutate(toDelete.postId, {
      onSuccess: (res) => notifySuccess(res.message),
      onError: notifyApiError,
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài viết của tôi</h1>
          <p className="mt-1 text-sm text-gray-600">Quản lý các bài bạn đã chia sẻ với cộng đồng.</p>
        </div>
        <Button onClick={() => navigate(PATHS.COMMUNITY.NEW_POST)}>
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          Viết bài mới
        </Button>
      </div>

      {posts.isPending ? (
        <PostGridSkeleton count={3} />
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} retrying={posts.isRefetching} />
      ) : posts.data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Bạn chưa có bài viết nào"
          description="Chia sẻ trải nghiệm ăn chay, mẹo nấu ăn hay câu chuyện của bạn với cộng đồng."
          action={<Button onClick={() => navigate(PATHS.COMMUNITY.NEW_POST)}>Viết bài đầu tiên</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.data.items.map((post) => (
              <PostCard
                key={post.postId}
                post={post}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Sửa bài "${post.title}"`}
                      onClick={() => navigate(PATHS.COMMUNITY.EDIT_POST(post.postId))}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Xóa bài "${post.title}"`}
                      onClick={() => setToDelete(post)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </>
                }
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

      <ConfirmDialog
        show={toDelete !== null}
        title="Xóa bài viết?"
        message={
          <>
            Bài <strong>{toDelete?.title}</strong> sẽ bị xóa khỏi cộng đồng cùng với bình luận và lượt thả tim. Bạn
            không thể hoàn tác thao tác này.
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
