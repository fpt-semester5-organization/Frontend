import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { KEYWORD_MAX } from '../types/community.schemas';
import type { PostSort } from '../types/community.types';

interface PostListToolbarProps {
  keyword: string;
  sort: PostSort;
  onSearch: (keyword: string) => void;
  onSortChange: (sort: PostSort) => void;
  placeholder?: string;
}

const SORT_OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'POPULAR', label: 'Phổ biến' },
];

/** Tìm theo từ khóa (1–100 ký tự) và sắp xếp NEWEST/POPULAR (FN-POST-05). */
export const PostListToolbar: React.FC<PostListToolbarProps> = ({
  keyword,
  sort,
  onSearch,
  onSortChange,
  placeholder = 'Tìm bài viết, kinh nghiệm nấu chay…',
}) => {
  const [draft, setDraft] = useState(keyword);

  useEffect(() => setDraft(keyword), [keyword]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form role="search" onSubmit={submit} className="relative min-w-[200px] flex-1">
        <label htmlFor="post-search" className="sr-only">
          Tìm bài viết
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline"
        />
        <input
          id="post-search"
          type="search"
          value={draft}
          maxLength={KEYWORD_MAX}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-surface-container-lowest py-2.5 pr-10 pl-10 font-body-sm text-body-sm text-on-surface shadow-[0_1px_2px_rgb(47_52_46/0.05)] placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onSearch('');
            }}
            aria-label="Xóa từ khóa"
            className="absolute top-1/2 right-2 flex -translate-y-1/2 rounded-lg p-1 text-outline hover:text-on-surface"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </form>
      <div role="radiogroup" aria-label="Sắp xếp" className="flex rounded-xl bg-surface-container p-1">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={sort === option.value}
            onClick={() => onSortChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 font-label-md text-label-md transition-colors',
              sort === option.value
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
