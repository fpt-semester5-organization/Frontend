import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { listRecipes } from '@/features/recipes/api/recipes.api';
import type { RecipeListItem } from '@/features/recipes/types/recipe.types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { DayOfWeek, MealSlot } from '../types/mealPlan.types';
import { DAY_LABEL, MEAL_LABEL } from '../lib/labels';

interface TopDishSearchBarProps {
  currentDay: DayOfWeek;
  slotsForCurrentDay: MealSlot[];
  allSlots: MealSlot[];
  onReplaceSlotWithDish: (slotId: number, recipe: RecipeListItem) => void;
  className?: string;
}

export const TopDishSearchBar: React.FC<TopDishSearchBarProps> = ({
  currentDay,
  slotsForCurrentDay,
  allSlots,
  onReplaceSlotWithDish,
  className,
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<RecipeListItem[]>([]);
  const [selectedRecipeToSwap, setSelectedRecipeToSwap] = useState<RecipeListItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API tìm kiếm khi debouncedKeyword thay đổi
  useEffect(() => {
    if (!debouncedKeyword.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    listRecipes({
      keyword: debouncedKeyword.trim(),
      page: 1,
      size: 8,
      sort: 'POPULAR',
    })
      .then((res) => {
        if (!isCancelled) {
          setResults(res.items || []);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setResults([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedKeyword]);

  const handlePickDish = (recipe: RecipeListItem) => {
    setSelectedRecipeToSwap(recipe);
  };

  const handleConfirmSlot = (slotId: number) => {
    if (selectedRecipeToSwap) {
      onReplaceSlotWithDish(slotId, selectedRecipeToSwap);
      setSelectedRecipeToSwap(null);
      setIsOpen(false);
      setKeyword('');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-md', className)}>
      {/* Ô tìm kiếm có icon kính lúp */}
      <div className="relative flex items-center">
        <Icon
          name="search"
          className="absolute left-3.5 text-[18px] text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            if (!isOpen && e.target.value) setIsOpen(true);
          }}
          onFocus={() => {
            if (keyword.trim()) setIsOpen(true);
          }}
          placeholder="Tìm món thay thế trong database..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden shadow-2xs transition-all"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
            title="Xóa"
          >
            <Icon name="close" className="text-[14px]" />
          </button>
        )}
      </div>

      {/* Dropdown kết quả tìm kiếm với ảnh, tên, calo, tag */}
      {isOpen && (keyword.trim().length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden animate-fadeIn">
          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Icon name="refresh" className="text-[16px] animate-spin text-emerald-600" />
              <span>Đang tìm món...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Không tìm thấy món ăn nào với từ khóa "{keyword}".
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                Gợi ý món ({results.length})
              </div>
              {results.map((recipe) => (
                <div
                  key={recipe.recipeId}
                  className="flex items-center justify-between gap-3 p-2.5 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors group"
                >
                  {/* Thumbnail & Title & Calories */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 relative">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-emerald-600">
                          <Icon name="restaurant" className="text-[16px]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                        {recipe.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                          <Icon name="local_fire_department" className="text-[12px]" />
                          {formatNumber(Math.round(recipe.caloriesKcal))} kcal
                        </span>
                        {recipe.cookTimeMinutes > 0 && (
                          <span>{recipe.cookTimeMinutes} phút</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút chọn thay thế */}
                  <button
                    type="button"
                    onClick={() => handlePickDish(recipe)}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs"
                  >
                    Thay thế
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Popup chọn bữa ăn để áp dụng món vừa chọn */}
      {selectedRecipeToSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Icon name="swap_horiz" className="text-[18px] text-emerald-600" />
                <span>Chọn bữa để thay thế bằng món mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecipeToSwap(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>

            {/* Món mới đã chọn */}
            <div className="my-3.5 flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              {selectedRecipeToSwap.imageUrl ? (
                <img
                  src={selectedRecipeToSwap.imageUrl}
                  alt={selectedRecipeToSwap.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-emerald-200 flex items-center justify-center text-emerald-700">
                  <Icon name="restaurant" className="text-[20px]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                  {selectedRecipeToSwap.title}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  {Math.round(selectedRecipeToSwap.caloriesKcal)} kcal
                </p>
              </div>
            </div>

            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Bữa ăn của ngày hôm nay ({DAY_LABEL[currentDay]}):
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {slotsForCurrentDay.map((slot) => (
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => handleConfirmSlot(slot.slotId)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                >
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mr-1.5">
                      {MEAL_LABEL[slot.mealType]}
                    </span>
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {slot.recipe?.title ?? 'Chưa có món'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Thay thế &rarr;
                  </span>
                </button>
              ))}

              {/* Các ngày khác nếu muốn */}
              {allSlots.filter((s) => s.dayOfWeek !== currentDay).length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-emerald-600 py-1">
                    Xem các ngày khác trong tuần...
                  </summary>
                  <div className="space-y-1.5 mt-2">
                    {allSlots
                      .filter((s) => s.dayOfWeek !== currentDay)
                      .map((slot) => (
                        <button
                          key={slot.slotId}
                          type="button"
                          onClick={() => handleConfirmSlot(slot.slotId)}
                          className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-left text-xs hover:border-emerald-500"
                        >
                          <span>
                            {DAY_LABEL[slot.dayOfWeek]} · {MEAL_LABEL[slot.mealType]}: {slot.recipe?.title}
                          </span>
                          <span className="text-[10px] text-emerald-600">&rarr;</span>
                        </button>
                      ))}
                  </div>
                </details>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecipeToSwap(null)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
