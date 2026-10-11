import React, { useCallback, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCountdown } from '@/hooks/useCountdown';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateComment } from '../hooks/useCommentMutations';
import { usePostComments } from '../hooks/usePostComments';
import { COMMENT_COOLDOWN_SECONDS } from '../types/community.schemas';
import { CommentForm } from './CommentForm';
import { CommentItem, type CommentThreadContext } from './CommentItem';
import { ReportDialog } from './ReportDialog';

interface CommentSectionProps {
  postId: number;
  commentCount: number;
  /** memberActions.canComment của GET /posts/{id}. */
  canComment: boolean;
}

/** Bình luận nhiều tầng của bài viết (FN-COMM-01, 02, 03) và báo cáo bình luận (FN-COMM-05). */
export const CommentSection: React.FC<CommentSectionProps> = ({ postId, commentCount, canComment }) => {
  const { isMember, requireMember } = useRequireMember();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const comments = usePostComments(postId);
  const createComment = useCreateComment(postId);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldownSeconds = useCountdown(cooldownUntil);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);

  const { mutateAsync: createCommentAsync } = createComment;

  const submitComment = useCallback(
    async (content: string, parentCommentId: number | null) => {
      const startCooldown = () => setCooldownUntil(Date.now() + COMMENT_COOLDOWN_SECONDS * 1000);
      try {
        const res = await createCommentAsync({ content, parentCommentId });
        startCooldown();
        // AI kiểm duyệt gắn cờ (≥ 85%) thì bình luận không hiển thị ngay (BR-USR-03).
        if (res.data.status !== 'ACTIVE') notifyInfo('Bình luận của bạn đang chờ kiểm duyệt.');
        else notifySuccess(res.message);
      } catch (error) {
        // ERR_COMMENT_TOO_FAST: khóa nút gửi và đếm ngược thời gian chờ (Business Rules mục 3).
        if (toApiError(error).errorCode === 'ERR_COMMENT_TOO_FAST') startCooldown();
        throw error;
      }
    },
    [createCommentAsync]
  );

  const context: CommentThreadContext = useMemo(
    () => ({
      postId,
      currentUserId,
      canComment,
      cooldownSeconds,
      submitReply: (parentId, content) => submitComment(content, parentId),
      requireMember,
      onReport: setReportCommentId,
    }),
    [postId, currentUserId, canComment, cooldownSeconds, submitComment, requireMember]
  );

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section id="comments" aria-labelledby="comments-title" className="scroll-mt-20">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Bình luận ({formatNumber(commentCount)})
      </h2>

      <div className="mt-4">
        {isMember && canComment && (
          <CommentForm
            label="Viết bình luận"
            submitLabel="Gửi bình luận"
            cooldownSeconds={cooldownSeconds}
            onSubmit={(content) => submitComment(content, null)}
          />
        )}
        {isMember && !canComment && (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Bài viết này hiện chưa nhận bình luận.
          </p>
        )}
        {!isMember && (
          <button
            type="button"
            onClick={() => requireMember(() => undefined)}
            className="w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
          >
            Đăng nhập hoặc đăng ký để bình luận...
          </button>
        )}
      </div>

      <div className="mt-6">
        {comments.isPending ? (
          <ul className="space-y-4" aria-busy="true" aria-label="Đang tải bình luận">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex list-none gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : comments.isError ? (
          <ErrorState error={comments.error} onRetry={() => comments.refetch()} retrying={comments.isRefetching} />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!
          </p>
        ) : (
          <>
            <ul className="space-y-5 p-0">
              {items.map((comment) => (
                <CommentItem key={comment.commentId} comment={comment} context={context} />
              ))}
            </ul>
            {comments.hasNextPage && (
              <div className="mt-5 text-center">
                <Button
                  variant="secondary"
                  onClick={() => comments.fetchNextPage()}
                  loading={comments.isFetchingNextPage}
                >
                  Xem thêm bình luận
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ReportDialog
        show={reportCommentId !== null}
        postId={postId}
        target={reportCommentId !== null ? { type: 'COMMENT', id: reportCommentId } : null}
        onClose={() => setReportCommentId(null)}
      />
    </section>
  );
};
