import React, { useId, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { ExtractedIngredient, ExtractedRecipe, VideoTranscriptResponse } from '../types/video.types';
import { resolveIngredientAmount } from './SyncedVideoScriptPlayer';

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

function decodeUnicodeEscapes(str: string): string {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
  } catch {
    return str;
  }
}

function cleanStepText(step: string): string {
  let s = decodeUnicodeEscapes(step).trim();
  s = s.replace(/^["']|["']$/g, '').trim();
  s = s.replace(/^(?:bước|b|step)\s*\d+[:.\-\s]*/i, '');
  s = s.replace(/^[-•*]\s*/, '').replace(/^[0-9]+[.)]\s*/, '').trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

function flattenSteps(rawSteps: string[]): string[] {
  if (!rawSteps || rawSteps.length === 0) return [];
  const flattened: string[] = [];

  for (const item of rawSteps) {
    if (!item) continue;
    const str = String(item).trim();

    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          for (const sub of parsed) {
            const cleaned = cleanStepText(String(sub));
            if (cleaned) flattened.push(cleaned);
          }
          continue;
        }
      } catch {
        const matches = str.match(/"([^"]+)"|'([^']+)'/g);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            const cleaned = cleanStepText(m.replace(/^['"]|['"]$/g, ''));
            if (cleaned) flattened.push(cleaned);
          }
          continue;
        }
      }
    }

    const cleaned = cleanStepText(str);
    if (cleaned) {
      flattened.push(cleaned);
    }
  }

  return flattened;
}

function organizeRecipeSteps(steps: string[]): Array<{ groupTitle: string; items: string[] }> {
  const normalized = flattenSteps(steps);
  if (!normalized || normalized.length === 0) return [];

  const prepSteps: string[] = [];
  const cookSteps: string[] = [];

  let currentGroup = 'prep';
  for (const cleanStep of normalized) {
    const lower = cleanStep.toLowerCase();
    if (
      lower.includes('thực hiện') ||
      lower.includes('chế biến') ||
      lower.includes('bước 2') ||
      lower.includes('nấu') ||
      lower.includes('xào') ||
      lower.includes('phi thơm') ||
      lower.includes('đun sôi') ||
      lower.includes('luộc') ||
      lower.includes('kho')
    ) {
      currentGroup = 'cook';
    }
    if (currentGroup === 'prep') {
      prepSteps.push(cleanStep);
    } else {
      cookSteps.push(cleanStep);
    }
  }

  if (prepSteps.length > 0 && cookSteps.length > 0) {
    return [
      { groupTitle: '1. Chuẩn bị', items: prepSteps },
      { groupTitle: '2. Thực hiện', items: cookSteps },
    ];
  }

  if (normalized.length >= 3) {
    const mid = Math.ceil(normalized.length / 3);
    return [
      { groupTitle: '1. Chuẩn bị', items: normalized.slice(0, mid) },
      { groupTitle: '2. Thực hiện', items: normalized.slice(mid) },
    ];
  }

  return [{ groupTitle: '1. Hướng dẫn thực hiện', items: normalized }];
}

