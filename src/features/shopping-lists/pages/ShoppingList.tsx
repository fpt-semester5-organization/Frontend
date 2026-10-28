import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { formatDate, getWeekdayShort } from '@/features/meal-plans/lib/dates';
import { DAYS, DAY_LABEL } from '@/features/meal-plans/lib/labels';
import { dateOfDay, labelOfDay } from '@/features/meal-plans/lib/plan.utils';
import type { DayOfWeek } from '@/features/meal-plans/types/mealPlan.types';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { forgetShoppingList, planIdOfList } from '../hooks/shoppingListLinks';
import { useSetShoppingListStatus, useShoppingList, useToggleShoppingItem } from '../hooks/useShoppingList';
import { AISLE_ORDER, aisleInfo, formatQuantity, LIST_STATUS } from '../lib/aisles';
import type { ShoppingAisle, ShoppingItem } from '../types/shoppingList.types';

const PAGE = 'mx-auto flex w-full max-w-[1100px] flex-col gap-space-md px-margin-mobile pt-6 pb-space-lg sm:px-margin sm:pt-8';

type DayFilter = 'ALL' | DayOfWeek;

const DAY_FILTERS: { key: DayFilter; label: string; short: string }[] = [
  { key: 'ALL', label: 'Cả tuần', short: 'Cả tuần' },
  { key: 'MON', label: 'Thứ 2', short: 'T2' },
  { key: 'TUE', label: 'Thứ 3', short: 'T3' },
  { key: 'WED', label: 'Thứ 4', short: 'T4' },
  { key: 'THU', label: 'Thứ 5', short: 'T5' },
  { key: 'FRI', label: 'Thứ 6', short: 'T6' },
  { key: 'SAT', label: 'Thứ 7', short: 'T7' },
  { key: 'SUN', label: 'Chủ nhật', short: 'CN' },
];

const PRESET_SERVINGS = [1, 2, 4, 6];

const orderAisles = (aisles: ShoppingAisle[]) =>
  [...aisles].sort((a, b) => {
    const rank = (code: string) => {
      const index = AISLE_ORDER.indexOf(code as (typeof AISLE_ORDER)[number]);
      return index === -1 ? AISLE_ORDER.length : index;
    };
    return rank(a.aisle) - rank(b.aisle);
  });

/**
 * SCR-24 shopping-lists/ShoppingList — /shopping-lists/:id.
 * FN-MEAL-06 (xem, đánh dấu, hoàn tất/hủy), FN-MEAL-08 (xuất PDF, VIP).
 * Tính năng mở rộng theo Review 19/10:
 * 1. Bộ lọc danh sách đi chợ theo từng ngày trong tuần (T2 đến CN) hoặc Cả tuần.
 * 2. Tùy chọn số người ăn (Servings: 1, 2, 4...) tự động nhân khối lượng chuẩn (g/kg).
 * 3. Hỗ trợ tùy chỉnh mỗi ngày một khẩu phần ăn khác nhau.
 */
