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
 * Kết quả bóc tách âm thanh: bản phiên âm lời thoại video (Speech-to-Text).
 */
export const TranscriptContent: React.FC<{
  transcript: VideoTranscriptResponse;
  isAuthor?: boolean;
}> = ({
  transcript,
}) => {
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center gap-2 border-b border-surface-container pb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-2xs shrink-0">
          <Icon name="subtitles" className="text-[16px]" />
        </span>
        <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
          Lời thoại bóc tách từ video
        </h4>
      </div>

      <TranscriptView text={transcript.rawTranscript ?? ''} />
    </div>
  );
};
