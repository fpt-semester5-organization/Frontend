import React, { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { notifySuccess } from '@/lib/notify';
import { useCreateSurvey } from '../hooks/useChat';
import { surveySchema } from '../schemas/chat.schema';

interface SurveyStarsProps {
  sessionId?: number;
  question: string;
}

export const SurveyStars: React.FC<SurveyStarsProps> = ({ sessionId, question }) => {
  const authed = useAuthStore((s) => s.isAuthenticated);
  const openSignupPrompt = useUiStore((s) => s.openSignupPrompt);
  const surveyMutation = useCreateSurvey();

  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStarClick = (n: number) => {
    if (!authed) {
      openSignupPrompt();
      return;
    }
    setScore(n);
  };

  const handleSend = () => {
    const parsed = surveySchema.safeParse({
      chatSessionId: sessionId,
      contextQuestion: question.slice(0, 255),
      ratingScore: score,
      feedbackContent: feedback || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.');
      return;
    }

    setError(null);
    surveyMutation.mutate(parsed.data, {
      onSuccess: () => {
        setDone(true);
        notifySuccess('Cảm ơn bạn đã đánh giá câu trả lời.');
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message || 'Không thể gửi đánh giá, vui lòng thử lại.';
        setError(msg);
      },
    });
  };

  if (done) {
    return (
      <span className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1 text-primary">
        <span className="material-symbols-outlined text-[15px]">check_circle</span>
        Cảm ơn bạn đã phản hồi! ({score}/5 sao)
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-xs font-medium text-on-surface-variant">
            Câu trả lời có hữu ích không?
          </span>
          <div className="flex items-center gap-1 text-secondary" role="radiogroup" aria-label="Đánh giá câu trả lời">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n} sao`}
                title={`${n} sao`}
                onClick={() => handleStarClick(n)}
                className="transition-transform hover:scale-125 active:scale-95 focus:outline-none"
              >
                <span
                  className="material-symbols-outlined text-[19px] text-primary"
                  style={{ fontVariationSettings: `'FILL' ${n <= score ? 1 : 0}` }}
                >
                  star
                </span>
              </button>
            ))}
            {score > 0 && (
              <span className="ml-1 font-mono text-xs font-bold text-primary">{score}/5</span>
            )}
          </div>
        </div>
      </div>

      {score > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={1000}
            rows={2}
            aria-label="Chia sẻ thêm ý kiến của bạn"
            placeholder="Chia sẻ thêm ý kiến của bạn (không bắt buộc)..."
            className="w-full resize-none rounded-lg bg-surface-container-lowest p-2 font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p role="alert" className="font-label-sm text-label-sm text-error">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={surveyMutation.isPending}
              className="rounded-lg bg-primary px-3 py-1 font-label-sm text-xs font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-50"
            >
              {surveyMutation.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
