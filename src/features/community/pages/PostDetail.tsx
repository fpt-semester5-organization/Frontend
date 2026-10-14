import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { CommentSection } from '../components/CommentSection';
import { LinkedRecipes, PostVideos } from '../components/PostAttachments';
import { ReportDialog } from '../components/ReportDialog';
import { VoteButton } from '../components/VoteButton';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePost } from '../hooks/usePosts';

const PAGE = 'mx-auto flex w-full max-w-[900px] flex-col gap-space-xl px-margin-mobile py-space-lg sm:px-margin';
const ICON_BUTTON =
  'flex rounded-lg p-2 text-on-surface-variant no-underline transition-colors hover:bg-surface-container-low';

const NotFound: React.FC = () => (
  <EmptyState
    icon="search_off"
    title="Không tìm thấy bài viết"
    description="Bài viết không tồn tại, đã bị xóa hoặc đang chờ kiểm duyệt."
    action={
      <Link
        to={PATHS.COMMUNITY.ROOT}
        className="inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
      >
        Về Cộng đồng
      </Link>
    }
  />
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
      <div className={PAGE} role="status" aria-busy="true" aria-label="Đang tải bài viết">
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (post.isError) {
    if (toApiError(post.error).status === 404) return <NotFound />;
    return <ErrorState error={post.error} onRetry={() => post.refetch()} retrying={post.isRefetching} />;
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
    <div className={PAGE}>
      <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl">
        <header className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg">
          <div className="flex items-center gap-space-sm">
            <Avatar name={data.author.fullName} size="lg" />
            <span className="font-headline-sm text-headline-sm text-on-surface">{data.author.fullName}</span>
          </div>
          <div className="ml-auto flex items-center gap-space-xs">
            {isOwner ? (
              <>
                <Link to={PATHS.COMMUNITY.EDIT_POST(postId)} title="Sửa bài" aria-label="Sửa bài" className={`${ICON_BUTTON} hover:text-primary`}>
                  <Icon name="edit" className="text-[20px]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  title="Xóa bài"
                  aria-label="Xóa bài"
                  className={`${ICON_BUTTON} hover:text-error`}
                >
                  <Icon name="delete" className="text-[20px]" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => requireMember(() => setReportOpen(true))}
                title="Báo cáo vi phạm"
                aria-label="Báo cáo vi phạm"
                className={`${ICON_BUTTON} hover:text-secondary`}
              >
                <Icon name="flag" className="text-[20px]" />
              </button>
            )}
          </div>
        </header>

        <h1 className="mb-space-md font-headline-lg text-headline-lg-mobile leading-tight break-words text-on-surface sm:text-headline-lg">
          {data.title}
        </h1>

        {data.imageUrl && (
          <figure className="mb-space-lg overflow-hidden rounded-lg">
            <div className="aspect-[16/9] w-full overflow-hidden bg-surface-container">
              <img src={data.imageUrl} alt={`Ảnh minh họa: ${data.title}`} className="h-full w-full object-cover" />
            </div>
          </figure>
        )}

        <div className="mb-space-lg empty:hidden">
          <LinkedRecipes recipes={data.recipes} />
        </div>

        <div className="mb-space-xl font-body-md text-body-md leading-relaxed break-words whitespace-pre-line text-on-surface">
          {data.content}
        </div>

        <div className="mb-space-xl empty:hidden">
          <PostVideos videos={data.videos} postId={data.postId} />
        </div>

        <footer className="flex flex-wrap items-center gap-space-sm pt-space-md">
          <VoteButton postId={postId} voteCount={data.voteCount} canVote={data.memberActions.canVote} />
          <a
            href="#comments"
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md text-on-surface no-underline transition-all hover:bg-surface-container"
          >
            <Icon name="chat_bubble_outline" className="text-[20px] text-on-surface-variant" />
            {formatNumber(data.commentCount)} bình luận
          </a>
        </footer>
      </article>

      <CommentSection
        postId={postId}
        postAuthorId={data.author.userId}
        commentCount={data.commentCount}
        canComment={data.memberActions.canComment}
      />

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