const ShoppingList: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const listId = Number(id);
  const validId = Number.isInteger(listId) && listId > 0;
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);

  const list = useShoppingList(listId);
  const toggleItem = useToggleShoppingItem(listId);
  const setStatus = useSetShoppingListStatus(listId);

  const planId = (validId ? planIdOfList(listId) : null) ?? list.data?.planId ?? null;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (planId) {
      navigate(PATHS.MEAL_PLANS.DETAIL(planId));
    } else {
      navigate(PATHS.MEAL_PLANS.ROOT);
    }
  };
  const planQuery = useMealPlan(planId ?? 0);
  const plan = planQuery.data;

  const exportPdf = useExportPdf(planId ?? 0);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState<string | null>(null);

  // --- 1. Bộ lọc ngày (URL Param sync) ---
  const [searchParams, setSearchParams] = useSearchParams();
  const paramDay = searchParams.get('day');
  const [dayFilter, setDayFilter] = useState<DayFilter>(() => {
    if (paramDay && (DAYS as readonly string[]).includes(paramDay)) {
      return paramDay as DayOfWeek;
    }
    return 'ALL';
  });

  const handleSelectDayFilter = (newFilter: DayFilter) => {
    setDayFilter(newFilter);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newFilter === 'ALL') {
          next.delete('day');
        } else {
          next.set('day', newFilter);
        }
        return next;
      },
      { replace: true }
    );
  };

  // --- Bộ lọc quầy nguyên liệu (Aisle Filter Tabbar) ---
  const [aisleFilter, setAisleFilter] = useState<string>('ALL');

  // --- 2. Khẩu phần ăn & 3. Khẩu phần riêng từng ngày (LocalStorage persistence) ---
  const storagePrefix = `vl_shopping_servings_${listId}`;

  const [servings, setServings] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_global`);
      return saved ? Math.max(1, Math.min(20, Number(saved))) : 1;
    } catch {
      return 1;
    }
  });

  const [isCustomPerDay, setIsCustomPerDay] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${storagePrefix}_custom_enabled`) === 'true';
    } catch {
      return false;
    }
  });

  const [dayServings, setDayServings] = useState<Record<DayOfWeek, number>>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_per_day`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { MON: 1, TUE: 1, WED: 1, THU: 1, FRI: 1, SAT: 1, SUN: 1 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}_global`, String(servings));
      localStorage.setItem(`${storagePrefix}_custom_enabled`, String(isCustomPerDay));
      localStorage.setItem(`${storagePrefix}_per_day`, JSON.stringify(dayServings));
    } catch {
      // ignore
    }
  }, [servings, isCustomPerDay, dayServings, storagePrefix]);

  const notFound = list.isError && toApiError(list.error).status === 404;
  useEffect(() => {
    if (notFound) forgetShoppingList(listId);
  }, [notFound, listId]);

  // Ánh xạ tên món ăn -> các ngày trong tuần từ plan.slots (nếu API chưa có trường item.days)
  const recipeDayMap = useMemo(() => {
    if (!plan?.slots) return new Map<string, DayOfWeek[]>();
    const map = new Map<string, DayOfWeek[]>();
    for (const slot of plan.slots) {
      const title = slot.recipe?.title;
      if (!title) continue;
      const existing = map.get(title) ?? [];
      if (!existing.includes(slot.dayOfWeek)) {
        existing.push(slot.dayOfWeek);
        map.set(title, existing);
      }
    }
    return map;
  }, [plan?.slots]);

  // Trích xuất các ngày mà nguyên liệu được sử dụng
  const getItemDays = (item: ShoppingItem): DayOfWeek[] => {
    if (item.days && item.days.length > 0) {
      const valid = item.days
        .map((d) => String(d).toUpperCase())
        .filter((d): d is DayOfWeek => (DAYS as readonly string[]).includes(d));
      if (valid.length > 0) return valid;
    }
    if (item.recipeSources && item.recipeSources.length > 0 && recipeDayMap.size > 0) {
      const matched = new Set<DayOfWeek>();
      for (const src of item.recipeSources) {
        const cleanSrc = src.trim().toLowerCase();
        for (const [title, days] of recipeDayMap.entries()) {
          if (title.trim().toLowerCase() === cleanSrc) {
            days.forEach((d) => matched.add(d));
          }
        }
      }
      if (matched.size > 0) return Array.from(matched);
    }
    return DAYS;
  };

  // Trích xuất định lượng chuẩn của từng ngày
  const getItemDayQuantities = (item: ShoppingItem, days: DayOfWeek[]): Record<DayOfWeek, number> => {
    const result: Partial<Record<DayOfWeek, number>> = {};
    if (item.dayQuantities && Object.keys(item.dayQuantities).length > 0) {
      // Chuẩn hóa key về uppercase (ví dụ "mon" -> "MON")
      const normalizedMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(item.dayQuantities)) {
        normalizedMap[String(k).toUpperCase()] = Number(v);
      }
      for (const d of days) {
        if (normalizedMap[d] !== undefined && !Number.isNaN(normalizedMap[d])) {
          result[d] = normalizedMap[d];
        }
      }
    }
    const count = days.length || 1;
    for (const d of days) {
      if (result[d] === undefined || result[d] === 0) {
        result[d] = item.quantity / count;
      }
    }
    return result as Record<DayOfWeek, number>;
  };

  // Tính khối lượng chuẩn đã nhân theo khẩu phần và bộ lọc ngày
  // Tính khối lượng chuẩn đã nhân theo khẩu phần và bộ lọc ngày
  const calculateScaledItem = (item: ShoppingItem) => {
    const days = getItemDays(item);
    const dayQtys = getItemDayQuantities(item, days);

    if (dayFilter !== 'ALL') {
      const isVisible = days.includes(dayFilter);
      if (!isVisible) {
        return { isVisible: false, quantity: 0, baseQuantity: 0, deltaQuantity: 0, days, factor: 1 };
      }
      const baseDayQty = dayQtys[dayFilter] ?? (item.quantity / (days.length || 1));
      const factor = dayServings[dayFilter] ?? servings ?? 1;
      const scaledQty = Math.max(0.1, baseDayQty * factor);
      const deltaQty = scaledQty - baseDayQty;
      return {
        isVisible: true,
        quantity: scaledQty,
        baseQuantity: baseDayQty,
        deltaQuantity: deltaQty,
        days,
        factor,
      };
    }

    // ALL (Cả tuần)
    let baseTotal = 0;
    for (const d of days) {
      baseTotal += dayQtys[d] ?? (item.quantity / (days.length || 1));
    }
    if (baseTotal <= 0) baseTotal = item.quantity;

    if (!isCustomPerDay) {
      const scaledQty = Math.max(0.1, baseTotal * servings);
      return {
        isVisible: true,
        quantity: scaledQty,
        baseQuantity: baseTotal,
        deltaQuantity: scaledQty - baseTotal,
        days,
        factor: servings,
      };
    }

    let total = 0;
    for (const d of days) {
      const baseDayQty = dayQtys[d] ?? (item.quantity / (days.length || 1));
      const factor = dayServings[d] ?? servings;
      total += baseDayQty * factor;
    }

    const scaledQty = Math.max(0.1, total);
    return {
      isVisible: true,
      quantity: scaledQty,
      baseQuantity: baseTotal,
      deltaQuantity: scaledQty - baseTotal,
      days,
      factor: servings,
    };
  };

  const rawAisles = useMemo(() => orderAisles(list.data?.aisles ?? []), [list.data?.aisles]);

  // Nhóm các nguyên liệu hiển thị theo từng quầy sau khi lọc ngày và tính định lượng
  const processedAisles = useMemo(() => {
    return rawAisles.map((aisle) => {
      const processedItems = aisle.items
        .map((item) => {
          const scaled = calculateScaledItem(item);
          return {
            ...item,
            scaledQuantity: scaled.quantity,
            baseQuantity: scaled.baseQuantity,
            deltaQuantity: scaled.deltaQuantity,
            scaledFactor: scaled.factor,
            isVisible: scaled.isVisible,
            usedDays: scaled.days,
          };
        })
        .filter((item) => item.isVisible);

      return {
        ...aisle,
        items: processedItems,
        totalItemsCount: processedItems.length,
        purchasedCount: processedItems.filter((i) => i.isPurchased).length,
      };
    });
  }, [rawAisles, dayFilter, isCustomPerDay, servings, dayServings, recipeDayMap]);

  // Lọc các quầy hiển thị theo tabbar quầy
  const displayedAisles = useMemo(() => {
    if (aisleFilter === 'ALL') return processedAisles;
    return processedAisles.filter((a) => a.aisle === aisleFilter);
  }, [processedAisles, aisleFilter]);

  // Đếm số món nguyên liệu cần mua cho mỗi ngày (để hiển thị badge trên thanh filter)
  const dayCounts = useMemo(() => {
    const counts: Record<DayFilter, number> = {
      ALL: 0,
      MON: 0,
      TUE: 0,
      WED: 0,
      THU: 0,
      FRI: 0,
      SAT: 0,
      SUN: 0,
    };
    const allItems = rawAisles.flatMap((a) => a.items);
    counts.ALL = allItems.length;

    for (const item of allItems) {
      const itemDays = getItemDays(item);
      for (const d of itemDays) {
        counts[d] = (counts[d] ?? 0) + 1;
      }
    }
    return counts;
  }, [rawAisles, recipeDayMap]);

  // Tính tiến độ mua theo bộ lọc hiện tại
  const visibleItems = useMemo(
    () => processedAisles.flatMap((a) => a.items),
    [processedAisles]
  );
  const currentTotal = visibleItems.length;
  const currentPurchased = visibleItems.filter((item) => item.isPurchased).length;
  const currentPercent = currentTotal > 0 ? Math.round((currentPurchased / currentTotal) * 100) : 0;

  // Thao tác chỉnh số người ăn (khi tăng số lượng thì số lượng đồ mua cũng tăng lên theo)
  const handleUpdateCurrentServings = (val: number) => {
    const nextVal = Math.max(1, Math.min(20, Math.round(val * 2) / 2));
    if (dayFilter !== 'ALL') {
      setDayServings((prev) => ({ ...prev, [dayFilter]: nextVal }));
      setIsCustomPerDay(true);
    } else {
      setServings(nextVal);
      // Khi đang xem cả tuần hoặc chỉnh khẩu phần chung, đồng bộ cho tất cả các ngày để đồ mua cả tuần tăng lên theo
      setDayServings({
        MON: nextVal,
        TUE: nextVal,
        WED: nextVal,
        THU: nextVal,
        FRI: nextVal,
        SAT: nextVal,
        SUN: nextVal,
      });
    }
  };

  const handleUpdateDayServing = (dayKey: DayOfWeek, val: number) => {
    const nextVal = Math.max(1, Math.min(20, Math.round(val * 2) / 2));
    setDayServings((prev) => ({ ...prev, [dayKey]: nextVal }));
    if (dayFilter === dayKey) {
      setServings(nextVal);
    }
  };

  const handleApplyToAllDays = () => {
    const target = dayFilter !== 'ALL' ? (dayServings[dayFilter] ?? servings) : servings;
    setDayServings({
      MON: target,
      TUE: target,
      WED: target,
      THU: target,
      FRI: target,
      SAT: target,
      SUN: target,
    });
    setServings(target);
    notifySuccess(`Đã áp dụng khẩu phần ${target} người cho toàn bộ 7 ngày.`);
  };

  const handleResetServings = () => {
    setServings(1);
    setDayServings({ MON: 1, TUE: 1, WED: 1, THU: 1, FRI: 1, SAT: 1, SUN: 1 });
    notifySuccess('Đã đặt lại khẩu phần mặc định: 1 người cho tất cả các ngày.');
  };

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
        <Skeleton className="h-20" />
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

  const { status, progress } = list.data;
  // Danh sách chỉ hoàn tất khi đã tích mua hết tất cả các món (progress.total > 0 && progress.purchased === progress.total)
  const isAllItemsPurchased = progress.total > 0 && progress.purchased === progress.total;
  const effectiveStatus = status === 'CANCELLED' ? 'CANCELLED' : isAllItemsPurchased ? 'COMPLETED' : 'PENDING';
  const pending = effectiveStatus === 'PENDING';

  const toggle = (itemId: number, isPurchased: boolean) =>
    toggleItem.mutate(
      { itemId, isPurchased },
      {
        onSuccess: (result) => {
          if (result.listStatus === 'COMPLETED') notifySuccess('Bạn đã mua đủ tất cả nguyên liệu, danh sách đi chợ đã hoàn tất.');
        },
        onError: (error) => notifyApiError(error),
      }
    );

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

  const runExport = () => {
    if (!isVip) {
      setUpsellMessage('Nâng cấp VIP để tải và xuất bản in PDF danh sách đi chợ chuyên nghiệp.');
      return;
    }
    exportPdf.mutate('PLAN,SHOPPING', {
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.errorCode === 'ERR_VIP_REQUIRED') setUpsellMessage(getErrorMessage(apiError));
        else notifyApiError(apiError);
      },
    });
  };

  // Số người ăn hiện hành hiển thị ở thanh điều khiển chính: Bấm vào ngày nào hiện khẩu phần ăn theo ngày đó
  const activeServingDisplay =
    dayFilter !== 'ALL' ? (dayServings[dayFilter] ?? 1) : servings;

  return (
    <div className={PAGE}>
      {/* Header Actions */}
      <header className="flex flex-col gap-space-sm">
        {/* Nút Quay lại nằm riêng ở trên */}
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary active:scale-95 cursor-pointer"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* Tiêu đề trang nằm bên dưới chữ Quay lại, nút Xuất file PDF ở bên tay phải */}
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
                Danh sách đi chợ
              </h1>
              <span className={cn('self-start rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold', LIST_STATUS[effectiveStatus].className)}>
                {LIST_STATUS[effectiveStatus].label}
              </span>
            </div>
            {plan && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Áp dụng cho thực đơn: <span className="font-semibold text-on-surface">{plan.planName}</span> ({formatDate(plan.startDate)} – {formatDate(plan.endDate)})
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              type="button"
              onClick={runExport}
              disabled={exportPdf.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-container bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-on-surface shadow-xs transition-colors hover:bg-surface-container hover:text-primary active:scale-95 cursor-pointer"
            >
              <Icon name="picture_as_pdf" className="text-[18px] text-secondary" />
              <span>{exportPdf.isPending ? 'Đang tạo PDF…' : isVip ? 'Xuất file PDF' : 'Xuất file PDF (VIP)'}</span>
            </button>
            {pending && (
              <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                Hủy danh sách
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 1. THANH BỘ LỌC NGÀY (FILTER THEO NGÀY TRONG TUẦN HOẶC CẢ TUẦN) */}
      <section aria-label="Bộ lọc ngày đi chợ" className="flex flex-col gap-space-xs rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
            <Icon name="filter_list" className="text-[18px] text-primary" />
            <span className="font-semibold">Xem nguyên liệu theo ngày:</span>
            {dayFilter !== 'ALL' && (
              <span className="rounded-md bg-primary-fixed/50 px-2 py-0.5 text-xs font-medium text-primary">
                Đang xem {DAY_LABEL[dayFilter]}
              </span>
            )}
          </div>
          {dayFilter === 'ALL' && (
            <span className="font-body-sm text-xs text-on-surface-variant">
              {dayCounts.ALL} món nguyên liệu cần chuẩn bị
            </span>
          )}
        </div>

        {/* Danh sách tab chọn ngày */}
        <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 pt-1.5 no-scrollbar" role="tablist">
          {DAY_FILTERS.map((f) => {
            const active = dayFilter === f.key;
            const count = dayCounts[f.key] ?? 0;
            const dt = f.key !== 'ALL' && plan ? dateOfDay(plan.startDate, f.key) : null;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectDayFilter(f.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 font-label-md text-label-md transition-all cursor-pointer',
                  active
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'border border-surface-container bg-surface-container-lowest text-on-surface hover:bg-surface-container hover:text-primary'
                )}
              >
                <span>{f.label}</span>
                {dt && <span className="text-[11px] opacity-80">({labelOfDay(plan!.startDate, f.key as DayOfWeek)})</span>}
                {f.key === 'ALL' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[11px] font-semibold tabular-nums',
                      active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. THANH CHỌN SỐ NGƯỜI ĂN (SERVINGS) & 3. TÙY CHỈNH KHẨU PHẦN TỪNG NGÀY */}
      <section aria-label="Tùy chỉnh khẩu phần ăn" className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
          {/* Tiêu đề & Thông báo trạng thái theo ngày đang chọn */}
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="groups" className="text-[22px] text-secondary" />
              <h2 className="font-label-lg text-label-lg font-bold text-on-surface">
                {dayFilter === 'ALL'
                  ? 'Khẩu phần ăn (Cả tuần)'
                  : `Khẩu phần ăn ${DAY_LABEL[dayFilter]} (${plan ? labelOfDay(plan.startDate, dayFilter) : ''})`}
              </h2>
              {dayFilter !== 'ALL' ? (
                <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                  {DAY_LABEL[dayFilter]}: {activeServingDisplay} người
                </span>
              ) : (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Cả tuần: {activeServingDisplay} người
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {dayFilter !== 'ALL'
                ? `Đang áp dụng ${activeServingDisplay} người cho ${DAY_LABEL[dayFilter]}. Khối lượng mua theo ngày sẽ tăng/giảm và ghi rõ chênh lệch so với khẩu phần gốc ban đầu bên dưới.`
                : isCustomPerDay
                ? 'Đang áp dụng khẩu phần riêng cho từng ngày. Bấm vào từng ngày ở trên để xem và tăng/giảm khẩu phần ngày đó.'
                : 'Tự động nhân khối lượng nguyên liệu tương ứng cho cả tuần.'}
            </p>
          </div>

          {/* Ô chọn số người ăn & Phím tăng giảm nhanh */}
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Các nút preset nhanh */}
            <div className="flex items-center gap-1">
              {PRESET_SERVINGS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleUpdateCurrentServings(p)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                    activeServingDisplay === p
                      ? 'bg-secondary text-on-secondary shadow-xs ring-1 ring-secondary'
                      : 'border border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container'
                  )}
                >
                  {p} người
                </button>
              ))}
            </div>

            {/* Bộ điều khiển Stepper +/- và ô nhập số */}
            <div className="flex items-center rounded-lg border border-surface-container-high bg-surface-container-lowest shadow-inner">
              <button
                type="button"
                onClick={() => handleUpdateCurrentServings(activeServingDisplay - 1)}
                disabled={activeServingDisplay <= 1}
                aria-label="Giảm khẩu phần"
                className="flex h-9 w-9 items-center justify-center rounded-l-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer"
              >
                <Icon name="remove" className="text-[18px]" />
              </button>
              <div className="flex items-center gap-1 px-2 font-label-md text-label-md font-bold text-on-surface">
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={0.5}
                  value={activeServingDisplay}
                  onChange={(e) => handleUpdateCurrentServings(Number(e.target.value))}
                  className="w-10 text-center font-bold text-on-surface outline-hidden"
                />
                <span className="text-xs font-normal text-on-surface-variant">người</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateCurrentServings(activeServingDisplay + 1)}
                disabled={activeServingDisplay >= 20}
                aria-label="Tăng khẩu phần"
                className="flex h-9 w-9 items-center justify-center rounded-r-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer"
              >
                <Icon name="add" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Nút bật/tắt Tùy chỉnh khẩu phần riêng từng ngày: Chỉ hiển thị ở tổng (Cả tuần) */}
        {dayFilter === 'ALL' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-space-sm border-t border-surface-container pt-space-sm">
              <label className="flex cursor-pointer items-center gap-space-xs font-label-md text-label-md text-on-surface">
                <input
                  type="checkbox"
                  checked={isCustomPerDay}
                  onChange={(e) => setIsCustomPerDay(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-semibold text-primary">
                  Mỗi ngày một khẩu phần ăn khác nhau
                </span>
              </label>

              {isCustomPerDay && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyToAllDays}
                    className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high cursor-pointer"
                  >
                    <Icon name="sync" className="text-[14px]" />
                    Áp dụng {activeServingDisplay} người cho cả tuần
                  </button>
                  <button
                    type="button"
                    onClick={handleResetServings}
                    className="text-xs text-outline underline hover:text-on-surface cursor-pointer"
                  >
                    Đặt lại 1 người
                  </button>
                </div>
              )}
            </div>

            {/* BẢNG ĐIỀU KHIỂN KHẨU PHẦN TỪNG NGÀY (KHI BẬT OPTION Ở TỔNG) */}
            {isCustomPerDay && (
              <div className="mt-1 rounded-lg border border-primary/20 bg-primary-fixed/10 p-space-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Icon name="tune" className="text-[15px]" />
                    Tùy chỉnh khẩu phần riêng 7 ngày trong tuần:
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Bấm vào ngày để đổi nhanh số người ăn
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                  {DAYS.map((d) => {
                    const isSelected = (dayFilter as string) === d;
                    const dServing = dayServings[d] ?? 1;
                    return (
                      <div
                        key={d}
                        onClick={() => handleSelectDayFilter(d)}
                        className={cn(
                          'flex flex-col items-center justify-between rounded-lg p-2 transition-all cursor-pointer',
                          isSelected
                            ? 'border-2 border-primary bg-primary-fixed/30 shadow-sm ring-1 ring-primary'
                            : 'border border-surface-container bg-surface-container-lowest/80 hover:bg-surface-container-low'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-label-sm text-xs font-bold text-on-surface">
                            {DAY_LABEL[d]}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
                              Đang xem
                            </span>
                          )}
                        </div>
                        <div className="my-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleUpdateDayServing(d, dServing - 1)}
                            disabled={dServing <= 1}
                            className="flex h-5 w-5 items-center justify-center rounded bg-surface-container text-xs text-on-surface hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold text-primary tabular-nums">
                            {dServing}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateDayServing(d, dServing + 1)}
                            disabled={dServing >= 20}
                            className="flex h-5 w-5 items-center justify-center rounded bg-surface-container text-xs text-on-surface hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-outline">người ăn</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* THANH TIẾN ĐỘ MUA HÀNG */}
      <section aria-label="Tiến độ mua" className="flex flex-col gap-space-xs rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              {dayFilter === 'ALL'
                ? `Đã mua ${currentPurchased}/${currentTotal} món (Toàn tuần)`
                : `Đã mua ${currentPurchased}/${currentTotal} món (${DAY_LABEL[dayFilter]})`}
            </p>
            {dayFilter !== 'ALL' && (
              <span className="text-xs text-on-surface-variant">
                (Tổng tuần: {progress.purchased}/{progress.total})
              </span>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <input type="checkbox" checked={hidePurchased} onChange={(event) => setHidePurchased(event.target.checked)} className="accent-primary" />
            Ẩn món đã mua
          </label>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-container"
          role="progressbar"
          aria-label="Tiến độ mua"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentPercent}
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${currentPercent}%` }} />
        </div>
      </section>

      {/* Thông báo trạng thái: Chỉ khi tích mua hết toàn bộ món thì mới hiện thông báo hoàn tất */}
      {effectiveStatus === 'COMPLETED' && (
        <FormAlert tone="success" title="Danh sách đã hoàn tất">
          Bạn đã tích mua xong tất cả {progress.total}/{progress.total} món nguyên liệu cho thực đơn tuần này!
        </FormAlert>
      )}
      {status === 'CANCELLED' && (
        <FormAlert tone="info" title="Danh sách đã hủy">
          Danh sách này chỉ còn để xem, không đánh dấu được nữa.
        </FormAlert>
      )}

      {/* 4. THANH TABBAR PHÂN LOẠI QUẦY NGUYÊN LIỆU (Rau củ quả, Đậu hạt, Nấm & Đậu phụ, Gia vị & khác) */}
      <section aria-label="Phân loại quầy nguyên liệu" className="flex flex-col gap-space-xs rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
            <Icon name="storefront" className="text-[18px] text-primary" />
            <span className="font-semibold">Phân loại theo quầy mua sắm:</span>
          </div>
          <span className="text-xs text-on-surface-variant">
            {aisleFilter === 'ALL'
              ? `Tất cả các quầy (${currentTotal} món)`
              : `Quầy ${aisleInfo(aisleFilter).label} (${displayedAisles.reduce((acc, a) => acc + a.totalItemsCount, 0)} món)`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAisleFilter('ALL')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-md text-xs font-semibold transition-all cursor-pointer',
              aisleFilter === 'ALL'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'border border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container'
            )}
          >
            <Icon name="apps" className="text-[16px]" />
            <span>Tất cả quầy</span>
            <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums', aisleFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant')}>
              {currentTotal}
            </span>
          </button>

          {processedAisles.map((a) => {
            const info = aisleInfo(a.aisle);
            const active = aisleFilter === a.aisle;
            return (
              <button
                key={a.aisle}
                type="button"
                onClick={() => setAisleFilter(a.aisle)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-md text-xs font-semibold transition-all cursor-pointer',
                  active
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'border border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container'
                )}
              >
                <Icon name={info.icon} className="text-[16px]" />
                <span>{info.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums', active ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant')}>
                  {a.totalItemsCount}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* DANH SÁCH CHI TIẾT NGUYÊN LIỆU PHÍA DƯỚI */}
      {displayedAisles.length === 0 || currentTotal === 0 ? (
        <EmptyState
          icon="shopping_basket"
          title={dayFilter === 'ALL' ? 'Danh sách chưa có nguyên liệu' : `Không có nguyên liệu cho ${DAY_LABEL[dayFilter]}`}
          description={
            dayFilter === 'ALL'
              ? 'Các món trong thực đơn chưa có nguyên liệu để mua.'
              : `Ngày này không có bữa ăn cần đi chợ hoặc nguyên liệu đã mua xong. Thử chọn ngày khác hoặc "Cả tuần".`
          }
          action={
            dayFilter !== 'ALL' ? (
              <Button variant="outline" onClick={() => handleSelectDayFilter('ALL')}>
                Xem cả tuần
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2">
          {displayedAisles.map((aisle) => {
            const info = aisleInfo(aisle.aisle);
            const visible = hidePurchased ? aisle.items.filter((item) => !item.isPurchased) : aisle.items;

            return (
              <section
                key={aisle.aisle}
                aria-labelledby={`aisle-${aisle.aisle}`}
                className="flex flex-col gap-space-sm rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card transition-all"
              >
                <header className="flex items-center gap-space-sm border-b border-surface-container-low pb-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-primary shadow-xs">
                    <Icon name={info.icon} className="text-[20px]" />
                  </span>
                  <div className="flex flex-1 items-center justify-between">
                    <h2 id={`aisle-${aisle.aisle}`} className="font-label-lg text-label-lg font-bold text-on-surface">
                      {info.label}
                    </h2>
                    <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                      {aisle.purchasedCount}/{aisle.totalItemsCount} món
                    </span>
                  </div>
                </header>

                {aisle.totalItemsCount === 0 ? (
                  <p className="px-1 py-3 text-center font-body-sm text-body-sm text-outline">
                    Không có món nào thuộc quầy này trong ngày đang chọn.
                  </p>
                ) : visible.length === 0 ? (
                  <p className="px-1 py-3 text-center font-body-sm text-body-sm text-outline">
                    Đã mua đủ ở quầy này.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-surface-container-low">
                    {visible.map((item) => {
                      return (
                        <li key={item.itemId} className="py-1">
                          <label
                            className={cn(
                              'flex items-start gap-space-sm rounded-lg px-2 py-2 transition-colors',
                              pending ? 'cursor-pointer hover:bg-surface-container-low' : 'cursor-default'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={item.isPurchased}
                              disabled={!pending}
                              onChange={(event) => toggle(item.itemId, event.target.checked)}
                              className="mt-1 h-4 w-4 shrink-0 accent-primary"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              {/* Tên nguyên liệu: gạch ngang rõ nét khi đã tích mua */}
                              <span
                                className={cn(
                                  'break-words font-body-md text-body-md font-medium leading-snug transition-all',
                                  item.isPurchased ? 'text-outline line-through opacity-60' : 'text-on-surface'
                                )}
                              >
                                {item.name}
                              </span>

                              {/* Hiển thị chi tiết món ăn / các ngày sử dụng */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {item.recipeSources && item.recipeSources.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] text-on-surface-variant">
                                    <Icon name="restaurant" className="text-[12px] text-outline" />
                                    {item.recipeSources.slice(0, 2).join(', ')}
                                    {item.recipeSources.length > 2 ? ` +${item.recipeSources.length - 2}` : ''}
                                  </span>
                                )}

                                {dayFilter === 'ALL' && item.usedDays && item.usedDays.length > 0 && item.usedDays.length < 7 && (
                                  <span className="rounded bg-surface-container px-1.5 py-0.2 text-[10px] font-medium text-outline">
                                    {item.usedDays.map((d) => DAY_FILTERS.find((f) => f.key === d)?.short ?? d).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Khối lượng cần mua & Chênh lệch tăng cộng trừ so với khẩu phần ban đầu */}
                            <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'font-label-md text-base font-bold tabular-nums transition-all',
                                    item.isPurchased ? 'text-outline line-through opacity-60' : 'text-primary'
                                  )}
                                  title={`Khối lượng cần mua: ${formatQuantity(item.scaledQuantity, item.unit)}`}
                                >
                                  {formatQuantity(item.scaledQuantity, item.unit)}
                                </span>
                                {item.scaledFactor > 1 && (
                                  <span className="rounded bg-primary-fixed/80 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                                    ×{item.scaledFactor} người
                                  </span>
                                )}
                              </div>

                              {/* Ghi rõ số lượng mua tăng cộng trừ so với khẩu phần ăn ban đầu */}
                              {item.deltaQuantity > 0.001 ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-50 px-1 py-0.2 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <Icon name="arrow_upward" className="text-[12px]" />
                                    +{formatQuantity(item.deltaQuantity, item.unit)}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant/80">
                                    (gốc {formatQuantity(item.baseQuantity, item.unit)} ban đầu)
                                  </span>
                                </div>
                              ) : item.deltaQuantity < -0.001 ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="inline-flex items-center gap-0.5 rounded-sm bg-amber-50 px-1 py-0.2 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                    <Icon name="arrow_downward" className="text-[12px]" />
                                    -{formatQuantity(Math.abs(item.deltaQuantity), item.unit)}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant/80">
                                    (gốc {formatQuantity(item.baseQuantity, item.unit)} ban đầu)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-outline font-medium">
                                  (Khẩu phần gốc: {formatQuantity(item.baseQuantity, item.unit)})
                                </span>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
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