const RecipeView: React.FC<{ recipe: ExtractedRecipe }> = ({ recipe }) => {
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  const stepGroups = useMemo(() => organizeRecipeSteps(steps), [steps]);

  return (
    <div className="flex flex-col gap-4 bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-2xs font-sans text-on-surface">
      {/* Khẩu phần & thời gian */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 border border-surface-container font-label-sm text-label-sm">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Icon name="group" className="text-[16px] text-primary" />
          <span>Khẩu phần:</span>
          <span className="font-semibold text-on-surface">
            {recipe.servings ? `${recipe.servings} người` : '2 người'}
          </span>
        </div>
        <span className="text-outline-variant select-none">•</span>
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Icon name="timer" className="text-[16px] text-primary" />
          <span>Thời gian:</span>
          <span className="font-semibold text-on-surface">
            {recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} phút` : '15 phút'}
          </span>
        </div>
      </div>

      {recipe.title && (
        <h3 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
          {recipe.title}
        </h3>
      )}

      {/* NGUYÊN LIỆU: */}
      <section className="flex flex-col gap-2" aria-labelledby="extracted-ingredients">
        <h4 id="extracted-ingredients" className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Icon name="kitchen" className="text-[16px]" />
          <span>Nguyên liệu</span>
        </h4>
        {ingredients.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant italic">
            Chưa trích xuất được danh sách nguyên liệu.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 pl-1">
            {ingredients.map((ingredient, index) => {
              const resolved = resolveIngredientAmount(ingredient);
              return (
                <li key={`${ingredient.name}-${index}`} className="flex items-start gap-2 font-body-sm text-body-sm leading-relaxed text-on-surface">
                  <span className="text-primary font-bold text-base select-none leading-none mt-0.5">•</span>
                  <span className="min-w-0">
                    <span className="font-semibold text-primary mr-1.5 inline-block">
                      {resolved.quantity} {resolved.unit}
                    </span>
                    <span className="font-medium text-on-surface">
                      {resolved.name}.
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* CÁCH LÀM: */}
      <section className="flex flex-col gap-2 mt-1" aria-labelledby="extracted-steps">
        <h4 id="extracted-steps" className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Icon name="soup_kitchen" className="text-[16px]" />
          <span>Cách làm</span>
        </h4>
        {steps.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant italic">
            Chưa trích xuất được các bước nấu.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {stepGroups.map((grp, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-2">
                <h5 className="font-label-md text-label-md font-bold text-on-surface">
                  {grp.groupTitle}
                </h5>
                <ol className="flex flex-col gap-2 pl-0.5">
                  {grp.items.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2 font-body-sm text-body-sm leading-relaxed text-on-surface">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-mono text-label-sm font-bold text-on-primary-fixed mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        {step.endsWith('.') ? step : `${step}.`}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MẸO NHỎ / LƯU Ý: */}
      <div className="flex items-start gap-2.5 rounded-xl border border-secondary-fixed bg-secondary-fixed/30 p-3 my-1">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary mt-0.5">
          <Icon name="lightbulb" className="text-[14px]" />
        </span>
        <div className="font-body-sm text-body-sm leading-relaxed text-on-surface">
          <span className="font-semibold text-secondary">Mẹo: </span>
          <span>
            {recipe.tips?.[0]?.replace(/^mẹo[:\s-]*/i, '') ||
              'Muốn món ăn thơm ngon và giữ trọn màu sắc, nên đun với lửa nhỏ vừa phải để nguyên liệu ngấm đều gia vị.'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-surface-container font-label-sm text-label-sm text-on-surface-variant">
        <span className="truncate font-medium">
          Sổ tay ẩm thực chay VeggieLife
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-on-primary">
          VL
        </span>
      </div>
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
 * Kết quả bóc tách âm thanh: Công thức tóm tắt (Mặc định) và Lời thoại video.
 */
export const TranscriptContent: React.FC<{
  transcript: VideoTranscriptResponse;
  isAuthor?: boolean;
}> = ({
  transcript,
}) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'transcript'>('recipe');

  return (
    <div className="flex flex-col gap-space-md">
      {/* 2 Tab chuyển đổi nhanh */}
      <div className="flex items-center gap-2 border-b border-surface-container pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('recipe')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold transition-all cursor-pointer',
            activeTab === 'recipe'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Icon name="menu_book" className="text-[16px]" />
          <span>Công thức tóm tắt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transcript')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
            activeTab === 'transcript'
              ? 'bg-primary text-on-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Icon name="subtitles" className="text-[16px]" />
          <span>Lời thoại video</span>
        </button>
      </div>

      {activeTab === 'recipe' && (
        transcript.extractedRecipe ? (
          <RecipeView recipe={transcript.extractedRecipe} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant bg-surface-container-low rounded-xl">
            <Icon name="menu_book" className="text-[32px] text-outline mb-1" />
            <p className="font-body-sm text-body-sm">Chưa có bản tóm tắt công thức cho video này.</p>
          </div>
        )
      )}

      {activeTab === 'transcript' && (
        <TranscriptView text={transcript.rawTranscript ?? ''} />
      )}
    </div>
  );
};
