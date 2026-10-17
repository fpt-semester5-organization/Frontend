import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { DIETARY_SCHOOL_LABEL, type DietarySchoolCode } from '@/constants/dietarySchools';
import { cn } from '@/lib/cn';
import { KEYWORD_MAX, QUICK_COOK_MINUTES } from '../lib/homeFilters';
import type { DietarySchool } from '@/features/recipes/types/recipe.types';
import type { HomeFilters } from '../types/home.types';

/** Ba trường phái hiện sẵn thành chip (theo mockup SCR-10); trường phái khác chỉ hiện khi đang được chọn. */
const FEATURED_SCHOOLS: DietarySchoolCode[] = ['VEGAN', 'LACTO_OVO', 'BUDDHIST'];

const CHIP =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-label-md text-label-md transition-colors';
const chipClass = (active: boolean) =>
  cn(
    CHIP,
    active
      ? 'border-primary-container bg-primary-container text-on-primary'
      : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
  );

interface HomeHeroProps {
  filters: HomeFilters;
  schools: DietarySchool[] | undefined;
  schoolsLoading: boolean;
  onChange: (patch: Partial<HomeFilters>) => void;
}

/** Phần đầu trang chủ: giới thiệu, ô tìm kiếm (FN-POST-01/05 keyword) và chip lọc nhanh. */
export const HomeHero: React.FC<HomeHeroProps> = ({ filters, schools, schoolsLoading, onChange }) => {
  const [draft, setDraft] = useState(filters.keyword);

  // URL đổi (quay lại, xóa bộ lọc) thì ô nhập theo URL.
  useEffect(() => setDraft(filters.keyword), [filters.keyword]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onChange({ keyword: draft.trim().slice(0, KEYWORD_MAX) });
  };

  const chips = (schools ?? []).filter(
    (s) => FEATURED_SCHOOLS.includes(s.schoolCode) || s.dietarySchoolId === filters.dietarySchoolId
  );
  const noFilter = !filters.dietarySchoolId && !filters.quick;

  return (
    <section aria-labelledby="home-title" className="bg-surface-container-low">
      <div className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-space-md px-margin-mobile py-space-xl text-center sm:px-margin sm:py-space-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm uppercase text-on-surface-variant">
          <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
          Cộng đồng ẩm thực chay
        </span>
        <h1
          id="home-title"
          className="max-w-[720px] font-headline-lg text-headline-lg-mobile text-balance text-primary sm:font-display sm:text-display"
        >
          Nền tảng ẩm thực & dinh dưỡng chay minh bạch
        </h1>
        <p className="max-w-[600px] font-body-md text-body-md text-on-surface-variant sm:text-body-lg">
          Công thức có định lượng rõ ràng, video nấu ăn và kinh nghiệm từ cộng đồng người ăn chay.
        </p>

        <form role="search" onSubmit={submit} className="mt-space-sm flex w-full max-w-[640px] gap-2">
          <label htmlFor="home-search" className="sr-only">
            Tìm món chay, nguyên liệu hoặc bài viết
          </label>
          <div className="relative min-w-0 flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[22px] text-outline" />
            <input
              id="home-search"
              type="search"
              value={draft}
              maxLength={KEYWORD_MAX}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tìm món chay, nguyên liệu…"
              enterKeyHint="search"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-3 pl-10 font-body-md text-body-md text-on-surface shadow-sm placeholder:text-outline focus:border-primary"
            />
          </div>
          <Button type="submit" size="lg" aria-label="Tìm kiếm" className="h-12 shrink-0 px-4 sm:px-6">
            <span className="hidden sm:inline">Tìm kiếm</span>
            <Icon name="arrow_forward" className="text-[20px] sm:hidden" />
          </Button>
        </form>

        <div className="flex flex-wrap justify-center gap-2" aria-label="Lọc nhanh">
          <button
            type="button"
            className={chipClass(noFilter)}
            aria-pressed={noFilter}
            onClick={() => onChange({ dietarySchoolId: null, quick: false })}
          >
            Tất cả
          </button>
          {schoolsLoading && !schools
            ? FEATURED_SCHOOLS.map((code) => <Skeleton key={code} className="h-9 w-28 rounded-full" />)
            : chips.map((s) => {
                const active = filters.dietarySchoolId === s.dietarySchoolId;
                return (
                  <button
                    key={s.dietarySchoolId}
                    type="button"
                    className={chipClass(active)}
                    aria-pressed={active}
                    title={s.schoolName}
                    onClick={() => onChange({ dietarySchoolId: active ? null : s.dietarySchoolId })}
                  >
                    {DIETARY_SCHOOL_LABEL[s.schoolCode] ?? s.schoolName}
                  </button>
                );
              })}
          <button
            type="button"
            className={chipClass(filters.quick)}
            aria-pressed={filters.quick}
            onClick={() => onChange({ quick: !filters.quick })}
          >
            <Icon name="timer" className="text-[16px]" />
            Dưới {QUICK_COOK_MINUTES} phút
          </button>
        </div>
      </div>
    </section>
  );
};
