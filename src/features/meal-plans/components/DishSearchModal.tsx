import React, { useEffect, useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { listRecipes } from '@/features/recipes/api/recipes.api';
import type { RecipeListItem } from '@/features/recipes/types/recipe.types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { MealSlot } from '../types/mealPlan.types';
import { MEAL_LABEL, DAY_LABEL } from '../lib/labels';

interface DishSearchModalProps {
  show: boolean;
  onHide: () => void;
  targetSlot?: MealSlot | null;
  onSelectDish: (recipe: RecipeListItem, targetSlotId?: number) => void;
  availableSlots?: MealSlot[];
}

export const DishSearchModal: React.FC<DishSearchModalProps> = ({
  show,
  onHide,
  targetSlot,
  onSelectDish,
  availableSlots = [],
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<RecipeListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(targetSlot?.slotId);

  // Debounce 300ms theo đúng yêu cầu
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Cập nhật selectedSlotId khi targetSlot thay đổi
  useEffect(() => {
    if (targetSlot) {
      setSelectedSlotId(targetSlot.slotId);
    }
  }, [targetSlot]);

  // Gọi API tìm kiếm theo tên món với debounced keyword
  useEffect(() => {
    if (!show) return;

    let isCancelled = false;
    setLoading(true);

    listRecipes({
      keyword: debouncedKeyword.trim() || undefined,
      page: 1,
      size: 24,
      sort: 'POPULAR',
    })
      .then((paged) => {
        if (!isCancelled) {
          setResults(paged.items || []);
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
  }, [debouncedKeyword, show]);

  // Bộ lọc nhanh danh mục / tên món
  const filteredResults = results.filter((recipe) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'CANH' && /canh|súp|soup/i.test(recipe.title)) return true;
    if (selectedCategory === 'KHO' && /kho|sốt/i.test(recipe.title)) return true;
    if (selectedCategory === 'XAO' && /xào|chiên/i.test(recipe.title)) return true;
    if (selectedCategory === 'NUOC' && /bún|phở|miến|cháo/i.test(recipe.title)) return true;
    if (selectedCategory === 'LOW_CAL' && recipe.caloriesKcal < 350) return true;
    return true;
  });

  const handleSelect = (recipe: RecipeListItem) => {
    onSelectDish(recipe, selectedSlotId);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title="Tìm kiếm món ăn trong database"
      size="lg"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
        {/* Slot đích nếu đang chọn thay thế */}
        {targetSlot && (
          <div className="flex items-center justify-between rounded-xl bg-primary-fixed/50 p-3 border border-primary/20 text-xs text-on-primary-fixed">
            <div className="flex items-center gap-2">
              <Icon name="swap_horiz" className="text-[18px] text-primary" />
              <span>
                Đang thay thế cho bữa <strong>{MEAL_LABEL[targetSlot.mealType]}</strong> · {DAY_LABEL[targetSlot.dayOfWeek]}
                {targetSlot.recipe?.title ? ` (Hiện tại: ${targetSlot.recipe.title})` : ''}
              </span>
            </div>
            <span className="font-semibold text-primary">
              {Math.round(targetSlot.recipe?.caloriesKcal ?? 0)} kcal
            </span>
          </div>
        )}

        {/* Hoặc nếu mở từ thanh trên cùng, cho phép chọn bữa muốn thay thế */}
        {!targetSlot && availableSlots.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="text-on-surface-variant font-medium">Thay thế vào bữa:</span>
            <select
              value={selectedSlotId ?? ''}
              onChange={(e) => setSelectedSlotId(Number(e.target.value))}
              className="rounded-lg border border-surface-container bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface"
            >
              {availableSlots.map((s) => (
                <option key={s.slotId} value={s.slotId}>
                  {DAY_LABEL[s.dayOfWeek]} · {MEAL_LABEL[s.mealType]}: {s.recipe?.title ?? 'Trống'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Thanh tìm kiếm có icon kính lúp và debounce 300ms */}
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm công thức theo tên (ví dụ: bún riêu, canh nấm, đậu hũ sốt cà...)"
            autoFocus
            className="w-full rounded-xl border border-surface-container bg-surface-container-low pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              title="Xóa tìm kiếm"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>

        {/* Bộ lọc nhanh: Tất cả, Canh, Kho, Xào, Món nước, Ít calo */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'CANH', label: 'Món canh/súp' },
            { id: 'NUOC', label: 'Bún/Phở/Cháo' },
            { id: 'KHO', label: 'Món kho/sốt' },
            { id: 'XAO', label: 'Món xào' },
            { id: 'LOW_CAL', label: 'Ít calo (<350 kcal)' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                selectedCategory === cat.id
                  ? 'bg-primary-container text-on-primary shadow-xs font-semibold'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Danh sách kết quả */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
            <Icon name="refresh" className="text-[28px] animate-spin text-primary" />
            <span className="text-xs">Đang tìm món ăn từ kho database...</span>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <Icon name="search_off" className="text-[36px] mx-auto text-on-surface-variant/40 mb-2" />
            <p className="text-sm font-semibold font-serif text-on-surface">Không tìm thấy món ăn phù hợp</p>
            <p className="text-xs mt-1">Thử đổi từ khóa hoặc bộ lọc khác xem sao nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredResults.map((recipe) => (
              <div
                key={recipe.recipeId}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-surface-container bg-surface-container-lowest hover:border-outline-variant hover:bg-surface-container-low transition-all group"
              >
                {/* Ảnh */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container relative">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <Icon name="restaurant" className="text-[22px]" />
                    </div>
                  )}
                </div>

                {/* Nội dung */}
                <div className="min-w-0 flex-1">
                  {/* Món ăn (tên chung) trên, tên công thức dưới. */}
                  {recipe.foodName && (
                    <p className="truncate text-[11px] text-on-surface-variant">{recipe.foodName}</p>
                  )}
                  <h4 className="font-serif font-semibold text-xs sm:text-sm text-on-surface truncate">
                    {recipe.title}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-on-surface-variant">
                    <span className="flex items-center gap-0.5 font-semibold text-secondary">
                      <Icon name="local_fire_department" className="text-[13px]" />
                      {formatNumber(Math.round(recipe.caloriesKcal))} kcal
                    </span>
                    {recipe.cookTimeMinutes > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Icon name="schedule" className="text-[13px]" />
                        {recipe.cookTimeMinutes} phút
                      </span>
                    )}
                  </div>
                </div>

                {/* Nút chọn */}
                <button
                  type="button"
                  onClick={() => handleSelect(recipe)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary active:scale-95 text-on-primary text-xs font-medium shadow-2xs transition-all font-semibold"
                >
                  Chọn
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end pt-3 border-t border-surface-container">
          <button
            type="button"
            onClick={onHide}
            className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
