import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useRequireMember } from '@/hooks/useRequireMember';
import { formatNumber } from '@/lib/format';
import { notifyApiError } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { useVotePost } from '../hooks/useVotePost';

interface VoteButtonProps {
  postId: number;
  voteCount: number;
  /** memberActions.canVote của GET /posts/{id}; danh sách không có trường này nên mặc định cho phép. */
  canVote?: boolean;
  className?: string;
}

/**
 * Thả tim / bỏ tim (FN-COMM-04, BR-INT-LIKE-01). Khách bấm thì mở SignupPromptModal.
 * UNSPECIFIED: API không trả "đã thả tim chưa", nên trạng thái tim chỉ biết sau lần bấm đầu.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({ postId, voteCount, canVote = true, className }) => {
  const [state, setState] = useState<{ voted: boolean; count: number } | null>(null);
  const { isMember, requireMember } = useRequireMember();
  const vote = useVotePost(postId);

  // Số tim mới từ server (sau khi danh sách tải lại) thay cho số đã lưu tạm.
  useEffect(() => setState((current) => (current ? { ...current, count: voteCount } : current)), [voteCount]);

  const voted = state?.voted ?? false;
  const count = state?.count ?? voteCount;
  const disabled = isMember && !canVote;

  const handleClick = () =>
    requireMember(() =>
      vote.mutate(undefined, {
        onSuccess: ({ data }) => setState({ voted: data.voted, count: data.voteCount }),
        onError: notifyApiError,
      })
    );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || vote.isPending}
      aria-pressed={voted}
      title={disabled ? 'Bài viết này chưa thể thả tim' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    >
      <Icon name="favorite" filled={voted} className="text-[20px] text-secondary" />
      <span>
        {voted ? 'Đã thích' : 'Yêu thích'} ({formatNumber(count)})
      </span>
    </button>
  );
};
