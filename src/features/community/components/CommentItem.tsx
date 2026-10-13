import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { useDeleteComment, useUpdateComment } from '../hooks/useCommentMutations';
import type { PostComment } from '../types/community.types';
import { CommentForm } from './CommentForm';

export interface CommentThreadContext {
  postId: number;
  /** Tác giả bài viết: bình luận của họ có nhãn "Tác giả". */
  postAuthorId: number;
  currentUserId: number | null;
  /** Thành viên được bình luận trên bài này (memberActions.canComment). */
  canComment: boolean;
  cooldownSeconds: number;
  submitReply: (parentCommentId: number, content: string) => Promise<unknown>;
  /** Thao tác ghi: Khách thì mở SignupPromptModal. */
  requireMember: (action: () => void) => void;
  onReport: (commentId: number) => void;
}

interface CommentItemProps {
  comment: PostComment;
  context: CommentThreadContext;
  /** Tên tác giả bình luận cha khi phản hồi bị dàn phẳng ở cấp 2. */
  replyToName?: string;
  isReply?: boolean;
}

const ACTION = 'font-label-sm text-label-sm transition-colors';

/**
 * Một bình luận và cây phản hồi. Hiển thị tối đa 2 cấp (FN-COMM-01): phản hồi sâu hơn được dàn phẳng
 * vào cấp 2 kèm "Trả lời <tên>", nhưng vẫn gửi đúng parentCommentId.
 */
export const CommentItem: React.FC<CommentItemProps> = ({ comment, context, replyToName, isReply = false }) => {
  const [mode, setMode] = useState<'view' | 'edit' | 'reply'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateComment = useUpdateComment(context.postId);
  const deleteComment = useDeleteComment(context.postId);

  const isOwner = context.currentUserId !== null && comment.author.userId === context.currentUserId;
  const isPostAuthor = comment.author.userId === context.postAuthorId;
  const replies = isReply ? [] : flattenReplies(comment);

  const handleDelete = () =>
    deleteComment.mutate(comment.commentId, {
      onSuccess: (res) => {
        const hidden = res.data.hiddenReplies;
        notifySuccess(hidden > 0 ? `${res.message} Đã ẩn kèm ${hidden} phản hồi.` : res.message);
        setConfirmDelete(false);
      },
      onError: (error) => {
        setConfirmDelete(false);
        notifyApiError(error);
      },
    });

  return (
    <li className="flex flex-col gap-space-sm">
      <div className="flex items-start gap-space-sm">
        <Avatar name={comment.author.fullName} size={isReply ? 'sm' : 'md'} />
        <div className={cn('min-w-0 flex-1 rounded-lg p-space-md', isReply ? 'bg-surface-container' : 'bg-surface-container-low')}>
          <div className="mb-1 flex items-start justify-between gap-space-xs">
            <div className="flex min-w-0 flex-wrap items-center gap-space-xs">
              <span className="font-headline-sm text-body-lg font-bold text-on-surface">{comment.author.fullName}</span>
              {isPostAuthor && (
                <span className="rounded bg-primary px-1.5 py-0.5 font-label-sm text-label-sm text-on-primary">Tác giả</span>
              )}
              {replyToName && (
                <span className="flex items-center gap-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  <Icon name="subdirectory_arrow_right" className="text-[14px]" />
                  Trả lời {replyToName}
                </span>
              )}
            </div>
            <time dateTime={comment.createdAt} className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
              {formatDateTime(comment.createdAt)}
            </time>
          </div>

          {mode === 'edit' ? (
            <CommentForm
              label="Sửa bình luận"
              submitLabel="Lưu"
              rows={2}
              initialContent={comment.content}
              autoFocus
              onCancel={() => setMode('view')}
              onSubmit={async (content) => {
                const res = await updateComment.mutateAsync({ commentId: comment.commentId, content });
                notifySuccess(res.message);
                setMode('view');
              }}
            />
          ) : (
            <p className="mb-space-sm font-body-md text-body-md leading-relaxed break-words whitespace-pre-line text-on-surface">
              {comment.content}
            </p>
          )}

          <div className="flex items-center gap-space-md text-on-surface-variant">
            {(context.canComment || context.currentUserId === null) && (
              <button
                type="button"
                className={cn(ACTION, 'font-semibold hover:text-primary')}
                onClick={() => context.requireMember(() => setMode(mode === 'reply' ? 'view' : 'reply'))}
              >
                Trả lời
              </button>
            )}
            {isOwner ? (
              mode !== 'edit' && (
                <>
                  <button type="button" className={cn(ACTION, 'hover:text-on-surface')} onClick={() => setMode('edit')}>
                    Chỉnh sửa
                  </button>
                  <button type="button" className={cn(ACTION, 'hover:text-error')} onClick={() => setConfirmDelete(true)}>
                    Xóa
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                className={cn(ACTION, 'ml-auto hover:text-secondary')}
                onClick={() => context.requireMember(() => context.onReport(comment.commentId))}
              >
                Báo cáo
              </button>
            )}
          </div>
        </div>
      </div>

      {(mode === 'reply' || replies.length > 0) && (
        <div className="relative flex flex-col gap-space-sm pl-10 md:pl-12">
          <div aria-hidden="true" className="absolute top-0 bottom-4 left-5 w-[2px] bg-surface-container-highest" />
          {replies.length > 0 && (
            <ul className="flex flex-col gap-space-sm">
              {replies.map(({ reply, parentId, parentName }) => (
                <CommentItem
                  key={reply.commentId}
                  comment={reply}
                  context={context}
                  isReply
                  replyToName={parentId === comment.commentId ? undefined : parentName}
                />
              ))}
            </ul>
          )}
          {mode === 'reply' && (
            <CommentForm
              label={`Trả lời ${comment.author.fullName}`}
              submitLabel="Gửi"
              rows={2}
              placeholder={`Phản hồi ${comment.author.fullName}…`}
              autoFocus
              cooldownSeconds={context.cooldownSeconds}
              onCancel={() => setMode('view')}
              onSubmit={async (content) => {
                await context.submitReply(comment.commentId, content);
                setMode('view');
              }}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        show={confirmDelete}
        title="Xóa bình luận?"
        message="Bình luận và toàn bộ phản hồi bên dưới sẽ bị ẩn. Bạn không thể hoàn tác thao tác này."
        confirmLabel="Xóa bình luận"
        danger
        loading={deleteComment.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </li>
  );
};

interface FlatReply {
  reply: PostComment;
  parentId: number;
  parentName: string;
}

/** Duyệt cây phản hồi theo thứ tự hiển thị, kèm bình luận cha của từng phản hồi. */
function flattenReplies(root: PostComment): FlatReply[] {
  const result: FlatReply[] = [];
  const walk = (parent: PostComment) => {
    for (const reply of parent.replies ?? []) {
      result.push({ reply, parentId: parent.commentId, parentName: parent.author.fullName });
      walk(reply);
    }
  };
  walk(root);
  return result;
}
