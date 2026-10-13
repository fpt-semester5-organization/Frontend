import React, { useCallback, useMemo, useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
  postAuthorId: number;
  commentCount: number;
  /** memberActions.canComment của GET /posts/{id}. */
  canComment: boolean;
}

/** Bình luận nhiều tầng của bài viết (FN-COMM-01, 02, 03) và báo cáo bình luận (FN-COMM-05). */
export const CommentSection: React.FC<CommentSectionProps> = ({ postId, postAuthorId, commentCount, canComment }) => {
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
      postAuthorId,
      currentUserId,
      canComment,
      cooldownSeconds,
      submitReply: (parentId, content) => submitComment(content, parentId),
      requireMember,
      onReport: setReportCommentId,
    }),
    [postId, postAuthorId, currentUserId, canComment, cooldownSeconds, submitComment, requireMember]
  );

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section
      id="comments"
      aria-labelledby="comments-title"
      className="scroll-mt-24 rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl"
    >
      <h2 id="comments-title" className="flex items-center gap-2 pb-space-lg font-headline-sm text-headline-sm text-on-surface">
        Thảo luận cộng đồng
        <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
          {formatNumber(commentCount)}
        </span>
      </h2>

      <div className="mb-space-xl rounded-lg bg-surface-container-low p-space-md">
        {isMember && canComment && (
          <CommentForm
            label="Viết bình luận"
            submitLabel="Gửi bình luận"
            cooldownSeconds={cooldownSeconds}
            onSubmit={(content) => submitComment(content, null)}
          />
        )}
        {isMember && !canComment && (
          <p className="py-space-xs text-center font-body-md text-body-md text-on-surface-variant">
            Bài viết này hiện chưa nhận bình luận.
          </p>
        )}
        {!isMember && (
          <div className="flex flex-col items-center gap-space-sm py-space-sm text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">Đăng nhập để tham gia bình luận.</p>
            <Button className="bg-primary hover:bg-primary-container" onClick={() => requireMember(() => undefined)}>
              Viết bình luận
            </Button>
          </div>
        )}
      </div>

      {comments.isPending ? (
        <div className="flex flex-col gap-space-md" role="status" aria-busy="true" aria-label="Đang tải bình luận">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState
          className="py-space-lg"
          error={comments.error}
          onRetry={() => comments.refetch()}
          retrying={comments.isRefetching}
        />
      ) : items.length === 0 ? (
        <p className="py-space-md text-center font-body-md text-body-md text-on-surface-variant">
          Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-space-lg">
            {items.map((comment) => (
              <CommentItem key={comment.commentId} comment={comment} context={context} />
            ))}
          </ul>
          {comments.hasNextPage && (
            <div className="mt-space-xl text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => comments.fetchNextPage()}
                loading={comments.isFetchingNextPage}
              >
                {!comments.isFetchingNextPage && <Icon name="expand_more" className="text-[18px]" />}
                Tải thêm bình luận
              </Button>
            </div>
          )}
        </>
      )}

      <ReportDialog
        show={reportCommentId !== null}
        postId={postId}
        target={reportCommentId !== null ? { type: 'COMMENT', id: reportCommentId } : null}
        onClose={() => setReportCommentId(null)}
      />
    </section>
  );
};
