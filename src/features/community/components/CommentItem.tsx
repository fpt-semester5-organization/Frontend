import React, { useState } from 'react';
import { CornerDownRight, Flag, Pencil, Reply, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { useDeleteComment, useUpdateComment } from '../hooks/useCommentMutations';
import type { PostComment } from '../types/community.types';
import { CommentForm } from './CommentForm';

export interface CommentThreadContext {
  postId: number;
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

  const actionClass =
    'inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-brand-600';

  return (
    <li className="list-none">
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800',
            isReply ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
          )}
        >
          {comment.author.fullName.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">{comment.author.fullName}</span>
              {replyToName && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-gray-500">
                  <CornerDownRight className="h-3 w-3" aria-hidden="true" />
                  Trả lời {replyToName}
                </span>
              )}
            </p>
            {mode === 'edit' ? (
              <div className="mt-2">
                <CommentForm
                  label="Sửa bình luận"
                  submitLabel="Lưu"
                  initialContent={comment.content}
                  autoFocus
                  onCancel={() => setMode('view')}
                  onSubmit={async (content) => {
                    const res = await updateComment.mutateAsync({ commentId: comment.commentId, content });
                    notifySuccess(res.message);
                    setMode('view');
                  }}
                />
              </div>
            ) : (
              <p className="mt-0.5 text-sm break-words whitespace-pre-line text-gray-800">{comment.content}</p>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <time dateTime={comment.createdAt} className="mr-1 text-xs text-gray-500">
              {formatDateTime(comment.createdAt)}
            </time>
            {(context.canComment || context.currentUserId === null) && (
              <button
                type="button"
                className={actionClass}
                onClick={() => context.requireMember(() => setMode(mode === 'reply' ? 'view' : 'reply'))}
              >
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                Trả lời
              </button>
            )}
            {isOwner ? (
              <>
                <button type="button" className={actionClass} onClick={() => setMode('edit')}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Sửa
                </button>
                <button type="button" className={actionClass} onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Xóa
                </button>
              </>
            ) : (
              <button
                type="button"
                className={actionClass}
                onClick={() => context.requireMember(() => context.onReport(comment.commentId))}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                Báo cáo
              </button>
            )}
          </div>
          {mode === 'reply' && (
            <div className="mt-2">
              <CommentForm
                label={`Trả lời ${comment.author.fullName}`}
                submitLabel="Gửi trả lời"
                placeholder={`Trả lời ${comment.author.fullName}...`}
                autoFocus
                cooldownSeconds={context.cooldownSeconds}
                onCancel={() => setMode('view')}
                onSubmit={async (content) => {
                  await context.submitReply(comment.commentId, content);
                  setMode('view');
                }}
              />
            </div>
          )}
          {replies.length > 0 && (
            <ul className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3 sm:pl-4">
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
        </div>
      </div>
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
