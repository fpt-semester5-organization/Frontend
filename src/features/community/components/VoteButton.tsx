import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useRequireMember } from '@/hooks/useRequireMember';
import { formatNumber } from '@/lib/format';
import { notifyApiError } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { useVote } from '../hooks/useVote';
import type { ContentRef } from '../types/community.types';

interface VoteButtonProps {
  /** Bài viết hoặc công thức được thả tim. */
  target: ContentRef;
  voteCount: number;
  /** Trạng thái đã thả tim do máy chủ trả về; dùng làm giá trị ban đầu và đồng bộ lại sau khi tải lại. */
  hasVoted?: boolean;
  /** memberActions.canVote của trang chi tiết; danh sách không có trường này nên mặc định cho phép. */
  canVote?: boolean;
  className?: string;
  onVoteChange?: (count: number, voted: boolean) => void;
}

/**
 * Thả tim / bỏ tim (FN-COMM-04, BR-INT-LIKE-01). Khách bấm thì mở SignupPromptModal.
 * Trạng thái "đã thả tim" lấy từ hasVoted của API nên vẫn giữ màu đỏ sau khi tải lại trang.
 */
export const VoteButton: React.FC<VoteButtonProps> = ({ target, voteCount, hasVoted, canVote = true, className, onVoteChange }) => {
  const [state, setState] = useState<{ voted: boolean; count: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const { isMember, requireMember } = useRequireMember();
  const vote = useVote(target);

  // Số tim và trạng thái đã thả từ server (sau khi danh sách tải lại) thay cho giá trị lưu tạm.
  useEffect(
    () => setState((current) => (current ? { voted: hasVoted ?? current.voted, count: voteCount } : current)),
    [voteCount, hasVoted]
  );

  const voted = state?.voted ?? hasVoted ?? false;
  const count = state?.count ?? voteCount;
  const disabled = isMember && !canVote;

  const handleClick = () =>
    requireMember(() => {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 350);
      vote.mutate(undefined, {
        onSuccess: ({ data }) => {
          setState({ voted: data.voted, count: data.voteCount });
          onVoteChange?.(data.voteCount, data.voted);
        },
        onError: notifyApiError,
      });
    });

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || vote.isPending}
      aria-pressed={voted}
      title={disabled ? `${target.resource === 'recipes' ? 'Công thức' : 'Bài viết'} này chưa thể thả tim` : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
        className
      )}
    >
      <Icon
        name="favorite"
        filled={voted}
        className={cn(
          'text-[20px] text-secondary transition-transform duration-200',
          animating && 'scale-125'
        )}
      />
      <span>
        {voted ? 'Đã thích' : 'Yêu thích'} ({formatNumber(count)})
      </span>
    </button>
  );
};
