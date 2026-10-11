import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion, Flag, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { CommentSection } from '../components/CommentSection';
import { PostAttachments } from '../components/PostAttachments';
import { ReportDialog } from '../components/ReportDialog';
import { VoteButton } from '../components/VoteButton';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePost } from '../hooks/usePosts';

const BackLink: React.FC = () => (
  <Link
    to={PATHS.COMMUNITY.ROOT}
    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 no-underline hover:text-brand-700"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Cộng đồng
  </Link>
);

const NotFound: React.FC = () => (
  <div className="space-y-4">
    <BackLink />
    <EmptyState
      icon={FileQuestion}
      title="Không tìm thấy bài viết"
      description="Bài viết không tồn tại, đã bị xóa hoặc đang chờ kiểm duyệt."
      action={
        <Link
          to={PATHS.COMMUNITY.ROOT}
          className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white no-underline hover:bg-brand-700"
        >
          Về trang Cộng đồng
        </Link>
      }
    />
  </div>
);

/** SCR-26 community/PostDetail — bình luận nhiều tầng, thả tim, báo cáo (FN-POST-06, FN-COMM-01..05). */
const PostDetail: React.FC = () => {
  const { id } = useParams();
  const postId = Number(id);
  const validId = Number.isInteger(postId) && postId > 0;
  const navigate = useNavigate();
  const { requireMember } = useRequireMember();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const post = usePost(postId);
  const deletePost = useDeletePost();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!validId) return <NotFound />;

  if (post.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Đang tải bài viết">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (post.isError) {
    if (toApiError(post.error).status === 404) return <NotFound />;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink />
        <ErrorState error={post.error} onRetry={() => post.refetch()} retrying={post.isRefetching} />
      </div>
    );
  }

  const data = post.data;
  const isOwner = currentUserId !== null && data.author.userId === currentUserId;

  const handleDelete = () =>
    deletePost.mutate(postId, {
      onSuccess: (res) => {
        notifySuccess(res.message);
        navigate(PATHS.ME.POSTS, { replace: true });
      },
      onError: (error) => {
        setConfirmDelete(false);
        notifyApiError(error);
      },
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />

      <article className="rounded-xl bg-white p-5 ring-1 ring-gray-200 sm:p-8">
        <header>
          <h1 className="text-2xl font-bold break-words text-gray-900 sm:text-3xl">{data.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Bởi <span className="font-medium text-gray-900">{data.author.fullName}</span>
          </p>
        </header>

        {data.imageUrl && (
          <img src={data.imageUrl} alt={`Ảnh minh họa: ${data.title}`} className="mt-5 w-full rounded-lg object-cover" />
        )}

        <div className="mt-5 text-base leading-relaxed break-words whitespace-pre-line text-gray-800">
          {data.content}
        </div>

        <div className="mt-6">
          <PostAttachments videos={data.videos} recipes={data.recipes} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <VoteButton postId={postId} voteCount={data.voteCount} canVote={data.memberActions.canVote} />
          <a
            href="#comments"
            className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-gray-700 no-underline ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {formatNumber(data.commentCount)} bình luận
          </a>
          <div className="ml-auto flex items-center gap-1">
            {isOwner ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate(PATHS.COMMUNITY.EDIT_POST(postId))}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Xóa
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => requireMember(() => setReportOpen(true))}>
                <Flag className="h-4 w-4" aria-hidden="true" />
                Báo cáo
              </Button>
            )}
          </div>
        </div>
      </article>

      <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200 sm:p-8">
        <CommentSection
          postId={postId}
          commentCount={data.commentCount}
          canComment={data.memberActions.canComment}
        />
      </div>

      <ConfirmDialog
        show={confirmDelete}
        title="Xóa bài viết?"
        message="Bài viết sẽ bị xóa khỏi cộng đồng cùng với bình luận và lượt thả tim. Bạn không thể hoàn tác thao tác này."
        confirmLabel="Xóa bài viết"
        danger
        loading={deletePost.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ReportDialog
        show={reportOpen}
        postId={postId}
        target={{ type: 'POST', id: postId }}
        onClose={() => setReportOpen(false)}
        onReported={() => navigate(PATHS.COMMUNITY.ROOT, { replace: true })}
      />
    </div>
  );
};

export default PostDetail;
