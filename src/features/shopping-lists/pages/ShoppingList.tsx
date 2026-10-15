import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { VipLockCard, VipUpsellDialog } from '@/components/common/VipUpsell';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useExportPdf } from '@/features/meal-plans/hooks/useExportPdf';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { forgetShoppingList, planIdOfList } from '../hooks/shoppingListLinks';
import { useSetShoppingListStatus, useShoppingList, useToggleShoppingItem } from '../hooks/useShoppingList';
import { AISLE_ORDER, aisleInfo, formatQuantity, LIST_STATUS } from '../lib/aisles';
import type { ShoppingAisle } from '../types/shoppingList.types';

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
 * FN-MEAL-08 (xuất PDF, VIP). Nguyên liệu gom theo 4 quầy hàng.
 */
const ShoppingList: React.FC = () => {
  const { id } = useParams();
  const listId = Number(id);
  const validId = Number.isInteger(listId) && listId > 0;
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);
  const list = useShoppingList(listId);
  const toggleItem = useToggleShoppingItem(listId);
  const setStatus = useSetShoppingListStatus(listId);
  const planId = validId ? planIdOfList(listId) : null;
  const exportPdf = useExportPdf(planId ?? 0);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState<string | null>(null);

  const notFound = list.isError && toApiError(list.error).status === 404;
  // Danh sách không còn mở được: bỏ liên kết đã nhớ để thực đơn cho tạo lại.
  useEffect(() => {
    if (notFound) forgetShoppingList(listId);
  }, [notFound, listId]);

  const aisles = useMemo(() => orderAisles(list.data?.aisles ?? []), [list.data?.aisles]);

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

  const { status, progress } = list.data;
  const pending = status === 'PENDING';
  const percent = progress.total > 0 ? Math.round((progress.purchased / progress.total) * 100) : 0;

  const toggle = (itemId: number, isPurchased: boolean) =>
    toggleItem.mutate(
      { itemId, isPurchased },
      {
        onSuccess: (result) => {
          if (result.listStatus === 'COMPLETED') notifySuccess('Bạn đã mua đủ, danh sách đi chợ đã hoàn tất.');
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
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <Link to={PATHS.MEAL_PLANS.ROOT} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
          <Icon name="restaurant_menu" className="text-[16px]" />
          Thực đơn tuần
        </Link>
        {planId && (
          <>
            <span className="text-outline-variant">/</span>
            <Link to={PATHS.MEAL_PLANS.DETAIL(planId)} className="text-on-surface-variant no-underline hover:text-primary">
              Thực đơn #{planId}
            </Link>
          </>
        )}
        <span className="text-outline-variant">/</span>
        <span className="text-primary" aria-current="page">
          Danh sách đi chợ
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Danh sách đi chợ</h1>
          <span className={cn('self-start rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', LIST_STATUS[status].className)}>
            {LIST_STATUS[status].label}
          </span>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          {isVip && planId && (
            <Button variant="outline" onClick={runExport} loading={exportPdf.isPending}>
              <Icon name="picture_as_pdf" className="text-[18px]" />
              Tải PDF
            </Button>
          )}
          {pending && (
            <>
              <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                Hủy danh sách
              </Button>
              <Button onClick={() => changeStatus('COMPLETED')} loading={setStatus.isPending && setStatus.variables === 'COMPLETED'}>
                <Icon name="task_alt" className="text-[18px]" />
                Hoàn tất
              </Button>
            </>
          )}
        </div>
      </header>

      <section aria-label="Tiến độ mua" className="flex flex-col gap-space-xs rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <p className="font-label-md text-label-md text-on-surface">
            Đã mua {progress.purchased}/{progress.total} món
          </p>
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
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </section>

      {status === 'COMPLETED' && (
        <FormAlert tone="success" title="Danh sách đã hoàn tất">
          Bạn đã mua xong nguyên liệu cho thực đơn tuần này.
        </FormAlert>
      )}
      {status === 'CANCELLED' && (
        <FormAlert tone="info" title="Danh sách đã hủy">
          Danh sách này chỉ còn để xem, không đánh dấu được nữa.
        </FormAlert>
      )}
      {!isVip && (
        <VipLockCard title="Xuất PDF để in" description="Thành viên VIP tải thực đơn tuần và danh sách đi chợ dưới dạng PDF." />
      )}

      {aisles.length === 0 ? (
        <EmptyState icon="shopping_basket" title="Danh sách chưa có nguyên liệu" description="Các món trong thực đơn chưa có nguyên liệu để mua." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2">
          {aisles.map((aisle) => {
            const info = aisleInfo(aisle.aisle);
            const purchased = aisle.items.filter((item) => item.isPurchased).length;
            const visible = hidePurchased ? aisle.items.filter((item) => !item.isPurchased) : aisle.items;
            return (
              <section
                key={aisle.aisle}
                aria-labelledby={`aisle-${aisle.aisle}`}
                className="flex flex-col gap-space-sm rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card"
              >
                <header className="flex items-center gap-space-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                    <Icon name={info.icon} className="text-[20px]" />
                  </span>
                  <h2 id={`aisle-${aisle.aisle}`} className="flex-1 font-label-lg text-label-lg text-on-surface">
                    {info.label}
                  </h2>
                  <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                    {purchased}/{aisle.items.length}
                  </span>
                </header>
                {visible.length === 0 ? (
                  <p className="px-1 font-body-sm text-body-sm text-outline">Đã mua đủ ở quầy này.</p>
                ) : (
                  <ul className="flex flex-col">
                    {visible.map((item) => (
                      <li key={item.itemId}>
                        <label
                          className={cn(
                            'flex items-center gap-space-sm rounded-lg px-1 py-2',
                            pending ? 'cursor-pointer hover:bg-surface-container-low' : 'cursor-default'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.isPurchased}
                            disabled={!pending}
                            onChange={(event) => toggle(item.itemId, event.target.checked)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span
                            className={cn(
                              'min-w-0 flex-1 font-body-md text-body-md',
                              item.isPurchased ? 'text-outline line-through' : 'text-on-surface'
                            )}
                          >
                            {item.name}
                          </span>
                          <span className="shrink-0 font-label-md text-label-md text-on-surface-variant tabular-nums">
                            {formatQuantity(item.quantity, item.unit)}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

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
