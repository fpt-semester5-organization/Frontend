import React from 'react';
import { Link } from 'react-router-dom';
import { MEDICAL_DISCLAIMER } from '@/constants/quota';
import { PATHS } from '@/routes/paths';
import { formatDateTime } from '@/lib/format';
import { sourceHref, sourceTypeLabel, splitCitations } from '../lib/content';
import type { ChatMessage } from '../types/chat.types';
import { SurveyStars } from './SurveyStars';

export const UserBubble: React.FC<{ m: ChatMessage }> = ({ m }) => {
  return (
    <div className="flex max-w-[90%] items-start justify-end gap-3 self-end sm:max-w-[80%]">
      <div className="flex flex-col items-end gap-1">
        <div className="rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-on-primary shadow-xs">
          <p className="whitespace-pre-wrap break-words font-body-md text-body-md leading-relaxed">
            {m.content}
          </p>
        </div>
        <span className="px-1 font-label-sm text-xs text-on-surface-variant">
          {formatDateTime(m.createdAt)}
        </span>
      </div>
    </div>
  );
};

/** Chuyển đổi cú pháp markdown inline (**in đậm**, *in nghiêng*) thành JSX */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*([^*\n]+?)\*\*|(?<!\*)\*(?!\s|\*)([^*\n]+?)(?<!\s|\*)\*(?!\*))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      tokens.push(
        <strong key={`b-${match.index}`} className="font-semibold text-on-surface">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      tokens.push(
        <em key={`i-${match.index}`} className="italic text-on-surface-variant">
          {match[3]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

export const AssistantBubble: React.FC<{
  m: ChatMessage;
  sessionId: number;
  question: string;
}> = ({ m, sessionId, question }) => {
  const sources = m.sources ?? [];
  const lines = m.content.split('\n');

  return (
    <div className="flex max-w-[96%] items-start gap-3 self-start sm:max-w-[90%]">
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-col gap-4 rounded-2xl rounded-tl-none bg-surface-container-low p-5 text-on-surface shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
              </div>
              <span className="font-label-md text-label-md font-bold text-on-surface">
                Cố vấn Dinh dưỡng VeggieLife
              </span>
            </div>
            <span className="font-label-sm text-xs text-on-surface-variant font-mono">
              {formatDateTime(m.createdAt)}
            </span>
          </div>

          {/* Nội dung tin nhắn có phân đoạn & trích dẫn [S1]...[Sn] */}
          <div className="flex flex-col gap-2 font-body-md text-body-md leading-relaxed text-on-surface">
            {lines.map((line, lineIdx) => {
              if (!line.trim()) {
                return <div key={lineIdx} className="h-1.5" />;
              }

              const isListItem = /^\s*(\d+\.|\*|-|•)\s/.test(line);
              const unorderedBulletMatch = line.match(/^\s*(\*|-|•)\s+/);
              // Lược bỏ ký tự bullet trần (*, -, •) ở đầu dòng để tránh nhiễu và hiển thị chấm tròn tinh gọn
              const processedLine = unorderedBulletMatch ? line.slice(unorderedBulletMatch[0].length) : line;
              const lineSegs = splitCitations(processedLine, sources);

              return (
                <div
                  key={lineIdx}
                  className={
                    isListItem
                      ? 'flex items-start gap-2 pl-3 py-1.5 my-1 rounded-r-lg border-l-2 border-primary/40 bg-surface-container-lowest/60'
                      : 'leading-relaxed'
                  }
                >
                  {unorderedBulletMatch && (
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="flex-1">
                    {lineSegs.map((s, i) =>
                      s.kind === 'text' ? (
                        <React.Fragment key={i}>
                          {parseInlineMarkdown(s.text)}
                        </React.Fragment>
                      ) : s.source ? (
                        <a
                          key={i}
                          href={`#src-${m.messageId}-${s.index}`}
                          title={s.source.title}
                          className="mx-0.5 inline-block align-super font-label-sm text-[11px] font-bold text-secondary hover:underline cursor-pointer"
                        >
                          [S{s.index}]
                        </a>
                      ) : (
                        <span
                          key={i}
                          className="mx-0.5 inline-block align-super font-label-sm text-[11px] text-on-surface-variant"
                        >
                          [S{s.index}]
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>


          {/* Gợi ý món ăn tương thích */}
          {m.recommendedRecipes && m.recommendedRecipes.length > 0 && (
            <div className="flex flex-col gap-2.5" aria-label="Công thức gợi ý">
              <span className="font-label-sm text-label-sm font-bold text-primary">
                Gợi ý công thức thuần chay tương thích
              </span>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {m.recommendedRecipes.map((r) => (
                  <div
                    key={r.recipeId}
                    className="group flex flex-col justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 shadow-xs transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <span className="material-symbols-outlined text-[15px]">restaurant</span>
                        <span>Món ăn khuyên dùng</span>
                      </div>
                      <h4 className="mt-1 font-headline-sm text-[14px] font-bold text-on-surface">
                        {r.title}
                      </h4>
                      {r.cookTimeMinutes != null && (
                        <p className="mt-1 font-body-sm text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                          Thời gian nấu: {r.cookTimeMinutes} phút
                        </p>
                      )}
                    </div>
                    <Link
                      to={PATHS.RECIPES.DETAIL(r.recipeId)}
                      className="inline-flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-label-sm text-xs font-semibold text-on-primary transition hover:opacity-90 active:scale-[0.98]"
                    >
                      Xem công thức
                      <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danh mục nguồn tham chiếu */}
          {sources.length > 0 && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/80 p-3.5" aria-label="Nguồn tham chiếu">
              <div className="mb-2 flex items-center gap-2 font-label-sm text-label-sm font-semibold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                Tài liệu tham khảo y khoa
              </div>
              <ol className="flex flex-col gap-1.5">
                {sources.map((s, i) => {
                  const href = sourceHref(s);
                  return (
                    <li
                      key={`${s.type}-${s.id}-${i}`}
                      id={`src-${m.messageId}-${i + 1}`}
                      className="flex items-start gap-2 font-body-sm text-xs"
                    >
                      <span className="rounded bg-primary/10 px-1.5 py-0.2 font-label-sm font-bold text-primary text-[10px]">
                        S{i + 1}
                      </span>
                      {href ? (
                        <Link
                          to={href}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {s.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-on-surface">{s.title}</span>
                      )}
                      <span className="text-on-surface-variant">· {sourceTypeLabel(s.type)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Miễn trừ y khoa */}
          <p className="flex items-start gap-1.5 font-label-sm text-xs text-on-surface-variant">
            <span className="material-symbols-outlined shrink-0 text-[14px] text-outline">info</span>
            {m.disclaimer || MEDICAL_DISCLAIMER}
          </p>

          {/* Widget đánh giá sao */}
          <SurveyStars sessionId={sessionId} question={question} />
        </div>
      </div>
    </div>
  );
};
