import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { VipUpsellDialog } from '@/components/common/VipUpsell';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useExportPdf } from '@/features/meal-plans/hooks/useExportPdf';
import { useMealPlan } from '@/features/meal-plans/hooks/useMealPlans';
import { getCalendarDays } from '@/features/meal-plans/lib/dates';
import { MEAL_BADGE, MEAL_ICON, MEAL_LABEL } from '@/features/meal-plans/lib/labels';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { forgetShoppingList, planIdOfList, rememberShoppingList } from '../hooks/shoppingListLinks';
import { useSetShoppingListStatus, useShoppingList, useToggleShoppingItem } from '../hooks/useShoppingList';
import { AISLE_INFO, AISLE_ORDER, formatQuantity, LIST_STATUS } from '../lib/aisles';
import type { AisleCode, ShoppingAisle, ShoppingItem } from '../types/shoppingList.types';

const PAGE = 'mx-auto flex w-full max-w-[1100px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';

const orderAisles = (aisles: ShoppingAisle[]) =>
  [...aisles].sort((a, b) => {
    const rank = (code: string) => {
      const index = AISLE_ORDER.indexOf(code as (typeof AISLE_ORDER)[number]);
      return index === -1 ? AISLE_ORDER.length : index;
    };
    return rank(a.aisle) - rank(b.aisle);
  });

/**
 * SCR-24 shopping-lists/ShoppingList — /shopping-lists/:id. FN-MEAL-06 (xem, đánh dấu, hoàn tất/hủy),
 * FN-MEAL-08 (xuất PDF, VIP).
 *
 * Tính năng chính:
 * 1. Chuyển đổi xem linh hoạt giữa "Cả tuần" và từng ngày cụ thể (Ngày 1, Ngày 2...).
 * 2. Mua riêng độc lập từng ngày: Tích đã mua ở Ngày 1 hoàn toàn không ảnh hưởng đến Ngày 5.
 * 3. Cộng dồn cả tuần tự động: Nếu một ngày tăng khẩu phần ăn lên, tổng nguyên liệu của cả tuần
 *    sẽ tự động tăng thêm tương ứng bằng cách cộng dồn định lượng của tất cả các ngày lại.
 * 4. Phân nhóm nguyên liệu theo 4 quầy hàng chuẩn ở mọi chế độ xem (Rau củ, Đạm thực vật, Đồ khô, Gia vị).
 */
