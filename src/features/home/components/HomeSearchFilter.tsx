import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { DIETARY_SCHOOL_LABEL, type DietarySchoolCode } from '@/constants/dietarySchools';
import { cn } from '@/lib/cn';
import { KEYWORD_MAX, QUICK_COOK_MINUTES } from '../lib/homeFilters';
import type { DietarySchool } from '@/features/recipes/types/recipe.types';
import type { HomeFilters } from '../types/home.types';

/** Danh sách chuẩn 07 trường phái chay (BR-ADM-MAS-001) */
const ALL_7_SCHOOLS_FALLBACK: { dietarySchoolId: number; schoolCode: DietarySchoolCode; schoolName: string }[] = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay' },
  { dietarySchoolId: 2, schoolCode: 'BUDDHIST', schoolName: 'Kiêng ngũ vị tân' },
  { dietarySchoolId: 3, schoolCode: 'LACTO_OVO', schoolName: 'Chay trứng & sữa' },
  { dietarySchoolId: 4, schoolCode: 'OVO', schoolName: 'Chay có trứng' },
  { dietarySchoolId: 5, schoolCode: 'LACTO', schoolName: 'Chay có sữa' },
  { dietarySchoolId: 6, schoolCode: 'PESCATARIAN', schoolName: 'Chay ăn hải sản' },
  { dietarySchoolId: 7, schoolCode: 'POLLOTARIAN', schoolName: 'Chay ăn thịt trắng' },
];

const CHIP =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-label-md text-label-md transition-all shadow-xs';
const chipClass = (active: boolean) =>
  cn(
    CHIP,
    active
      ? 'border-primary-container bg-primary-container text-on-primary shadow-xs'
      : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
  );

export interface HomeSearchFilterProps {
  filters: HomeFilters;
  schools: DietarySchool[] | undefined;
  schoolsLoading: boolean;
  onChange: (patch: Partial<HomeFilters>) => void;
}

/**
 * Thanh tìm kiếm công thức kéo dài toàn chiều rộng và hiển thị đầy đủ 07 trường phái ăn chay.
 * Đã loại bỏ hoàn toàn nhóm tab Tất cả/Công thức/Video và Sắp xếp theo yêu cầu.
 */
export const HomeSearchFilter: React.FC<HomeSearchFilterProps> = ({
  filters,
  schools,
  schoolsLoading,
  onChange,
}) => {
  const [draft, setDraft] = useState(filters.keyword);

  // URL đổi (quay lại, xóa bộ lọc) thì ô nhập theo URL.
  useEffect(() => setDraft(filters.keyword), [filters.keyword]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onChange({ keyword: draft.trim().slice(0, KEYWORD_MAX) });
  };

  // Đảm bảo luôn hiển thị đủ 07 trường phái chay, ưu tiên ID thực tế trả về từ API
  const allSchools = useMemo(() => {
    if (!schools || schools.length === 0) return ALL_7_SCHOOLS_FALLBACK;
    if (schools.length >= 7) return schools;
    const existingCodes = new Set(schools.map((s) => s.schoolCode));
    const usedIds = new Set(schools.map((s) => s.dietarySchoolId));
    let nextId = 100;
    const missing = ALL_7_SCHOOLS_FALLBACK.filter((f) => !existingCodes.has(f.schoolCode)).map((f) => {
      let id = f.dietarySchoolId;
      while (usedIds.has(id)) {
        id = nextId++;
      }
      usedIds.add(id);
      return { ...f, dietarySchoolId: id };
    });
    return [...schools, ...missing];
  }, [schools]);

  const hasSpecificSchoolOrQuick = Boolean(filters.dietarySchoolId || filters.quick);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      {/* Thanh tìm kiếm kéo dài toàn bộ chiều rộng (Full Width) */}
      <form role="search" onSubmit={submit} className="flex w-full gap-2">
        <label htmlFor="home-search" className="sr-only">
          Tìm món chay, nguyên liệu hoặc bài viết
        </label>
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[22px] text-outline"
          />
          <input
            id="home-search"
            type="search"
            value={draft}
            maxLength={KEYWORD_MAX}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tìm món chay, nguyên liệu, bài viết…"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-3 pl-10 font-body-md text-body-md text-on-surface shadow-xs placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button type="submit" size="lg" aria-label="Tìm kiếm" className="h-12 shrink-0 px-6 sm:px-8">
          <span>Tìm kiếm</span>
        </Button>
      </form>

      {/* Dải bộ lọc đầy đủ 07 trường phái ăn chay và thời gian nấu */}
      <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Lọc nhanh">
        {schoolsLoading && !schools
          ? Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))
          : allSchools.map((s) => {
              const active = filters.dietarySchoolId === s.dietarySchoolId;
              return (
                <button
                  key={s.schoolCode ?? s.dietarySchoolId}
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

        {/* Nút đặt lại lọc khi đang có lựa chọn */}
        {hasSpecificSchoolOrQuick && (
          <button
            type="button"
            onClick={() => onChange({ dietarySchoolId: null, quick: false })}
            className="ml-auto inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline"
          >
            <Icon name="close" className="text-[14px]" />
            Đặt lại lọc
          </button>
        )}
      </div>
    </div>
  );
};
