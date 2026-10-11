import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRequireMember } from '@/hooks/useRequireMember';
import { formatNumber } from '@/lib/format';
import { notifyApiError } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { useVotePost } from '../hooks/useVotePost';

interface VoteButtonProps {
  postId: number;
  voteCount: number;
  /** memberActions.canVote của GET /posts/{id}; Khách luôn là false. */
  canVote: boolean;
}

/**
 * Thả tim / bỏ tim (FN-COMM-04, BR-INT-LIKE-01). Khách bấm thì mở SignupPromptModal.
 * UNSPECIFIED: GET /posts/{id} không trả "đã thả tim chưa", nên trạng thái tim chỉ biết sau lần bấm đầu.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({ postId, voteCount, canVote }) => {
  const [voted, setVoted] = useState<boolean | null>(null);
  const { isMember, requireMember } = useRequireMember();
  const vote = useVotePost(postId);

  const handleClick = () =>
    requireMember(() =>
      vote.mutate(undefined, {
        onSuccess: ({ data }) => setVoted(data.voted),
        onError: notifyApiError,
      })
    );

  const disabled = isMember && !canVote;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || vote.isPending}
      aria-pressed={voted ?? undefined}
      title={disabled ? 'Bài viết này chưa thể thả tim' : undefined}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-60',
        voted
          ? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100'
          : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
      )}
    >
      <Heart className={cn('h-4 w-4', voted && 'fill-current')} aria-hidden="true" />
      <span>{voted ? 'Đã thả tim' : 'Thả tim'}</span>
      <span className="text-gray-500" aria-label={`${voteCount} lượt thả tim`}>
        {formatNumber(voteCount)}
      </span>
    </button>
  );
};
