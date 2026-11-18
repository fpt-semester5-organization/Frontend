import React, { useCallback, useMemo, useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { notifyInfo, notifySuccess, notifyWarning } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth.store';
import { useCreateComment } from '../hooks/useCommentMutations';
import { useComments } from '../hooks/useComments';
import type { ContentRef } from '../types/community.types';
import { CommentForm } from './CommentForm';
import { CommentItem, type CommentThreadContext } from './CommentItem';
import { ReportDialog } from './ReportDialog';

interface CommentSectionProps {
  /** Bài viết (/posts/{id}/comments) hoặc công thức (/recipes/{id}/comments). */
  target: ContentRef;
  /** Tác giả nội dung (nhãn "Tác giả" trên bình luận); null khi API không trả tác giả. */
  authorId: number | null;
  commentCount: number;
  /** memberActions.canComment của GET /posts/{id} hoặc GET /recipes/{id}. */
  canComment: boolean;
}

/** Bình luận nhiều tầng của bài viết/công thức (FN-COMM-01, 02, 03) và báo cáo bình luận (FN-COMM-05). */
export const CommentSection: React.FC<CommentSectionProps> = ({ target, authorId, commentCount, canComment }) => {
  const { isMember, requireMember } = useRequireMember();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const comments = useComments(target);
  const createComment = useCreateComment(target);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);

  const { mutateAsync: createCommentAsync } = createComment;

  const submitComment = useCallback(
    async (content: string, parentCommentId: number | null) => {
      try {
        const res = await createCommentAsync({ content, parentCommentId });
        // AI kiểm duyệt gắn cờ (QUARANTINED_HIDDEN hoặc status !== 'ACTIVE')
        if (res.data.status !== 'ACTIVE') {
          const warningMsg =
            'Bình luận của bạn có dấu hiệu vi phạm tiêu chuẩn cộng đồng và đang được tạm ẩn để quản trị viên kiểm duyệt, nên chưa hiển thị công khai.';
          setModerationNotice(warningMsg);
          notifyWarning('Bình luận của bạn vi phạm tiêu chuẩn cộng đồng và đang chờ kiểm duyệt nên chưa hiển thị công khai.');
        } else {
          setModerationNotice(null);
          notifySuccess(res.message || 'Đã gửi bình luận thành công.');
        }
      } finally {
        // Hoàn tất gửi bình luận
      }
    },
    [createCommentAsync]
  );

  const context: CommentThreadContext = useMemo(
    () => ({
      target,
      authorId,
      currentUserId,
      canComment,
      submitReply: (parentId, content) => submitComment(content, parentId),
      requireMember,
      onReport: setReportCommentId,
    }),
    [target, authorId, currentUserId, canComment, submitComment, requireMember]
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

      {moderationNotice && (
        <div
          role="alert"
          className="mb-space-md flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-container/20 p-space-md text-on-surface shadow-xs animate-in fade-in"
        >
          <Icon name="warning" className="mt-0.5 text-[22px] text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md font-bold text-warning">
              Bình luận bị tạm ẩn do vi phạm tiêu chuẩn cộng đồng
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {moderationNotice}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModerationNotice(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
            aria-label="Đóng cảnh báo"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      <div className="mb-space-xl rounded-lg bg-surface-container-low p-space-md">
        {isMember && canComment && (
          <CommentForm
            label="Viết bình luận"
            submitLabel="Gửi bình luận"
            onSubmit={(content) => submitComment(content, null)}
          />
        )}
        {isMember && !canComment && (
          <p className="py-space-xs text-center font-body-md text-body-md text-on-surface-variant">
            {target.resource === 'recipes' ? 'Công thức' : 'Bài viết'} này hiện chưa nhận bình luận.
          </p>
        )}
        {!isMember && (
          <div
            onClick={() => requireMember(() => undefined)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requireMember(() => undefined);
              }
            }}
            className="group flex cursor-pointer flex-col gap-space-sm rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-space-md transition-all hover:border-primary hover:bg-surface-container-low"
          >
            <p className="font-body-md text-body-md text-on-surface-variant">
              Chia sẻ cảm nghĩ hoặc đặt câu hỏi cùng cộng đồng…
            </p>
            <div className="flex items-center justify-between pt-space-xs">
              <span className="font-label-sm text-label-sm text-primary">
                Đăng nhập hoặc đăng ký để tham gia thảo luận →
              </span>
              <Button size="sm" className="pointer-events-none bg-primary hover:bg-primary-container">
                Viết bình luận
              </Button>
            </div>
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
        content={target}
        target={reportCommentId !== null ? { type: 'COMMENT', id: reportCommentId } : null}
        onClose={() => setReportCommentId(null)}
      />
    </section>
  );
};
