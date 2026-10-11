import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { KEYWORD_MAX } from '../types/community.schemas';
import type { PostSort } from '../types/community.types';

interface PostListToolbarProps {
  keyword: string;
  sort: PostSort;
  onSearch: (keyword: string) => void;
  onSortChange: (sort: PostSort) => void;
}

const SORT_OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'POPULAR', label: 'Phổ biến' },
];

/** Tìm theo từ khóa (1–100 ký tự) và sắp xếp NEWEST/POPULAR (SCR-25). */
export const PostListToolbar: React.FC<PostListToolbarProps> = ({ keyword, sort, onSearch, onSortChange }) => {
  const [draft, setDraft] = useState(keyword);

  useEffect(() => setDraft(keyword), [keyword]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form role="search" onSubmit={submit} className="flex flex-1 gap-2">
        <label htmlFor="post-search" className="sr-only">
          Tìm bài viết
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="post-search"
            type="search"
            value={draft}
            maxLength={KEYWORD_MAX}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tìm bài viết theo từ khóa..."
            className="h-10 w-full rounded-md bg-white pr-9 pl-9 text-sm text-gray-900 ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft('');
                onSearch('');
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
              aria-label="Xóa từ khóa"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <Button type="submit">Tìm</Button>
      </form>
      <div className="flex items-center gap-2">
        <label htmlFor="post-sort" className="text-sm whitespace-nowrap text-gray-600">
          Sắp xếp
        </label>
        <select
          id="post-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PostSort)}
          className="h-10 rounded-md bg-white px-3 text-sm text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
