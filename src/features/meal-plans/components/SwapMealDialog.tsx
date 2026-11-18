import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useRecipe } from '@/features/recipes/hooks/useRecipes';
import { listRecipes } from '@/features/recipes/api/recipes.api';
import type { RecipeListItem } from '@/features/recipes/types/recipe.types';
import { FOOD_CATEGORIES } from '@/features/home/data/mockFoodsData';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { DAY_LABEL, MEAL_LABEL, SWAP_REASONS } from '../lib/labels';
import type { MealSlot, SwapReason } from '../types/mealPlan.types';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Highlight ký tự khớp với từ khóa tìm kiếm */
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const unaccentText = removeVietnameseTones(text).toLowerCase();
  const unaccentQ = removeVietnameseTones(q).toLowerCase();
  const matchIndex = unaccentText.indexOf(unaccentQ);

  if (matchIndex === -1) return <>{text}</>;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + q.length);
  const after = text.slice(matchIndex + q.length);

  return (
    <>
      {before}
      <mark className="bg-primary-fixed text-primary font-bold px-0.5 rounded-sm">{match}</mark>
      {after}
    </>
  );
};

interface SwapMealDialogProps {
  slot: MealSlot | null;
  remaining: number;
  limit: number;
  swapCount?: number;
  previousRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
  } | null;
  initialCustomNote?: string;
  submitting: boolean;
  /** Lỗi hiện trong hộp thoại (422 không có món thay thế, hết lượt của VIP). */
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: SwapReason | null, customNote?: string, newRecipeId?: number) => void;
}

type SwapMode = 'REASON' | 'AI_NOTE' | 'SEARCH_DB';