const ShoppingList: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (planId) {
      navigate(PATHS.MEAL_PLANS.DETAIL(planId));
    } else {
      navigate(PATHS.MEAL_PLANS.ROOT);
    }
  };
  const { id } = useParams();
  const listId = Number(id);
  const validId = Number.isInteger(listId) && listId > 0;
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);
  const list = useShoppingList(listId);
  const toggleItem = useToggleShoppingItem(listId);
  const setStatus = useSetShoppingListStatus(listId);

  // Lấy planId từ backend response hoặc từ storage đã nhớ
  const planId = (list.data?.planId && list.data.planId > 0) ? list.data.planId : (validId ? planIdOfList(listId) : null);
  const exportPdf = useExportPdf(planId ?? 0);

  const [hidePurchased, setHidePurchased] = useState(false);
  const [showDayMeals, setShowDayMeals] = useState<boolean>(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlServings = Number(searchParams.get('servings'));
  const initialServings = Number.isFinite(urlServings) && urlServings >= 1 ? urlServings : 1;

  // Tab chọn phạm vi xem: 'ALL' (Cả tuần) hoặc index ngày cụ thể (0, 1, 2...)
  const urlTab = searchParams.get('tab');
  const initialTab: 'ALL' | number =
    urlTab === 'ALL' || urlTab === null
      ? 'ALL'
      : Number.isInteger(Number(urlTab)) && Number(urlTab) >= 0
      ? Number(urlTab)
      : 'ALL';
  const [activeTab, setActiveTab] = useState<'ALL' | number>(initialTab);

  const handleTabChange = (nextTab: 'ALL' | number) => {
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', String(nextTab));
        return next;
      },
      { replace: true }
    );
  };

  // Khẩu phần ăn chung cho cả tuần (khởi tạo từ URL hoặc mặc định 1 người)
  const [allDaysServings, setAllDaysServings] = useState<number>(initialServings);
  // Khẩu phần ăn riêng cho từng ngày: { [dayIndex]: servings }
  const [dayServings, setDayServings] = useState<Record<number, number>>({});

  // Trạng thái đã mua độc lập cho từng ngày: Set<"${dayIndex}_${itemId}">
  const [dayPurchases, setDayPurchases] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`veggielife_shopping_day_purchases_${listId}`);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Lưu trạng thái mua từng ngày vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        `veggielife_shopping_day_purchases_${listId}`,
        JSON.stringify(Array.from(dayPurchases))
      );
    } catch {
      // ignore
    }
  }, [dayPurchases, listId]);

  const planQuery = useMealPlan(planId ?? 0);
  const planData = planQuery.data;

  // Ghi nhớ link nếu API trả về planId
  useEffect(() => {
    if (list.data?.planId && validId) {
      rememberShoppingList(list.data.planId, listId);
    }
  }, [list.data?.planId, validId, listId]);

  const notFound = list.isError && toApiError(list.error).status === 404;
  useEffect(() => {
    if (notFound) forgetShoppingList(listId);
  }, [notFound, listId]);

  // Tính số ngày thực tế trong kế hoạch
  const totalDays = useMemo(() => {
    if (!planData?.startDate) return 7;
    if (planData.endDate) {
      const s = new Date(planData.startDate).getTime();
      const e = new Date(planData.endDate).getTime();
      const diff = Math.round((e - s) / (24 * 3600 * 1000)) + 1;
      if (diff > 0) return diff;
    }
    if (planData.slots && planData.slots.length > 0) {
      return Math.max(1, Math.ceil(planData.slots.length / 3));
    }
    return 7;
  }, [planData]);

  // Danh sách các ngày theo lịch thực tế
  const calendarDays = useMemo(() => {
    if (!planData?.startDate) return [];
    return getCalendarDays(planData.startDate, totalDays);
  }, [planData?.startDate, totalDays]);

  const rawAisles = useMemo(() => orderAisles(list.data?.aisles ?? []), [list.data?.aisles]);

  // Gom toàn bộ item kèm mã quầy chuẩn
  const allItems = useMemo(() => {
    const map = new Map<number, ShoppingItem & { aisleCode: AisleCode }>();
    rawAisles.forEach((aisle) => {
      aisle.items.forEach((item) => {
        if (!map.has(item.itemId)) {
          map.set(item.itemId, { ...item, aisleCode: (aisle.aisle as AisleCode) || 'PRODUCE' });
        }
      });
    });
    return Array.from(map.values());
  }, [rawAisles]);

  // Lấy khẩu phần hiệu lực của một ngày cụ thể
  const getDayServing = (dayIndex: number): number => {
    return dayServings[dayIndex] ?? allDaysServings;
  };

  // Khẩu phần của tab hiện tại
  const currentServings = activeTab === 'ALL' ? allDaysServings : getDayServing(activeTab);
  const isCustomDayServing = activeTab !== 'ALL' && dayServings[activeTab] !== undefined && dayServings[activeTab] !== allDaysServings;

  // Dữ liệu chi tiết cho từng ngày (món ăn + nguyên liệu)
  const daysDetail = useMemo(() => {
    if (!planData?.slots || calendarDays.length === 0) return [];

    return calendarDays.map((dItem) => {
      let daySlots =
        totalDays <= 7
          ? planData.slots.filter((s) => s.dayOfWeek === dItem.dayOfWeek)
          : planData.slots.slice(dItem.index * 3, dItem.index * 3 + 3);

      if (daySlots.length === 0) {
        daySlots = planData.slots.slice(dItem.index * 3, dItem.index * 3 + 3);
      }

      const meals = daySlots
        .filter((s) => s.recipe)
        .map((s) => ({
          slotId: s.slotId,
          mealType: s.mealType,
          recipeId: s.recipe?.recipeId,
          title: (s.recipe as any)?.foodName ?? s.recipe?.title ?? '',
          recipeTitle: s.recipe?.title ?? '',
          imageUrl: (s.recipe as any)?.foodImageUrl ?? s.recipe?.imageUrl,
        }));

      // Tập hợp các tiêu đề và tên món để đối soát nguyên liệu (chống lệch giữa FoodName và RecipeTitle)
      const dayRecipeTitles = meals.flatMap((m) => [
        m.title.trim().toLowerCase(),
        m.recipeTitle.trim().toLowerCase(),
      ]).filter(Boolean);

      const isSourceOfThisDay = (rs: string) => {
        const rsLower = rs.trim().toLowerCase();
        if (!rsLower) return false;
        return dayRecipeTitles.some((drt) => {
          if (!drt) return false;
          return drt === rsLower || rsLower.includes(drt) || drt.includes(rsLower);
        });
      };

      // Lọc nguyên liệu cần cho các món của ngày này
      const dayItems = allItems
        .map((item) => {
          const rawSources = (item as unknown as { recipeSources?: string[] }).recipeSources ?? [];
          const matchingSources = rawSources.filter(isSourceOfThisDay);

          const dayQuantities = (item as unknown as { dayQuantities?: Record<string, number> }).dayQuantities;
          let baseDayQuantity: number;

          // 1. Ưu tiên số liệu chính xác 100% từng ngày do Backend tính từ RecipeIngredients
          if (dayQuantities && dayQuantities[String(dItem.index)] !== undefined) {
            baseDayQuantity = dayQuantities[String(dItem.index)];
            if (baseDayQuantity <= 0) return null; // Ngày này không dùng nguyên liệu này
          } else {
            // 2. Fallback nếu chưa có dayQuantities
            if (matchingSources.length === 0) return null;

            // Đếm số món trong ngày này dùng nguyên liệu
            const dayMatchesCount = meals.filter((m: { title: string; recipeTitle: string }) => {
              const t1 = m.title.trim().toLowerCase();
              const t2 = m.recipeTitle.trim().toLowerCase();
              return rawSources.some((rs) => {
                const r = rs.trim().toLowerCase();
                return r === t1 || r === t2 || r.includes(t1) || t1.includes(r);
              });
            }).length;

            // Đếm tổng số bữa ăn trong cả kế hoạch dùng nguyên liệu này
            let totalSlotsMatching = 0;
            calendarDays.forEach((cd) => {
              const slots = (totalDays <= 7
                ? planData?.slots?.filter((s) => s.dayOfWeek === cd.dayOfWeek)
                : planData?.slots?.slice(cd.index * 3, cd.index * 3 + 3)) ?? [];
              const countInDay = slots.filter((s) => {
                const sTitle = ((s.recipe as any)?.foodName ?? s.recipe?.title ?? '').toLowerCase();
                const sRecipeTitle = (s.recipe?.title ?? '').toLowerCase();
                return rawSources.some((rs) => {
                  const r = rs.trim().toLowerCase();
                  return r === sTitle || r === sRecipeTitle || r.includes(sTitle) || sTitle.includes(r);
                });
              }).length;
              totalSlotsMatching += countInDay;
            });

            const ratio = totalSlotsMatching > 0 ? dayMatchesCount / totalSlotsMatching : (rawSources.length > 0 ? matchingSources.length / rawSources.length : 1);
            baseDayQuantity = Math.round(item.quantity * ratio * 100) / 100;
          }

          // Kiểm tra xem món này đã mua riêng ở ngày này chưa (độc lập với ngày khác!)
          const isPurchasedInThisDay = dayPurchases.has(`${dItem.index}_${item.itemId}`);

          return {
            ...item,
            matchingSources,
            baseDayQuantity,
            isPurchasedInThisDay,
          };
        })
        .filter(Boolean) as Array<
          ShoppingItem & {
            aisleCode: AisleCode;
            matchingSources: string[];
            baseDayQuantity: number;
            isPurchasedInThisDay: boolean;
          }
        >;

      const purchasedCount = dayItems.filter((i) => i.isPurchasedInThisDay).length;

      return {
        dayIndex: dItem.index,
        header: dItem.header, // "Ngày 1" nếu < 7 ngày, "Thứ Hai, 04/11" nếu >= 7 ngày
        displayTitle: dItem.displayTitle,
        displaySubtitle: dItem.displaySubtitle,
        dayOfWeek: dItem.dayOfWeek,
        meals,
        items: dayItems,
        purchasedCount,
        totalCount: dayItems.length,
      };
    });
  }, [calendarDays, planData?.slots, totalDays, allItems, dayPurchases]);

  // Các nguyên liệu chung (gia vị / dầu ăn không gắn tên món cụ thể)
  const commonItems = useMemo(() => {
    if (daysDetail.length === 0) return [];
    const assignedIds = new Set<number>();
    daysDetail.forEach((d) => d.items.forEach((i) => assignedIds.add(i.itemId)));
    return allItems.filter((i) => !assignedIds.has(i.itemId));
  }, [daysDetail, allItems]);

  // Thông tin ngày đang chọn nếu xem theo ngày
  const activeDayData = useMemo(() => {
    if (activeTab === 'ALL') return null;
    return daysDetail.find((d) => d.dayIndex === activeTab) ?? null;
  }, [activeTab, daysDetail]);

  // Helper tính định lượng của một item cho một ngày d
  const getItemQuantityForDay = (item: ShoppingItem, dayIndex: number): number => {
    const day = daysDetail.find((d) => d.dayIndex === dayIndex);
    if (!day) return 0;
    const match = day.items.find((di) => di.itemId === item.itemId);
    if (match) {
      const serving = getDayServing(dayIndex);
      return Math.round(match.baseDayQuantity * serving * 100) / 100;
    }
    const isCommon = commonItems.some((ci) => ci.itemId === item.itemId);
    if (isCommon) {
      const serving = getDayServing(dayIndex);
      return Math.round((item.quantity / totalDays) * serving * 100) / 100;
    }
    return 0;
  };

  // TÍNH TOÁN DANH SÁCH NGUYÊN LIỆU PHÂN THEO 4 QUẦY HÀNG
  // - Ở TỪNG NGÀY: Chỉ tính nguyên liệu của ngày đó, tích mua riêng cho ngày đó.
  // - Ở CẢ TUẦN: CỘNG DỒN định lượng của TẤT CẢ các ngày lại. Nếu một ngày tăng khẩu phần, tổng cả tuần tự tăng!
  const aislesGrouped = useMemo(() => {
    const isWeekView = activeTab === 'ALL';

    return AISLE_ORDER.map((code) => {
      const info = AISLE_INFO[code] ?? { label: code, icon: 'shopping_basket' };

      let stallItems: Array<{
        itemId: number;
        name: string;
        unit: string;
        isPurchased: boolean;
        scaledQuantity: number;
        servingLabel: string;
        sources: string[];
        isCommon?: boolean;
        breakdownText?: string;
        daysUsingCount?: number;
        daysBoughtCount?: number;
      }> = [];

      if (isWeekView) {
        // Chế độ CẢ TUẦN:
        // CỘNG DỒN định lượng từng ngày lại
        const itemsInStall = allItems.filter((i) => i.aisleCode === code);

        stallItems = itemsInStall.map((item) => {
          const rawSources = (item as unknown as { recipeSources?: string[] }).recipeSources ?? [];
          let weekTotalScaledQuantity = 0;
          const dayBreakdown: Array<{ dayName: string; dayIndex: number; qty: number; isBought: boolean }> = [];

          daysDetail.forEach((day) => {
            const match = day.items.find((di) => di.itemId === item.itemId);
            if (match) {
              const dayServing = getDayServing(day.dayIndex);
              const dayQty = Math.round(match.baseDayQuantity * dayServing * 100) / 100;
              weekTotalScaledQuantity += dayQty;
              const isBought = dayPurchases.has(`${day.dayIndex}_${item.itemId}`);
              dayBreakdown.push({
                dayName: `Ngày ${day.dayIndex + 1}`,
                dayIndex: day.dayIndex,
                qty: dayQty,
                isBought,
              });
            }
          });

          // Nếu là gia vị chung
          if (dayBreakdown.length === 0) {
            calendarDays.forEach((d) => {
              const dayServing = getDayServing(d.index);
              const dayQty = Math.round((item.quantity / totalDays) * dayServing * 100) / 100;
              weekTotalScaledQuantity += dayQty;
              const isBought = dayPurchases.has(`${d.index}_${item.itemId}`);
              dayBreakdown.push({
                dayName: `Ngày ${d.index + 1}`,
                dayIndex: d.index,
                qty: dayQty,
                isBought,
              });
            });
          }

          weekTotalScaledQuantity = Math.round(weekTotalScaledQuantity * 100) / 100;
          if (weekTotalScaledQuantity === 0) {
            weekTotalScaledQuantity = Math.round(item.quantity * allDaysServings * 100) / 100;
          }

          const daysUsingCount = dayBreakdown.length;
          const daysBoughtCount = dayBreakdown.filter((b) => b.isBought).length;
          // Món cả tuần coi như mua đủ nếu tất cả các ngày cần món này đều đã được tích
          const isPurchasedAllDays = daysUsingCount > 0 && daysBoughtCount === daysUsingCount;

          const breakdownText =
            dayBreakdown.length > 1
              ? `Cộng dồn: ${dayBreakdown.map((b) => `${b.dayName} (${formatQuantity(b.qty, item.unit)})`).join(' + ')}`
              : '';

          return {
            itemId: item.itemId,
            name: item.name,
            unit: item.unit,
            isPurchased: isPurchasedAllDays,
            scaledQuantity: weekTotalScaledQuantity,
            servingLabel: allDaysServings !== 1 ? `x${allDaysServings}` : '',
            sources: rawSources,
            isCommon: false,
            breakdownText,
            daysUsingCount,
            daysBoughtCount,
          };
        });
      } else {
        // Chế độ TỪNG NGÀY:
        // Định lượng = baseDayQuantity * getDayServing(activeTab)
        // Mua riêng độc lập cho ngày này: dayPurchases.has(`${activeTab}_${itemId}`)
        const currentDayIndex = activeTab;
        const dayServing = getDayServing(currentDayIndex);
        const dayItemsInStall = (activeDayData?.items ?? []).filter((i) => i.aisleCode === code);

        stallItems = dayItemsInStall.map((item) => {
          const scaledQuantity = Math.round(item.baseDayQuantity * dayServing * 100) / 100;
          const isPurchasedInThisDay = dayPurchases.has(`${currentDayIndex}_${item.itemId}`);

          return {
            itemId: item.itemId,
            name: item.name,
            unit: item.unit,
            isPurchased: isPurchasedInThisDay,
            scaledQuantity,
            servingLabel: dayServing !== 1 ? `x${dayServing}` : '',
            sources: item.matchingSources,
            isCommon: false,
          };
        });

        // Nếu là quầy gia vị (CONDIMENTS) và có gia vị dùng chung:
        if (code === 'CONDIMENTS' && commonItems.length > 0) {
          commonItems
            .filter((i) => i.aisleCode === 'CONDIMENTS')
            .forEach((item) => {
              const scaledQuantity = Math.round((item.quantity / totalDays) * dayServing * 100) / 100;
              const isPurchasedInThisDay = dayPurchases.has(`${currentDayIndex}_${item.itemId}`);
              stallItems.push({
                itemId: item.itemId,
                name: item.name,
                unit: item.unit,
                isPurchased: isPurchasedInThisDay,
                scaledQuantity,
                servingLabel: dayServing !== 1 ? `x${dayServing}` : '',
                sources: ['Gia vị dùng chung cả tuần'],
                isCommon: true,
              });
            });
        }
      }

      const totalCount = stallItems.length;
      const purchasedCount = stallItems.filter((i) => i.isPurchased).length;
      const visibleItems = hidePurchased ? stallItems.filter((i) => !i.isPurchased) : stallItems;

      return {
        code,
        label: info.label,
        icon: info.icon,
        totalCount,
        purchasedCount,
        items: visibleItems,
      };
    });
  }, [
    activeTab,
    allItems,
    dayServings,
    allDaysServings,
    daysDetail,
    activeDayData,
    commonItems,
    hidePurchased,
    dayPurchases,
    calendarDays,
    totalDays,
  ]);

  // Xử lý toggle mua nguyên liệu (độc lập từng ngày hoặc cả tuần)
  const toggleItemInView = (itemId: number) => {
    if (activeTab === 'ALL') {
      // Khi đang xem CẢ TUẦN: Bấm checkbox sẽ đánh dấu hoặc bỏ đánh dấu cho TẤT CẢ các ngày cần món này
      const daysNeeding = daysDetail
        .filter((d) => d.items.some((i) => i.itemId === itemId))
        .map((d) => d.dayIndex);
      const targetDays = daysNeeding.length > 0 ? daysNeeding : calendarDays.map((d) => d.index);

      setDayPurchases((prev) => {
        const next = new Set(prev);
        const alreadyAllBought = targetDays.every((d) => next.has(`${d}_${itemId}`));

        if (alreadyAllBought) {
          // Bỏ chọn tất cả các ngày
          targetDays.forEach((d) => next.delete(`${d}_${itemId}`));
          toggleItem.mutate({ itemId, isPurchased: false });
        } else {
          // Đánh dấu đã mua cho tất cả các ngày
          targetDays.forEach((d) => next.add(`${d}_${itemId}`));
          toggleItem.mutate({ itemId, isPurchased: true });
        }
        return next;
      });
    } else {
      // Khi đang xem MỘT NGÀY CỤ THỂ (activeTab):
      // CHỈ ĐÁNH DẤU CHO RIÊNG NGÀY NÀY! Không ảnh hưởng đến ngày khác (Ngày 1 không liên quan Ngày 5)!
      const currentDayIndex = activeTab;
      setDayPurchases((prev) => {
        const next = new Set(prev);
        const key = `${currentDayIndex}_${itemId}`;
        const wasBought = next.has(key);

        if (wasBought) {
          next.delete(key);
        } else {
          next.add(key);
        }

        // Kiểm tra xem tất cả các ngày dùng món này đã mua đủ chưa để đồng bộ trạng thái backend
        const daysNeeding = daysDetail
          .filter((d) => d.items.some((i) => i.itemId === itemId))
          .map((d) => d.dayIndex);
        const targetDays = daysNeeding.length > 0 ? daysNeeding : [currentDayIndex];
        const allBought = targetDays.every((d) => next.has(`${d}_${itemId}`));

        toggleItem.mutate({ itemId, isPurchased: allBought });

        return next;
      });
    }
  };

  // Xử lý thay đổi khẩu phần
  const handleUpdateServings = (newVal: number) => {
    const val = Math.max(1, Math.min(20, newVal));
    if (activeTab === 'ALL') {
      // Đặt cho cả tuần -> đồng bộ tất cả các ngày
      setAllDaysServings(val);
      setDayServings({});
    } else {
      // Đặt riêng cho ngày đang xem -> Định lượng ngày này tăng, và tổng cả tuần tự động cộng dồn tăng theo!
      setDayServings((prev) => ({
        ...prev,
        [activeTab]: val,
      }));
    }
  };

  // Áp dụng khẩu phần của ngày hiện tại cho cả tuần
  const handleApplyToAllDays = () => {
    if (activeTab === 'ALL') return;
    const current = getDayServing(activeTab);
    setAllDaysServings(current);
    setDayServings({});
    notifySuccess(`Đã áp dụng khẩu phần ${current} người cho tất cả các ngày trong tuần.`);
  };

  // Khôi phục khẩu phần ngày hiện tại theo cả tuần
  const handleResetToAllDays = () => {
    if (activeTab === 'ALL') return;
    setDayServings((prev) => {
      const copy = { ...prev };
      delete copy[activeTab];
      return copy;
    });
    notifySuccess(`Đã khôi phục Ngày ${activeTab + 1} theo khẩu phần cả tuần (${allDaysServings} người).`);
  };


  // Số món unique cả tuần đã mua đủ tất cả các ngày
  const fullyPurchasedWeekItemsCount = useMemo(() => {
    return allItems.filter((item) => {
      const daysUsing = daysDetail
        .filter((d) => d.items.some((i) => i.itemId === item.itemId))
        .map((d) => d.dayIndex);
      const targetDays = daysUsing.length > 0 ? daysUsing : calendarDays.map((d) => d.index);
      return targetDays.length > 0 && targetDays.every((d) => dayPurchases.has(`${d}_${item.itemId}`));
    }).length;
  }, [allItems, daysDetail, calendarDays, dayPurchases]);

  const getMealStats = (meal: { title: string; recipeTitle?: string }) => {
    if (!activeDayData) return { purchased: 0, total: 0 };
    const tLower = meal.title.trim().toLowerCase();
    const rtLower = (meal.recipeTitle ?? '').trim().toLowerCase();

    const mealItems = activeDayData.items.filter((item) =>
      item.matchingSources?.some((source) => {
        const sLower = source.trim().toLowerCase();
        if (!sLower) return false;
        if (tLower && (sLower === tLower || sLower.includes(tLower) || tLower.includes(sLower))) return true;
        if (rtLower && (sLower === rtLower || sLower.includes(rtLower) || rtLower.includes(sLower))) return true;
        return false;
      })
    );
    const purchased = mealItems.filter((i) => i.isPurchasedInThisDay).length;
    return { purchased, total: mealItems.length };
  };

  // Đếm số món ăn trong ngày đã hoàn thành mua đủ 100% nguyên liệu
  const activeCompletedMealsCount = useMemo(() => {
    if (!activeDayData?.meals || activeDayData.meals.length === 0) return 0;
    return activeDayData.meals.filter((m) => {
      const stats = getMealStats(m);
      return stats.total > 0 && stats.purchased === stats.total;
    }).length;
  }, [activeDayData, dayPurchases]);

  if (!validId || notFound) {
return (
      <EmptyState
        icon="search_off"
        title="Không tìm thấy danh sách đi chợ"
        description="Danh sách không tồn tại hoặc thuộc thực đơn của người khác."
        action={
          <Link
            to={PATHS.MEAL_PLANS.ROOT}
            className="inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
          >
            Về thực đơn tuần
          </Link>
        }
      />
    );
  }

  if (list.isPending) {
return (
      <div className={PAGE} role="status" aria-busy="true" aria-label="Đang tải danh sách đi chợ">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-16" />
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />;

  const { status } = list.data;
  const pending = status === 'PENDING';

  // Tính phần trăm tiến độ tương ứng theo chế độ xem
  const activePurchasedCount = activeTab === 'ALL' ? fullyPurchasedWeekItemsCount : (activeDayData?.purchasedCount ?? 0);
  const activeTotalCount = activeTab === 'ALL' ? allItems.length : (activeDayData?.totalCount ?? 0);
  const percent = activeTotalCount > 0 ? Math.round((activePurchasedCount / activeTotalCount) * 100) : 0;

  const changeStatus = (next: 'COMPLETED' | 'CANCELLED') =>
    setStatus.mutate(next, {
      onSuccess: (res) => {
        setConfirmCancel(false);
        notifySuccess(res.message && res.message !== 'OK' ? res.message : next === 'COMPLETED' ? 'Đã hoàn tất danh sách.' : 'Đã hủy danh sách.');
      },
      onError: (error) => {
        setConfirmCancel(false);
        notifyApiError(error);
      },
    });

  const runExport = () =>
    exportPdf.mutate('PLAN,SHOPPING', {
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.errorCode === 'ERR_VIP_REQUIRED') setUpsellMessage(getErrorMessage(apiError));
        else notifyApiError(apiError);
      },
    });



  return (
    <div className={PAGE}>
      {/* Thanh điều hướng quay lại & Breadcrumb */}
      <div className="flex items-center justify-between gap-space-sm pb-1 flex-wrap">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container hover:text-primary active:scale-95 cursor-pointer"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          <span>Quay lại</span>
        </button>

        <nav aria-label="Đường dẫn" className="flex min-w-0 max-w-full items-center gap-space-xs font-label-md text-label-md whitespace-nowrap text-on-surface-variant">
          <Link to={PATHS.HOME} className="shrink-0 text-on-surface-variant no-underline hover:text-primary">
            Trang chủ
          </Link>
          <span className="text-outline-variant">/</span>
          <Link to={PATHS.MEAL_PLANS.ROOT} className="shrink-0 text-on-surface-variant no-underline hover:text-primary">
            Thực đơn tuần
          </Link>
          {planId && (
            <>
              <span className="text-outline-variant">/</span>
              <Link
                to={PATHS.MEAL_PLANS.DETAIL(planId)}
                className="shrink-0 text-on-surface-variant no-underline hover:text-primary sm:max-w-[200px] truncate"
              >
                {planData?.planName || `Thực đơn #${planId}`}
              </Link>
            </>
          )}
          <span className="text-outline-variant">/</span>
          <span aria-current="page" className="min-w-0 truncate text-primary font-semibold sm:max-w-[320px]">
            Danh sách đi chợ
          </span>
        </nav>
      </div>

      {/* Header chính */}
      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-serif font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
            Danh sách đi chợ
          </h1>
          <p className="text-xs text-on-surface-variant">
            {planData?.planName ? `Theo kế hoạch ${planData.planName}` : 'Phân loại nguyên liệu theo quầy hàng giúp đi chợ nhanh chóng, không bỏ sót'}
          </p>
        </div>
      </header>



      {/* THANH CHỌN PHẠM VI XEM: CẢ TUẦN HOẶC TỪNG NGÀY ĐỘC LẬP */}
      <section aria-label="Chọn ngày đi chợ" className="flex flex-col gap-2">
        <div role="tablist" aria-label="Danh sách các ngày đi chợ" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {/* Tab Cả tuần */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            onClick={() => handleTabChange('ALL')}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all shrink-0',
              activeTab === 'ALL'
                ? 'bg-primary-container text-on-primary shadow-sm font-bold ring-2 ring-primary/20'
                : 'bg-surface-container-lowest text-on-surface border border-surface-container hover:bg-surface-container hover:text-primary'
            )}
          >
            <Icon name="shopping_cart" className="text-[18px]" />
            <span>Cả tuần ({totalDays} ngày)</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                activeTab === 'ALL'
                  ? 'bg-white/25 text-white'
                  : 'bg-surface-container text-on-surface-variant'
              )}
            >
              {fullyPurchasedWeekItemsCount}/{allItems.length}
            </span>
          </button>

          {/* Các tab từng ngày: Tích ở Ngày 1 hoàn toàn độc lập với Ngày 5! */}
          {calendarDays.map((day) => {
            const dayData = daysDetail.find((d) => d.dayIndex === day.index);
            const dayItemCount = dayData?.totalCount ?? 0;
            const dayPurchased = dayData?.purchasedCount ?? 0;
            const isActive = activeTab === day.index;

        return (
              <button
                key={day.index}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(day.index)}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all shrink-0',
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm font-bold ring-2 ring-primary/20'
                    : 'bg-surface-container-lowest text-on-surface border border-surface-container hover:bg-surface-container hover:text-primary'
                )}
              >
                <span>{day.header}</span>
                {dayItemCount > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums',
                      isActive
                        ? 'bg-white/25 text-white'
                        : dayPurchased === dayItemCount
                          ? 'bg-primary-fixed text-on-primary-fixed'
                          : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {dayPurchased}/{dayItemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* KHỐI ĐIỀU CHỈNH KHẨU PHẦN ĂN: TINH GỌN, RÕ RÀNG */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-surface-container bg-surface-container-lowest p-3.5 sm:p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary shadow-2xs">
            <Icon name={activeTab === 'ALL' ? 'groups' : 'person'} className="text-[22px]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm sm:text-base text-on-surface">
              {activeTab === 'ALL'
                ? 'Khẩu phần cả tuần:'
                : `Khẩu phần ${activeDayData?.header ?? `Ngày ${activeTab + 1}`}:`}
            </span>
            <span className="rounded-md bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 text-xs font-bold shadow-2xs">
              x{currentServings} người ăn
            </span>
          </div>
        </div>

        {/* Bộ điều khiển */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {activeTab !== 'ALL' && isCustomDayServing && (
            <button
              type="button"
              onClick={handleApplyToAllDays}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-fixed/40 hover:bg-primary-fixed/70 px-3 py-1.5 text-xs font-semibold text-primary transition-colors shadow-2xs"
              title="Áp dụng số người này cho tất cả các ngày trong tuần"
            >
              <Icon name="sync" className="text-[14px]" />
              Áp dụng cho cả tuần
            </button>
          )}

          {/* Stepper */}
          <div className="flex items-center rounded-xl border border-surface-container bg-surface-container-low p-1 shadow-inner">
            <button
              type="button"
              aria-label="Giảm 1 người"
              disabled={currentServings <= 1}
              onClick={() => handleUpdateServings(currentServings - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Icon name="remove" className="text-[18px]" />
            </button>
            <span className="w-20 text-center font-serif text-sm font-bold text-on-surface tabular-nums">
              {currentServings} người
            </span>
            <button
              type="button"
              aria-label="Tăng 1 người"
              disabled={currentServings >= 20}
              onClick={() => handleUpdateServings(currentServings + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Icon name="add" className="text-[18px]" />
            </button>
          </div>
        </div>
      </section>

      {status === 'COMPLETED' && (
        <FormAlert tone="success" title="Danh sách đã hoàn tất">
          Bạn đã mua xong nguyên liệu cho thực đơn này.
        </FormAlert>
      )}
      {status === 'CANCELLED' && (
        <FormAlert tone="info" title="Danh sách đã hủy">
          Danh sách này chỉ còn để xem, không đánh dấu được nữa.
        </FormAlert>
      )}

      {/* KHỐI HỢP NHẤT: TIẾN ĐỘ MUA SẮM & THỰC ĐƠN BỮA ĂN TRONG NGÀY */}
      <section
        aria-label="Tiến độ mua và thực đơn trong ngày"
        className="flex flex-col gap-space-sm rounded-2xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card"
      >
        {/* Header tiến độ mua sắm */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Icon name="shopping_bag" className="text-[20px] text-primary" />
              <div className="flex flex-col gap-0.5">
                <p className="font-sans font-bold text-sm sm:text-base text-on-surface">
                  {activeTab === 'ALL'
                    ? `Đã mua ${fullyPurchasedWeekItemsCount}/${allItems.length} nguyên liệu cả tuần`
                    : `Đã mua ${activePurchasedCount}/${activeTotalCount} nguyên liệu của ${activeDayData?.header ?? `Ngày ${activeTab + 1}`}`}
                </p>
                {activeTab !== 'ALL' && activeDayData && activeDayData.meals.length > 0 && (
                  <p className="font-body-xs text-xs text-on-surface-variant">
                    Hoàn tất <strong>{activeCompletedMealsCount}/{activeDayData.meals.length} món ăn</strong> theo thực đơn trong ngày
                  </p>
                )}
              </div>
            </div>

          </div>

          <label className="flex cursor-pointer items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface">
            <input
              type="checkbox"
              checked={hidePurchased}
              onChange={(event) => setHidePurchased(event.target.checked)}
              className="accent-primary h-4 w-4 rounded cursor-pointer"
            />
            Ẩn món đã mua
          </label>
        </div>

        {/* Thanh tiến độ chung */}
        <div
          className="h-2.5 overflow-hidden rounded-full bg-surface-container"
          role="progressbar"
          aria-label="Tiến độ mua"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>

        {/* Thực đơn các bữa ăn trong ngày: Đồng bộ thiết kế chuẩn VeggieLife, mặc định ẩn để gọn UI */}
        {activeTab !== 'ALL' && activeDayData && activeDayData.meals.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={() => setShowDayMeals((prev) => !prev)}
              className="flex items-center justify-between w-full py-0.5 text-left font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none group"
              aria-expanded={showDayMeals}
            >
              <span className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                Thực đơn trong ngày ({activeDayData.meals.length} bữa)
              </span>

              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant group-hover:text-primary transition-colors">
                <span>{showDayMeals ? 'Thu gọn' : 'Xem thực đơn'}</span>
                <Icon
                  name={showDayMeals ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  className="text-[18px] transition-transform duration-200"
                />
              </span>
            </button>

            {showDayMeals && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-0.5">
                {activeDayData.meals.map((meal) => {
                  const mealTypeKey = meal.mealType as keyof typeof MEAL_LABEL;
                  const stats = getMealStats(meal);
                  const isComplete = stats.total > 0 && stats.purchased === stats.total;

                  const recipeUrl = meal.recipeId
                    ? PATHS.RECIPES.DETAIL(meal.recipeId)
                    : `${PATHS.RECIPES.ROOT}?search=${encodeURIComponent(meal.title)}`;

                  return (
                    <Link
                      key={meal.slotId}
                      to={recipeUrl}
                      state={{ returnUrl: `${location.pathname}?tab=${activeTab}&servings=${allDaysServings}` }}
                      className={cn(
                        'group relative flex flex-col justify-between gap-2.5 rounded-2xl border p-3.5 transition-all no-underline shadow-2xs',
                        isComplete
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20'
                          : 'border-primary/25 bg-gradient-to-r from-primary-container/15 via-surface-container-lowest to-surface-container-lowest hover:border-primary/50 hover:shadow-xs'
                      )}
                      title={`Xem công thức nấu: ${meal.title}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'font-sans font-semibold text-sm sm:text-base tracking-normal',
                          isComplete ? 'text-primary' : 'text-on-surface'
                        )}>
                          {MEAL_LABEL[mealTypeKey] || 'Bữa ăn'}
                        </span>

                        {stats.total > 0 ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-3 py-1 font-sans text-xs font-semibold tabular-nums shadow-2xs transition-all',
                              isComplete
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : stats.purchased > 0
                                ? 'bg-primary-fixed text-on-primary-fixed'
                                : 'bg-surface-container text-on-surface-variant'
                            )}
                          >
                            <Icon
                              name={isComplete ? "check_circle" : stats.purchased > 0 ? "check" : "shopping_bag"}
                              className={cn("text-[13px]", isComplete ? "text-on-primary" : stats.purchased > 0 ? "text-on-primary-fixed" : "text-on-surface-variant")}
                            />
                            <span>
                              {isComplete
                                ? "Đã mua đủ món"
                                : stats.purchased > 0
                                ? `Đã mua ${stats.purchased}/${stats.total}`
                                : `Chưa mua (${stats.purchased}/${stats.total})`}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/60 text-on-primary-fixed px-3 py-1 font-sans text-xs font-semibold shadow-2xs">
                            <Icon name="check_circle" className="text-[13px] text-on-primary-fixed" />
                            Theo thực đơn
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border-l-4 border-t-0 border-r-0 border-b-0 border-primary bg-surface-container-low/70 px-4 py-3 transition-all",
                        isComplete
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface hover:bg-surface-container-low"
                      )}
                      style={{
                        borderLeft: "4px solid var(--color-primary, #3d5c47)",
                        borderTop: "none",
                        borderRight: "none",
                        borderBottom: "none",
                      }}
                      >
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <span className="text-xs text-on-surface-variant font-medium">
                            Món ăn theo thực đơn:
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isComplete && (
                              <Icon name="check_circle" className="text-[15px] text-primary shrink-0" />
                            )}
                            <p
                              className={cn(
                                "line-clamp-1 font-sans font-semibold text-sm transition-colors",
                                isComplete ? "text-primary" : "text-on-surface group-hover:text-primary"
                              )}
                              title={meal.title}
                            >
                              {meal.title}
                            </p>
                          </div>
                        </div>
                        <Icon
                          name="arrow_forward"
                          className={cn(
                            "text-[18px] transition-all shrink-0",
                            isComplete
                              ? "text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5"
                              : "text-primary/70 group-hover:text-primary group-hover:translate-x-0.5"
                          )}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* DANH SÁCH NGUYÊN LIỆU PHÂN THEO 4 QUẦY HÀNG (RAU CỦ, ĐẬM THỰC VẬT, ĐỒ KHÔ, GIA VỊ) */}
      <section aria-label="Các quầy hàng đi chợ" className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="storefront" className="text-[20px] text-primary" />
            <h2 className="font-serif font-bold text-base text-on-surface">
              {activeTab === 'ALL'
                ? `Nguyên liệu cả tuần (Cộng dồn tất cả ${totalDays} ngày):`
                : `Nguyên liệu cần mua riêng cho ${activeDayData?.header ?? `Ngày ${activeTab + 1}`} theo quầy:`}
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant">
            4 quầy hàng tiện lợi: Rau củ quả • Đậu hạt &amp; đạm • Đồ khô • Gia vị
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2">
          {aislesGrouped.map((aisle) => {
            const isCompletedAisle = aisle.totalCount > 0 && aisle.purchasedCount === aisle.totalCount;

        return (
              <section
                key={aisle.code}
                aria-labelledby={`aisle-heading-${aisle.code}`}
                className="flex flex-col gap-space-sm rounded-2xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card transition-all"
              >
                {/* Header quầy */}
                <header className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                      <Icon name={aisle.icon} className="text-[20px]" />
                    </span>
                    <div>
                      <h3 id={`aisle-heading-${aisle.code}`} className="font-serif font-bold text-sm sm:text-base text-on-surface">
                        {aisle.label}
                      </h3>
                      <span className="text-[11px] text-on-surface-variant">
                        Quầy {aisle.label.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                      isCompletedAisle
                        ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                        : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {aisle.purchasedCount}/{aisle.totalCount} đã mua
                  </span>
                </header>

                {/* Danh sách nguyên liệu trong quầy */}
                {aisle.totalCount === 0 ? (
                  <p className="px-1 py-4 text-xs text-outline text-center">
                    {activeTab === 'ALL'
                      ? 'Thực đơn này không có món nào cần mua ở quầy này.'
                      : `Ngày này không cần mua nguyên liệu ở quầy ${aisle.label.toLowerCase()}.`}
                  </p>
                ) : aisle.items.length === 0 ? (
                  <p className="px-1 py-4 text-xs text-primary font-medium text-center">
                    Đã mua đủ {aisle.totalCount} món ở quầy này 🎉
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-surface-container/50">
                    {aisle.items.map((item) => (
                      <li key={`${activeTab}-${item.itemId}`}>
                        <label
                          className={cn(
                            'flex items-center gap-space-sm rounded-lg px-2 py-2.5 transition-colors',
                            pending ? 'cursor-pointer hover:bg-surface-container-low' : 'cursor-default'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.isPurchased}
                            disabled={!pending}
                            onChange={() => toggleItemInView(item.itemId)}
                            className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'min-w-0 font-body-md text-body-md',
                                  item.isPurchased ? 'text-outline line-through' : 'text-on-surface font-medium'
                                )}
                              >
                                {item.name}
                              </span>

                            </div>


                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-label-md text-label-md text-on-surface-variant tabular-nums font-semibold">
                                {formatQuantity(item.scaledQuantity, item.unit)}
                              </span>
                              {item.servingLabel && (
                                <span className="rounded-md bg-secondary-fixed/50 px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-fixed">
                                  {item.servingLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        show={confirmCancel}
        title="Hủy danh sách đi chợ?"
        message="Danh sách sẽ chuyển sang trạng thái đã hủy và không đánh dấu được nữa."
        confirmLabel="Hủy danh sách"
        cancelLabel="Giữ lại"
        danger
        loading={setStatus.isPending && setStatus.variables === 'CANCELLED'}
        onConfirm={() => changeStatus('CANCELLED')}
        onCancel={() => setConfirmCancel(false)}
      />

      <VipUpsellDialog
        show={upsellMessage !== null}
        onHide={() => setUpsellMessage(null)}
        title="Xuất PDF dành cho VIP"
        message={upsellMessage}
      />
    </div>
  );
};

export default ShoppingList;
