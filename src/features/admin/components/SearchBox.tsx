import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { CONTROL } from './AdminUi';

interface SearchBoxProps {
  value: string;
  onSearch: (keyword: string) => void;
  placeholder: string;
  label: string;
  maxLength: number;
  className?: string;
}

/** Ô tìm kiếm: gửi khi nhấn Enter hoặc bấm kính lúp (không gọi API theo từng phím). */
export const SearchBox: React.FC<SearchBoxProps> = ({ value, onSearch, placeholder, label, maxLength, className }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      role="search"
      className={cn('relative flex min-w-0 items-center', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <input
        type="search"
        aria-label={label}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value === '' && value !== '') onSearch('');
        }}
        className={cn(CONTROL, 'pr-11')}
      />
      <button
        type="submit"
        aria-label="Tìm"
        className="absolute right-1 flex h-8 w-9 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      >
        <Icon name="search" className="text-[20px]" />
      </button>
    </form>
  );
};