/** Hộp thoại đổi món nâng cao theo yêu cầu người dùng */
export const SwapMealDialog: React.FC<SwapMealDialogProps> = ({
  slot,
  remaining,
  limit,
  swapCount = 0,
  previousRecipe,
  initialCustomNote,
  submitting,
  error,
  onCancel,
  onConfirm,
}) => {
  const [activeMode, setActiveMode] = useState<SwapMode>('REASON');
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [customNote, setCustomNote] = useState<string>(initialCustomNote || '');

  // Cập nhật customNote khi mở slot mới
  useEffect(() => {
    setCustomNote(initialCustomNote || '');
  }, [initialCustomNote, slot?.slotId]);

  // Trạng thái tìm kiếm trong database
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<RecipeListItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeListItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategory = (dir: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const offset = dir === 'left' ? -220 : 220;
    categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Debounce 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tìm kiếm công thức khi debouncedQuery thay đổi
  useEffect(() => {
    if (activeMode !== 'SEARCH_DB' || !slot) return;

    let isCancelled = false;
    setSearchLoading(true);

    listRecipes({
      keyword: debouncedQuery.trim() || undefined,
      page: 1,
      size: 60,
      sort: 'POPULAR',
    })
      .then((paged) => {
        if (!isCancelled) {
          // Lọc bỏ món hiện tại
          setSearchResults(
            (paged.items || []).filter((r) => r.recipeId !== slot.recipe?.recipeId)
          );
        }
      })
      .catch(() => {
        if (!isCancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!isCancelled) setSearchLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, activeMode, slot?.recipe?.recipeId]);

  // Chi tiết món ăn hiện tại
  const recipeQuery = useRecipe(slot?.recipe?.recipeId ?? 0);
  const detail = recipeQuery.data;

  const currentKcal = detail?.caloriesKcal ?? slot?.recipe?.caloriesKcal ?? 0;
  const cookTime = detail?.cookTimeMinutes ?? slot?.recipe?.cookTimeMinutes ?? (slot?.mealType === 'BREAKFAST' ? 15 : 25);
  const voteCount = detail?.voteCount ?? slot?.recipe?.voteCount ?? 0;

  const handleApply = () => {
    const trimmed = customNote.trim();
    if (activeMode === 'REASON') {
      onConfirm(reason, trimmed || undefined);
    } else if (activeMode === 'AI_NOTE') {
      onConfirm(null, trimmed || undefined);
    } else if (activeMode === 'SEARCH_DB') {
      if (selectedRecipe) {
        onConfirm(null, trimmed || undefined, selectedRecipe.recipeId);
      }
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && selectedCategory !== 'ALL') {
      setSelectedCategory('ALL');
    }
  };

  // Bộ lọc nhanh danh mục chuẩn xác theo Category_ID & tên món (hỗ trợ cả tiếng Việt không dấu)
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((recipe) => {
      // 1. Lọc theo danh mục database
      if (selectedCategory !== 'ALL') {
        const catId = (recipe as any).categoryId;
        if (catId && catId !== selectedCategory) return false;
      }

      // 2. Lọc theo từ khóa
      if (searchQuery.trim()) {
        const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
        const name = removeVietnameseTones((recipe.foodName || '').toLowerCase());
        const title = removeVietnameseTones((recipe.title || '').toLowerCase());
        if (!name.includes(q) && !title.includes(q)) return false;
      }

      return true;
    });
  }, [searchResults, selectedCategory, searchQuery]);

  return (
    <Modal show={slot !== null} onHide={onCancel} title="Đổi món ăn" locked={submitting} size="lg">
      {slot && (
        <div className="flex flex-col gap-4 p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
          {/* Món ăn hiện tại */}
          <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3.5 border border-surface-container">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container shadow-2xs">
              {(slot.recipe?.foodImageUrl || slot.recipe?.imageUrl) ? (
                <img
                  referrerPolicy="no-referrer"
                  src={slot.recipe.foodImageUrl || slot.recipe.imageUrl}
                  alt={slot.recipe.foodName || slot.recipe.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Icon name="restaurant" className="text-[24px]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xs uppercase tracking-wide text-primary">
                  {DAY_LABEL[slot.dayOfWeek]} · {MEAL_LABEL[slot.mealType]}
                </span>
                {swapCount > 0 && (
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-secondary-container">
                    Đã đổi {swapCount} lần
                  </span>
                )}
              </div>

              <h4 className="font-serif font-bold text-sm text-on-surface truncate mt-0.5">
                {slot.recipe?.foodName || slot.recipe?.title}
              </h4>
              {slot.recipe?.foodName && slot.recipe?.foodName !== slot.recipe?.title && (
                <p className="truncate text-[11px] text-on-surface-variant italic">
                  {slot.recipe?.title}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
                <span className="flex items-center gap-1">
                  <Icon name="local_fire_department" className="text-[14px] text-secondary" />
                  <strong className="text-secondary">{Math.round(currentKcal)}</strong> kcal
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" className="text-[14px]" />
                  {cookTime} phút
                </span>
                {voteCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Icon name="favorite" className="text-[14px] text-primary" />
                    {voteCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tiện ích chọn lại món cũ ban đầu chỉ với 1 thao tác nếu có previousRecipe */}
          {previousRecipe && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-primary/20 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon name="history" className="text-[16px] text-primary shrink-0" />
                <span className="text-on-surface-variant">Món ban đầu / trước đó:</span>
                <span className="font-semibold text-on-surface truncate">{previousRecipe.title}</span>
              </div>
              <button
                type="button"
                onClick={() => onConfirm(null, 'Quay lại món cũ', previousRecipe.recipeId)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2.5 py-1 text-xs font-semibold text-on-primary hover:bg-primary transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Icon name="undo" className="text-[14px]" />
                <span>Quay lại món cũ</span>
              </button>
            </div>
          )}

          {/* THANH CHỌN HÌNH THỨC ĐỔI MÓN */}
          <div className="flex items-center rounded-xl bg-surface-container-low p-1 border border-surface-container text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveMode('REASON')}
              className={cn(
                'flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                activeMode === 'REASON'
                  ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="tune" className="text-[15px]" />
              <span>Gợi ý theo lý do</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('AI_NOTE')}
              className={cn(
                'flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                activeMode === 'AI_NOTE'
                  ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="sticky_note_2" className="text-[15px] text-primary" />
              <span>Lưu ý riêng cho món</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('SEARCH_DB')}
              className={cn(
                'flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                activeMode === 'SEARCH_DB'
                  ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="search" className="text-[15px]" />
              <span>Tìm trong database</span>
            </button>
          </div>

          {/* CHẾ ĐỘ 1: GỢI Ý ĐỔI MÓN THEO LÝ DO CÓ SẴN (Backend tự động lấy) */}
          {activeMode === 'REASON' && (
            <div className="space-y-3 animate-fadeIn">
              <fieldset className="flex flex-col gap-2">
                <legend className="font-serif font-semibold text-xs text-on-surface mb-1">
                  Chọn lý do đổi món (Backend sẽ tự động tính toán món tương đương calo):
                </legend>
                {SWAP_REASONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs transition-all border',
                      reason === option.value
                        ? 'bg-primary-fixed/60 text-on-primary-fixed border-primary font-semibold'
                        : 'bg-surface-container-lowest border-surface-container text-on-surface hover:bg-surface-container-low'
                    )}
                  >
                    <input
                      type="radio"
                      name="swap-reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => setReason(option.value)}
                      className="accent-primary"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>

              {/* Ô nhập lưu ý riêng cho món này */}
              <div className="pt-2 border-t border-surface-container">
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1 flex items-center gap-1">
                  <Icon name="sticky_note_2" className="text-[14px] text-primary" />
                  <span>Ghi chú lưu ý riêng cho món này (tùy chọn):</span>
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Ví dụ: Đổi sang món thanh đạm, ít dầu mỡ, không dùng nấm..."
                  className="w-full rounded-xl border border-surface-container bg-surface-container-low px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ 2: GHI THÊM LƯU Ý DÀNH RIÊNG CHO MÓN NÀY */}
          {activeMode === 'AI_NOTE' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface font-serif">
                <Icon name="sticky_note_2" className="text-[18px] text-primary" />
                <span>
                  Lưu ý dành riêng cho món {slot?.recipe?.title ? `"${slot.recipe.title}"` : 'này'}:
                </span>
              </div>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ví dụ: Đổi sang món thanh đạm ít dầu mỡ, muốn món canh ấm nóng, không dùng cà chua cho bữa này..."
                className="w-full rounded-xl border border-surface-container bg-surface-container-low p-3 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Đổi sang món thanh đạm, ít dầu mỡ',
                  'Đổi sang món canh ấm nóng',
                  'Đổi sang món nước (bún/phở)',
                  'Món ít calo hơn',
                  'Giàu đạm thực vật',
                  'Ưu tiên đồ luộc/hấp thanh mát',
                  'Không ăn cay cho bữa này',
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setCustomNote((prev) => (prev ? `${prev}, ${hint}` : hint))}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary-fixed/40 text-on-surface-variant hover:text-primary transition-colors border border-surface-container cursor-pointer"
                  >
                    + {hint}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant italic">
                * Lưu ý này chỉ áp dụng riêng cho bữa ăn này khi đổi món, không thay đổi ngữ cảnh chung của cả tuần.
              </p>
            </div>
          )}

          {/* CHẾ ĐỘ 3: TỰ TÌM KIẾM MÓN TRONG DATABASE ĐỂ THAY THẾ */}
          {activeMode === 'SEARCH_DB' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Thanh tìm kiếm có kính lúp debounce 250ms */}
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Nhập tên món ăn hoặc công thức thay thế (gõ chữ tìm kiếm ngay)..."
                  className="w-full rounded-xl border border-surface-container bg-surface-container-low pl-10 pr-9 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer p-1"
                  >
                    <Icon name="close" className="text-[15px]" />
                  </button>
                )}
              </div>

              {/* BỘ LỌC DANH MỤC CÓ SẴN TRONG DATABASE VỚI THANH KÉO QUA LẠI */}
              <div className="relative flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => scrollCategory('left')}
                  className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
                  aria-label="Cuộn danh mục sang trái"
                >
                  <Icon name="chevron_left" className="text-[18px]" />
                </button>

                <div
                  ref={categoryScrollRef}
                  className="category-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1.5 w-full scroll-smooth select-none"
                >
                  {FOOD_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.categoryId;
                    return (
                      <button
                        key={String(cat.categoryId)}
                        type="button"
                        onClick={() => setSelectedCategory(cat.categoryId)}
                        className={cn(
                          'whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer',
                          isSelected
                            ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        )}
                      >
                        <Icon name={cat.iconName} className="text-[14px]" />
                        <span>{cat.categoryName}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollCategory('right')}
                  className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
                  aria-label="Cuộn danh mục sang phải"
                >
                  <Icon name="chevron_right" className="text-[18px]" />
                </button>
              </div>

              {/* Kết quả tìm kiếm */}
              {searchLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                  <Icon name="refresh" className="text-[18px] animate-spin text-primary" />
                  <span>Đang tra cứu cơ sở dữ liệu...</span>
                </div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-on-surface-variant">
                  <Icon name="search_off" className="text-[28px] text-outline" />
                  <span>
                    {searchQuery.trim()
                      ? `Không tìm thấy món ăn phù hợp với từ khóa "${searchQuery}".`
                      : selectedCategory !== 'ALL'
                      ? 'Chưa có món ăn nào trong danh mục này.'
                      : 'Không có món ăn thay thế.'}
                  </span>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="mt-1 text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Xóa tìm kiếm & xem tất cả món
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {filteredSearchResults.map((recipe) => {
                    const isPicked = selectedRecipe?.recipeId === recipe.recipeId;
                    const diffKcal = Math.round(recipe.caloriesKcal) - Math.round(currentKcal);

                    return (
                      <div
                        key={recipe.recipeId}
                        onClick={() => setSelectedRecipe(recipe)}
                        className={cn(
                          'flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all',
                          isPicked
                            ? 'bg-primary-fixed/40 border-primary shadow-2xs'
                            : 'bg-surface-container-lowest border-surface-container hover:border-outline-variant hover:bg-surface-container-low'
                        )}
                      >
                        <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface-container relative">
                          {((recipe as any).foodImageUrl || recipe.imageUrl) ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={(recipe as any).foodImageUrl || recipe.imageUrl}
                              alt={recipe.foodName || recipe.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-primary">
                              <Icon name="restaurant" className="text-[16px]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-on-surface truncate">
                            <HighlightMatch text={recipe.foodName || recipe.title} query={searchQuery} />
                          </p>
                          {recipe.foodName && recipe.foodName !== recipe.title && (
                            <p className="truncate text-[11px] text-on-surface-variant italic">
                              Công thức: <HighlightMatch text={recipe.title} query={searchQuery} />
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mt-0.5">
                            <span className="font-semibold text-secondary">
                              {Math.round(recipe.caloriesKcal)} kcal
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-medium',
                                diffKcal > 0 ? 'text-secondary' : diffKcal < 0 ? 'text-primary' : 'text-on-surface-variant'
                              )}
                            >
                              ({diffKcal > 0 ? `+${diffKcal}` : diffKcal} kcal)
                            </span>
                          </div>
                        </div>
                        {isPicked && (
                          <div className="h-5 w-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                            <Icon name="check" className="text-[13px]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Box hướng dẫn và hạn mức */}
          <div className="rounded-xl bg-surface-container-low p-3 border border-surface-container text-xs text-on-surface-variant flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium text-on-surface">
                <Icon name="info" className="text-[15px] text-primary" />
                Hạn mức đổi món còn lại:
              </span>
              <span className="font-bold text-primary">
                {remaining}/{limit} lần
              </span>
            </div>
          </div>

          {error && (
            <div className="flex flex-col gap-2">
              <FormAlert tone="warning">{error}</FormAlert>
              {activeMode !== 'SEARCH_DB' && (
                <button
                  type="button"
                  onClick={() => setActiveMode('SEARCH_DB')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <Icon name="search" className="text-[16px]" />
                  <span>Chọn món khác trực tiếp từ cơ sở dữ liệu</span>
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              Hủy
            </Button>
            <Button
              onClick={handleApply}
              loading={submitting}
              disabled={
                submitting ||
                (activeMode === 'REASON' && !reason) ||
                (activeMode === 'SEARCH_DB' && !selectedRecipe) ||
                (activeMode === 'AI_NOTE' && !customNote.trim())
              }
            >
              <Icon name="swap_horiz" className="text-[18px]" />
              {activeMode === 'REASON'
                ? 'Đổi món theo lý do'
                : activeMode === 'AI_NOTE'
                ? 'Đổi món theo lưu ý riêng'
                : 'Thay thế bằng món đã chọn'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
