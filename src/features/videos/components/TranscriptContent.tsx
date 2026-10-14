import React, { useId, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { ExtractedIngredient, ExtractedRecipe, VideoTranscriptResponse } from '../types/video.types';

type Tab = 'recipe' | 'transcript';

/** Tách bản phiên âm thành từng câu để dễ đọc và tìm. */
const toSentences = (text: string) =>
  text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tô đậm từ khóa trong câu (không phân biệt hoa thường). */
const Highlight: React.FC<{ text: string; keyword: string }> = ({ text, keyword }) => {
  if (!keyword) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index} className="rounded bg-secondary-fixed px-0.5 text-on-surface">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

const amountOf = (ingredient: ExtractedIngredient) =>
  [typeof ingredient.quantity === 'number' ? formatNumber(ingredient.quantity) : null, ingredient.unit]
    .filter(Boolean)
    .join(' ');

const RecipeView: React.FC<{ recipe: ExtractedRecipe }> = ({ recipe }) => {
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];

  return (
    <div className="flex flex-col gap-space-lg">
      {recipe.title && <h3 className="font-headline-sm text-headline-sm text-primary">{recipe.title}</h3>}

      <section className="flex flex-col gap-space-sm" aria-labelledby="extracted-ingredients">
        <h4 id="extracted-ingredients" className="font-label-lg text-label-lg text-on-surface">
          Nguyên liệu
        </h4>
        {ingredients.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">AI chưa nhận ra nguyên liệu nào trong lời thoại.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {ingredients.map((ingredient, index) => (
              <li
                key={`${ingredient.name}-${index}`}
                className="flex items-center justify-between gap-space-md rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-body-sm"
              >
                <span className="min-w-0 break-words text-on-surface">{ingredient.name}</span>
                <span className="shrink-0 font-semibold text-on-surface-variant tabular-nums">{amountOf(ingredient)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-space-sm" aria-labelledby="extracted-steps">
        <h4 id="extracted-steps" className="font-label-lg text-label-lg text-on-surface">
          Các bước thực hiện
        </h4>
        {steps.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">AI chưa nhận ra bước nấu nào trong lời thoại.</p>
        ) : (
          <ol className="flex flex-col gap-space-sm">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-space-sm font-body-sm text-body-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-label-sm text-on-primary-fixed">
                  {index + 1}
                </span>
                <span className="min-w-0 pt-0.5 text-on-surface">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

const TranscriptView: React.FC<{ text: string }> = ({ text }) => {
  const [keyword, setKeyword] = useState('');
  const sentences = useMemo(() => toSentences(text), [text]);
  const trimmed = keyword.trim();
  const shown = trimmed
    ? sentences.filter((sentence) => sentence.toLowerCase().includes(trimmed.toLowerCase()))
    : sentences;

  if (sentences.length === 0) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Bản phiên âm trống.</p>;
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="relative">
        <label htmlFor="transcript-search" className="sr-only">
          Tìm trong bản phiên âm
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline"
        />
        <input
          id="transcript-search"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm câu thoại hoặc nguyên liệu..."
          maxLength={100}
          className="w-full rounded-lg bg-surface-container-low py-2.5 pr-3 pl-9 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container"
        />
      </div>
      {trimmed && (
        <p className="font-label-sm text-label-sm text-on-surface-variant" role="status">
          {shown.length > 0 ? `${shown.length} câu khớp` : 'Không có câu nào khớp.'}
        </p>
      )}
      <div className="flex max-h-[440px] flex-col gap-1 overflow-y-auto pr-1">
        {shown.map((sentence, index) => (
          <p
            key={index}
            className="rounded-lg px-space-sm py-1.5 font-body-sm text-body-sm leading-relaxed text-on-surface hover:bg-surface-container-low"
          >
            <Highlight text={sentence} keyword={trimmed} />
          </p>
        ))}
      </div>
    </div>
  );
};

/**
 * Kết quả bóc tách đã xong: công thức AI trích và bản phiên âm lời thoại.
 * Người xem khác nhận extractedRecipe = null cho tới khi công thức được duyệt (Leader câu 6).
 */
export const TranscriptContent: React.FC<{ transcript: VideoTranscriptResponse; isAuthor: boolean }> = ({
  transcript,
  isAuthor,
}) => {
  const recipe = transcript.extractedRecipe;
  const [tab, setTab] = useState<Tab>(recipe ? 'recipe' : 'transcript');
  const baseId = useId();
  const tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'recipe', label: 'Công thức', icon: 'soup_kitchen' },
    { value: 'transcript', label: 'Bản phiên âm', icon: 'subtitles' },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      <div role="tablist" aria-label="Nội dung tóm tắt" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1">
        {tabs.map((item) => (
          <button
            key={item.value}
            id={`${baseId}-${item.value}-tab`}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            aria-controls={`${baseId}-${item.value}-panel`}
            onClick={() => setTab(item.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors',
              tab === item.value
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <Icon name={item.icon} className="hidden text-[18px] sm:inline-block" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>

      <div id={`${baseId}-${tab}-panel`} role="tabpanel" aria-labelledby={`${baseId}-${tab}-tab`}>
        {tab === 'recipe' ? (
          recipe ? (
            <RecipeView recipe={recipe} />
          ) : (
            <div className="flex flex-col items-center gap-space-sm py-space-lg text-center">
              <Icon name="pending_actions" className="text-[40px] text-outline" />
              <p className="font-label-lg text-label-lg text-on-surface">Công thức đang chờ tác giả xác nhận</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Bạn vẫn xem được bản phiên âm lời thoại của video.
              </p>
              <button
                type="button"
                onClick={() => setTab('transcript')}
                className="font-label-md text-label-md text-primary hover:underline"
              >
                Xem bản phiên âm
              </button>
            </div>
          )
        ) : (
          <TranscriptView text={transcript.rawTranscript ?? ''} />
        )}
      </div>

      <p className="flex items-start gap-1.5 border-t border-surface-container pt-space-sm font-body-sm text-body-sm text-on-surface-variant">
        <Icon name="info" className="mt-0.5 text-[16px]" />
        <span>
          Nội dung do AI tạo từ lời thoại của video nên có thể chưa chính xác.
          {isAuthor && ' Người xem khác chỉ thấy phần công thức sau khi công thức được duyệt.'}
        </span>
      </p>
    </div>
  );
};
