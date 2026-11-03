import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber, formatVnd } from '@/lib/format';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { perThirtyDays } from '@/features/subscription/lib/benefits';
import {
  AdminPageHeader,
  AdminQueryError,
  CARD,
  CONTROL,
  ServerMessageDialog,
  StatusBadge,
  TD,
  TH,
  TableShell,
  TableSkeleton,
} from '../components/AdminUi';
import { FormDialog, FormRow } from '../components/FormDialog';
import { PaymentTransactionsTab } from '../components/PaymentTransactionsTab';
import { SystemSettingsTab } from '../components/SystemSettingsTab';
import { VipPlanCard } from '../components/VipPlanCard';
import {
  useAdminPlans,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
} from '../hooks/useAdminBilling';
import { handleWriteError } from '../lib/writeError';
import type { AdminPlan } from '../types/admin.types';

const STORAGE_PLAN_ORDER_KEY = 'veggielife_vip_plans_order';
const STORAGE_TAB_ORDER_KEY = 'veggielife_vip_tabs_order';

const positiveInt = (message: string) =>
  z.number({ invalid_type_error: message }).int('Phải là số nguyên').positive('Phải lớn hơn 0');
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** POST /admin/subscription-plans: planName ≤ 100 (duy nhất), durationDays > 0, priceVnd > 0. */
const createPlanSchema = z.object({
  planName: z.string().trim().min(1, 'Nhập tên gói').max(100, 'Tên gói tối đa 100 ký tự'),
  durationDays: positiveInt('Nhập số ngày'),
  priceVnd: positiveInt('Nhập giá'),
});
type CreatePlanValues = z.infer<typeof createPlanSchema>;

/** PUT /admin/subscription-plans/{id}: Full Edit. */
const editPlanSchema = z.object({
  planName: z.string().trim().min(1, 'Nhập tên gói').max(100, 'Tên gói tối đa 100 ký tự'),
  durationDays: positiveInt('Nhập số ngày'),
  priceVnd: positiveInt('Nhập giá'),
  isActive: z.boolean().default(true),
});
type EditPlanValues = z.infer<typeof editPlanSchema>;

/** PUT /admin/subscription-plans/{id}: priceVnd > 0. */
const priceSchema = z.object({ priceVnd: positiveInt('Nhập giá') });

type PageTab = 'plans' | 'transactions' | 'settings';
type ViewMode = 'cards' | 'table';

interface TabItem {
  id: PageTab;
  label: string;
  icon: string;
}

const INITIAL_TABS: TabItem[] = [
  { id: 'plans', label: 'Cấu hình gói VIP', icon: 'workspace_premium' },
  { id: 'transactions', label: 'Lịch sử giao dịch', icon: 'receipt_long' },
  { id: 'settings', label: 'Chỉ số hệ thống', icon: 'tune' },
];

/**
 * SCR-44 admin/SubscriptionPlans · `/admin/subscription-plans` — FN-ADM-13.
 * Thêm gói, sửa toàn diện, đổi giá, ẩn/hiện gói, xóa gói VIP và sắp xếp vị trí hiển thị bằng kéo thả.
 */
const AdminSubscriptionPlansPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const activeTab: PageTab =
    currentTabParam === 'transactions' || currentTabParam === 'settings'
      ? currentTabParam
      : 'plans';

  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Quản lý thứ tự tab điều hướng (hỗ trợ kéo thả đổi vị trí tab)
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TAB_ORDER_KEY);
      if (saved) {
        const ids: PageTab[] = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length === INITIAL_TABS.length) {
          const map = new Map(INITIAL_TABS.map((t) => [t.id, t]));
          const restored = ids.map((id) => map.get(id)).filter(Boolean) as TabItem[];
          if (restored.length === INITIAL_TABS.length) return restored;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_TABS;
  });

  const [draggedTabIdx, setDraggedTabIdx] = useState<number | null>(null);
  const [dragOverTabIdx, setDragOverTabIdx] = useState<number | null>(null);

  const handleTabChange = (tabId: PageTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabId === 'plans') {
        next.delete('tab');
      } else {
        next.set('tab', tabId);
      }
      return next;
    });
  };

  const plans = useAdminPlans();
  const update = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [creating, setCreating] = useState(false);
  const [editingPrice, setEditingPrice] = useState<AdminPlan | null>(null);
  const [editingFull, setEditingFull] = useState<AdminPlan | null>(null);
  const [toggling, setToggling] = useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);

  // Thứ tự hiển thị tùy biến của các thẻ gói VIP (lưu trữ theo planId)
  const [orderedPlanIds, setOrderedPlanIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAN_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [draggedCardIdx, setDraggedCardIdx] = useState<number | null>(null);
  const [dragOverCardIdx, setDragOverCardIdx] = useState<number | null>(null);

  // Sắp xếp danh sách gói theo thứ tự đã lưu (hoặc mặc định)
  const rawPlans = plans.data ?? [];
  const planList = React.useMemo(() => {
    if (orderedPlanIds.length === 0) return rawPlans;
    const map = new Map(rawPlans.map((p) => [p.planId, p]));
    const result: AdminPlan[] = [];

    // Nạp các gói có trong danh sách order
    for (const id of orderedPlanIds) {
      const found = map.get(id);
      if (found) {
        result.push(found);
        map.delete(id);
      }
    }
    // Nạp thêm các gói mới tạo chưa có trong order
    for (const remaining of map.values()) {
      result.push(remaining);
    }
    return result;
  }, [rawPlans, orderedPlanIds]);

  // Xử lý kéo thả đổi vị trí tab điều hướng
  const handleTabDrop = (targetIdx: number) => {
    if (draggedTabIdx === null || draggedTabIdx === targetIdx) {
      setDraggedTabIdx(null);
      setDragOverTabIdx(null);
      return;
    }
    const nextTabs = [...tabs];
    const [moved] = nextTabs.splice(draggedTabIdx, 1);
    nextTabs.splice(targetIdx, 0, moved);
    setTabs(nextTabs);
    setDraggedTabIdx(null);
    setDragOverTabIdx(null);
    try {
      localStorage.setItem(STORAGE_TAB_ORDER_KEY, JSON.stringify(nextTabs.map((t) => t.id)));
    } catch {
      // ignore
    }
  };

  // Xử lý kéo thả đổi vị trí các thẻ gói VIP
  const handleCardDrop = (targetIdx: number) => {
    if (draggedCardIdx === null || draggedCardIdx === targetIdx) {
      setDraggedCardIdx(null);
      setDragOverCardIdx(null);
      return;
    }
    const nextList = [...planList];
    const [moved] = nextList.splice(draggedCardIdx, 1);
    nextList.splice(targetIdx, 0, moved);

    const newOrderIds = nextList.map((p) => p.planId);
    setOrderedPlanIds(newOrderIds);
    setDraggedCardIdx(null);
    setDragOverCardIdx(null);

    try {
      localStorage.setItem(STORAGE_PLAN_ORDER_KEY, JSON.stringify(newOrderIds));
      notifySuccess(`Đã chuyển gói "${moved.planName}" sang vị trí mới.`);
    } catch {
      // ignore
    }
  };

  const moveCard = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= planList.length) return;
    const nextList = [...planList];
    const [moved] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, moved);

    const newOrderIds = nextList.map((p) => p.planId);
    setOrderedPlanIds(newOrderIds);
    try {
      localStorage.setItem(STORAGE_PLAN_ORDER_KEY, JSON.stringify(newOrderIds));
      notifySuccess(`Đã chuyển vị trí gói "${moved.planName}".`);
    } catch {
      // ignore
    }
  };

  const resetCardOrder = () => {
    setOrderedPlanIds([]);
    try {
      localStorage.removeItem(STORAGE_PLAN_ORDER_KEY);
      notifyInfo('Đã khôi phục thứ tự gói VIP mặc định.');
    } catch {
      // ignore
    }
  };

  const confirmToggle = () => {
    if (!toggling) return;
    update.mutate(
      { id: toggling.planId, body: { isActive: !toggling.isActive } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || (toggling.isActive ? 'Đã ẩn gói.' : 'Đã mở bán lại gói.'));
          setToggling(null);
        },
        onError: (error) => {
          handleWriteError(error);
          setToggling(null);
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deletePlan.mutate(deleting.planId, {
      onSuccess: () => {
        notifySuccess(`Đã xóa gói "${deleting.planName}".`);
        setDeleting(null);
      },
      onError: (error) => {
        handleWriteError(error);
        setDeleting(null);
      },
    });
  };

  const activePlans = planList.filter((p) => p.isActive);
  const candidates = activePlans.length > 0 ? activePlans : planList;
  const bestPlan =
    candidates.length > 1
      ? candidates.reduce((a, b) =>
          perThirtyDays(b.priceVnd, b.durationDays) < perThirtyDays(a.priceVnd, a.durationDays) ? b : a
        )
      : null;

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        title="Cấu hình hệ thống"
        actions={
          activeTab === 'plans' ? (
            <Button onClick={() => setCreating(true)}>
              <Icon name="add" className="text-[18px]" />
              Thêm gói
            </Button>
          ) : undefined
        }
      />

      {/* Tabs điều hướng: hỗ trợ kéo thả đổi vị trí tab */}
      <nav aria-label="Phân hệ cấu hình hệ thống" className="flex gap-1 overflow-x-auto border-b border-surface-container">
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const isDraggingThis = draggedTabIdx === idx;
          const isDragOverThis = dragOverTabIdx === idx;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              draggable
              onDragStart={() => setDraggedTabIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTabIdx(idx);
              }}
              onDrop={() => handleTabDrop(idx)}
              onDragEnd={() => {
                setDraggedTabIdx(null);
                setDragOverTabIdx(null);
              }}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 font-label-md text-label-md transition-all cursor-grab active:cursor-grabbing',
                isActive
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
                isDraggingThis && 'opacity-40 scale-95 border-dashed border-primary',
                isDragOverThis && 'bg-surface-container/60 ring-2 ring-primary ring-inset'
              )}
              title="Có thể kéo thả tab này để thay đổi thứ tự vị trí"
            >
              <Icon name="drag_indicator" className="text-[15px] opacity-40 hover:opacity-100" />
              <Icon name={tab.icon} className="text-[18px]" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'plans' && (
        <div className="flex flex-col gap-space-lg">
          <section aria-labelledby="plans-title" className="flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="plans-title" className="font-headline-sm text-headline-sm text-on-surface">
                  Cấu hình gói VIP
                </h2>
                <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                  Cấu hình giá bán, chu kỳ và quản lý hiển thị các gói VIP cho người dùng. Bạn có thể kéo thả trực tiếp các thẻ để sắp xếp lại vị trí hiển thị.
                </p>
              </div>

              {planList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {orderedPlanIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetCardOrder}
                      className="text-on-surface-variant text-xs"
                      title="Khôi phục lại thứ tự ban đầu của các gói"
                    >
                      <Icon name="restart_alt" className="text-[16px]" />
                      Đặt lại thứ tự
                    </Button>
                  )}

                  <div className="flex items-center rounded-xl border border-surface-container bg-surface-container-low p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      aria-label="Xem dạng thẻ"
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold transition-all',
                        viewMode === 'cards'
                          ? 'bg-surface-container-lowest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <Icon name="grid_view" className="text-[16px]" />
                      Dạng thẻ (Người dùng)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      aria-label="Xem dạng bảng"
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold transition-all',
                        viewMode === 'table'
                          ? 'bg-surface-container-lowest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <Icon name="table_chart" className="text-[16px]" />
                      Dạng bảng (Chi tiết)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {plans.isPending ? (
              <TableSkeleton rows={3} label="Đang tải gói VIP" />
            ) : plans.isError ? (
              <AdminQueryError error={plans.error} onRetry={() => void plans.refetch()} retrying={plans.isRefetching} />
            ) : planList.length === 0 ? (
              <div className={CARD}>
                <EmptyState
                  icon="workspace_premium"
                  title="Chưa có gói VIP nào"
                  description="Người dùng chưa thể nâng cấp VIP cho tới khi có ít nhất một gói đang bán."
                  action={<Button onClick={() => setCreating(true)}>Thêm gói đầu tiên</Button>}
                />
              </div>
            ) : viewMode === 'cards' ? (
              /* Dạng thẻ xem trước trực quan chuẩn như người dùng thấy, hỗ trợ kéo thả vị trí */
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {planList.map((plan, idx) => {
                  const isFeatured = bestPlan?.planId === plan.planId;
                  const isDragging = draggedCardIdx === idx;
                  const isDragOver = dragOverCardIdx === idx;

                  return (
                    <VipPlanCard
                      key={plan.planId}
                      planName={plan.planName}
                      durationDays={plan.durationDays}
                      priceVnd={plan.priceVnd}
                      isActive={plan.isActive}
                      featured={isFeatured}
                      badgeText="Tiết kiệm nhất"
                      isAdmin={true}
                      draggable={true}
                      isDragging={isDragging}
                      isDragOver={isDragOver}
                      onDragStart={() => setDraggedCardIdx(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverCardIdx(idx);
                      }}
                      onDrop={() => handleCardDrop(idx)}
                      onDragEnd={() => {
                        setDraggedCardIdx(null);
                        setDragOverCardIdx(null);
                      }}
                      canMoveLeft={idx > 0}
                      canMoveRight={idx < planList.length - 1}
                      onMoveLeft={() => moveCard(idx, idx - 1)}
                      onMoveRight={() => moveCard(idx, idx + 1)}
                      onEdit={() => setEditingFull(plan)}
                      onQuickPrice={() => setEditingPrice(plan)}
                      onToggle={() => setToggling(plan)}
                      onDelete={() => setDeleting(plan)}
                    />
                  );
                })}
              </div>
            ) : (
              /* Dạng bảng chi tiết hỗ trợ quản trị */
              <TableShell label="Danh sách gói VIP" minWidth="min-w-[700px]">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Thứ tự</th>
                    <th scope="col" className={TH}>Tên gói</th>
                    <th scope="col" className={`${TH} text-right`}>Thời hạn</th>
                    <th scope="col" className={`${TH} text-right`}>Giá</th>
                    <th scope="col" className={`${TH} text-right`}>Quy đổi 30 ngày</th>
                    <th scope="col" className={TH}>Trạng thái</th>
                    <th scope="col" className={TH}><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {planList.map((plan, idx) => {
                    const isBest = bestPlan?.planId === plan.planId;
                    const per30 = perThirtyDays(plan.priceVnd, plan.durationDays);
                    return (
                      <tr key={plan.planId} className="hover:bg-surface-container-low transition-colors">
                        <td className={`${TD} font-label-sm text-on-surface-variant tabular-nums w-12`}>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">#{idx + 1}</span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveCard(idx, idx - 1)}
                                title="Di chuyển lên trên"
                                aria-label={`Di chuyển ${plan.planName} lên`}
                                className="disabled:opacity-30 hover:text-primary transition-colors"
                              >
                                <Icon name="arrow_drop_up" className="text-[18px] leading-none" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === planList.length - 1}
                                onClick={() => moveCard(idx, idx + 1)}
                                title="Di chuyển xuống dưới"
                                aria-label={`Di chuyển ${plan.planName} xuống`}
                                className="disabled:opacity-30 hover:text-primary transition-colors -mt-1"
                              >
                                <Icon name="arrow_drop_down" className="text-[18px] leading-none" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className={`${TD} font-label-md text-label-md`}>
                          <div className="flex items-center gap-2">
                            <span>{plan.planName}</span>
                            {isBest && (
                              <span className="rounded bg-secondary-container px-2 py-0.5 font-label-sm text-[11px] font-bold text-on-secondary-container">
                                Tiết kiệm nhất
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>{formatNumber(plan.durationDays)} ngày</td>
                        <td className={`${TD} text-right tabular-nums font-semibold`}>{formatVnd(plan.priceVnd)}</td>
                        <td className={`${TD} text-right tabular-nums text-on-surface-variant font-body-sm`}>
                          ≈ {formatVnd(per30)}
                        </td>
                        <td className={TD}>
                          <StatusBadge tone={plan.isActive ? 'success' : 'neutral'}>
                            {plan.isActive ? 'Đang bán' : 'Đã ẩn'}
                          </StatusBadge>
                        </td>
                        <td className={`${TD} whitespace-nowrap text-right`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingFull(plan)}
                            aria-label={`Sửa ${plan.planName}`}
                          >
                            <Icon name="edit" className="text-[16px]" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrice(plan)}
                            aria-label={`Đổi giá ${plan.planName}`}
                          >
                            <Icon name="payments" className="text-[16px]" />
                            Đổi giá
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggling(plan)}
                            aria-label={`${plan.isActive ? 'Ẩn gói' : 'Mở bán lại'} ${plan.planName}`}
                          >
                            <Icon name={plan.isActive ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                            {plan.isActive ? 'Ẩn gói' : 'Mở bán'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(plan)}
                            aria-label={`Xóa ${plan.planName}`}
                            className="text-error hover:bg-error-container/20 hover:text-error"
                          >
                            <Icon name="delete" className="text-[16px]" />
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            )}
          </section>
        </div>
      )}

      {activeTab === 'transactions' && <PaymentTransactionsTab />}
      {activeTab === 'settings' && <SystemSettingsTab />}

      {/* Modal Tạo mới gói VIP với Live Preview */}
      <CreatePlanDialog show={creating} onClose={() => setCreating(false)} />

      {/* Modal Chỉnh sửa toàn diện gói VIP với Live Preview */}
      <EditPlanDialog plan={editingFull} onClose={() => setEditingFull(null)} />

      {/* Modal Đổi giá nhanh gói VIP */}
      <PriceDialog plan={editingPrice} onClose={() => setEditingPrice(null)} />

      {/* Modal xác nhận Ẩn / Mở bán lại */}
      <ConfirmDialog
        show={!!toggling}
        title={toggling?.isActive ? 'Ẩn gói VIP?' : 'Mở bán lại gói?'}
        message={
          toggling?.isActive
            ? `"${toggling.planName}" sẽ không còn hiện ở trang Gói VIP, người dùng không mua mới được. Ai đang dùng gói vẫn giữ nguyên hạn VIP.`
            : `"${toggling?.planName ?? ''}" sẽ hiện lại ở trang Gói VIP với giá ${toggling ? formatVnd(toggling.priceVnd) : ''}.`
        }
        confirmLabel={toggling?.isActive ? 'Ẩn gói' : 'Mở bán lại'}
        danger={!!toggling?.isActive}
        loading={update.isPending}
        onConfirm={confirmToggle}
        onCancel={() => !update.isPending && setToggling(null)}
      />

      {/* Modal xác nhận Xóa gói */}
      <ConfirmDialog
        show={!!deleting}
        title={deleting ? `Xóa gói "${deleting.planName}"?` : 'Xóa gói VIP?'}
        message={
          deleting ? (
            <div className="flex flex-col gap-2">
              <p>
                Bạn có chắc chắn muốn xóa gói <strong>{deleting.planName}</strong> ({formatNumber(deleting.durationDays)} ngày - {formatVnd(deleting.priceVnd)})?
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Lưu ý: Nếu gói này đã có giao dịch phát sinh từ người dùng, hệ thống sẽ tự động chuyển sang trạng thái <strong>&quot;Ẩn gói&quot;</strong> để bảo toàn chứng từ kế toán và đối soát.
              </p>
            </div>
          ) : ''
        }
        confirmLabel="Xác nhận xóa"
        danger
        loading={deletePlan.isPending}
        onConfirm={confirmDelete}
        onCancel={() => !deletePlan.isPending && setDeleting(null)}
      />
    </div>
  );
};

/**
 * Hộp thoại tạo mới gói VIP kèm thẻ xem trước thời gian thực (Live Preview).
 */
const CreatePlanDialog: React.FC<{ show: boolean; onClose: () => void }> = ({ show, onClose }) => {
  const create = useCreatePlan();
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewFeatured, setPreviewFeatured] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: { planName: '', durationDays: 30, priceVnd: 49000 },
  });

  useEffect(() => {
    if (show) {
      setFormError(null);
      setPreviewFeatured(false);
      reset({ planName: '', durationDays: 30, priceVnd: 49000 });
    }
  }, [show, reset]);

  const watchedPlanName = watch('planName');
  const watchedDurationDays = watch('durationDays');
  const watchedPriceVnd = watch('priceVnd');

  const submit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (res) => {
        notifySuccess(res.message || `Đã tạo gói ${values.planName}.`);
        onClose();
      },
      onError: (error) => {
        const apiError = handleWriteError(error, {
          setError,
          fields: ['planName', 'durationDays', 'priceVnd'],
          onConflict: setConflict,
        });
        if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
      },
    });
  });

  return (
    <>
      <FormDialog
        show={show}
        title="Thêm gói VIP mới"
        size="lg"
        onClose={() => !create.isPending && onClose()}
        onSubmit={submit}
        submitLabel="Tạo gói"
        loading={create.isPending}
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <div className="grid gap-space-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Cột trái: Form nhập liệu cấu hình */}
          <div className="flex flex-col gap-space-md">
            <FormRow
              id="create-plan-name"
              label="Tên gói"
              required
              error={errors.planName?.message}
              hint="Ví dụ: Gói VIP 1 Tháng - Mở Khóa AI Dinh Dưỡng"
            >
              <input
                id="create-plan-name"
                maxLength={100}
                placeholder="Nhập tên gói..."
                aria-invalid={!!errors.planName}
                className={CONTROL}
                {...register('planName')}
              />
            </FormRow>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="font-semibold text-on-surface-variant mr-1 self-center">Gợi ý mẫu:</span>
              <button
                type="button"
                onClick={() => {
                  setValue('planName', 'Gói VIP 1 Tháng - Mở Khóa AI Dinh Dưỡng');
                  setValue('durationDays', 30);
                  setValue('priceVnd', 49000);
                }}
                className="rounded-lg border border-surface-container bg-surface-container-low px-2 py-1 text-on-surface hover:bg-surface-container transition-colors"
              >
                1 Tháng (49k)
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('planName', 'Gói VIP 3 Tháng - Lộ Trình Sống Khỏe');
                  setValue('durationDays', 90);
                  setValue('priceVnd', 129000);
                }}
                className="rounded-lg border border-surface-container bg-surface-container-low px-2 py-1 text-on-surface hover:bg-surface-container transition-colors"
              >
                3 Tháng (129k)
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('planName', 'Gói VIP 1 Năm - Thuần Chay Bền Vững');
                  setValue('durationDays', 365);
                  setValue('priceVnd', 449000);
                  setPreviewFeatured(true);
                }}
                className="rounded-lg border border-surface-container bg-surface-container-low px-2 py-1 text-on-surface hover:bg-surface-container transition-colors"
              >
                1 Năm (449k)
              </button>
            </div>

            <div className="grid gap-space-md sm:grid-cols-2">
              <FormRow id="create-plan-days" label="Thời hạn (ngày)" required error={errors.durationDays?.message}>
                <input
                  id="create-plan-days"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-invalid={!!errors.durationDays}
                  className={CONTROL}
                  {...register('durationDays', { setValueAs: toNumber })}
                />
              </FormRow>
              <FormRow id="create-plan-price" label="Giá bán (VND)" required error={errors.priceVnd?.message}>
                <input
                  id="create-plan-price"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  aria-invalid={!!errors.priceVnd}
                  className={CONTROL}
                  {...register('priceVnd', { setValueAs: toNumber })}
                />
              </FormRow>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-container bg-surface-container-low p-3 hover:bg-surface-container transition-colors">
              <input
                type="checkbox"
                checked={previewFeatured}
                onChange={(e) => setPreviewFeatured(e.target.checked)}
                className="accent-primary h-4 w-4 rounded"
              />
              <span className="font-label-md text-label-md text-on-surface">
                Xem thử ở định dạng Thẻ nổi bật (&quot;Tiết kiệm nhất&quot;)
              </span>
            </label>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Gói mới sẽ được mở bán ngay sau khi tạo và xuất hiện ở trang thanh toán VIP của người dùng.
            </p>
          </div>

          {/* Cột phải: Thẻ hiển thị xem trước thời gian thực (Live Preview) */}
          <div className="flex flex-col gap-2">
            <p className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
              <Icon name="visibility" className="text-[18px] text-primary" />
              Hình dạng gói khi hiển thị cho người dùng:
            </p>
            <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/50 p-4">
              <VipPlanCard
                planName={watchedPlanName || 'Gói VIP Mới'}
                durationDays={watchedDurationDays || 30}
                priceVnd={watchedPriceVnd || 0}
                featured={previewFeatured}
                badgeText="Tiết kiệm nhất"
                isLivePreview={true}
              />
            </div>
          </div>
        </div>
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

/**
 * Hộp thoại Chỉnh sửa toàn diện gói VIP (Tên gói, Thời hạn, Giá, Trạng thái) kèm Live Preview.
 */
const EditPlanDialog: React.FC<{ plan: AdminPlan | null; onClose: () => void }> = ({ plan, onClose }) => {
  const update = useUpdatePlan();
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewFeatured, setPreviewFeatured] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<EditPlanValues>({ resolver: zodResolver(editPlanSchema) });

  useEffect(() => {
    if (plan) {
      setFormError(null);
      reset({
        planName: plan.planName,
        durationDays: plan.durationDays,
        priceVnd: plan.priceVnd,
        isActive: plan.isActive,
      });
      setPreviewFeatured(plan.durationDays >= 365);
    }
  }, [plan, reset]);

  const watchedPlanName = watch('planName');
  const watchedDurationDays = watch('durationDays');
  const watchedPriceVnd = watch('priceVnd');
  const watchedIsActive = watch('isActive');

  const submit = handleSubmit((values) => {
    if (!plan) return;
    setFormError(null);
    update.mutate(
      { id: plan.planId, body: values },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || `Đã cập nhật gói ${values.planName}.`);
          onClose();
        },
        onError: (error) => {
          const apiError = handleWriteError(error, {
            setError,
            fields: ['planName', 'durationDays', 'priceVnd', 'isActive'],
            onConflict: setConflict,
          });
          if (apiError.status === 400 && apiError.details.length === 0) setFormError(apiError.message);
        },
      }
    );
  });

  return (
    <>
      <FormDialog
        show={!!plan}
        title={plan ? `Sửa gói VIP: ${plan.planName}` : ''}
        size="lg"
        onClose={() => !update.isPending && onClose()}
        onSubmit={submit}
        submitLabel="Lưu thay đổi"
        loading={update.isPending}
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <div className="grid gap-space-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Cột trái: Form điều chỉnh */}
          <div className="flex flex-col gap-space-md">
            <FormRow id="edit-plan-name" label="Tên gói" required error={errors.planName?.message}>
              <input
                id="edit-plan-name"
                maxLength={100}
                aria-invalid={!!errors.planName}
                className={CONTROL}
                {...register('planName')}
              />
            </FormRow>

            <div className="grid gap-space-md sm:grid-cols-2">
              <FormRow id="edit-plan-days" label="Thời hạn (ngày)" required error={errors.durationDays?.message}>
                <input
                  id="edit-plan-days"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-invalid={!!errors.durationDays}
                  className={CONTROL}
                  {...register('durationDays', { setValueAs: toNumber })}
                />
              </FormRow>
              <FormRow id="edit-plan-price" label="Giá bán (VND)" required error={errors.priceVnd?.message}>
                <input
                  id="edit-plan-price"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  aria-invalid={!!errors.priceVnd}
                  className={CONTROL}
                  {...register('priceVnd', { setValueAs: toNumber })}
                />
              </FormRow>
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="font-label-md text-label-md text-on-surface font-semibold mb-1">
                Trạng thái hiển thị
              </legend>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4 rounded"
                  {...register('isActive')}
                />
                <span className="font-label-md text-label-md text-on-surface">
                  Đang mở bán cho người dùng (bỏ chọn để ẩn gói)
                </span>
              </label>
            </fieldset>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-container bg-surface-container-low p-3 hover:bg-surface-container transition-colors">
              <input
                type="checkbox"
                checked={previewFeatured}
                onChange={(e) => setPreviewFeatured(e.target.checked)}
                className="accent-primary h-4 w-4 rounded"
              />
              <span className="font-label-md text-label-md text-on-surface">
                Xem thử ở định dạng Thẻ nổi bật (&quot;Tiết kiệm nhất&quot;)
              </span>
            </label>

            <FormAlert tone="info">
              Giá mới chỉ áp dụng cho đơn hàng tạo sau khi lưu (BR-ADM-PAY-001). Người dùng đang sử dụng gói VIP không bị tính lại tiền.
            </FormAlert>
          </div>

          {/* Cột phải: Live Preview */}
          <div className="flex flex-col gap-2">
            <p className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-1.5">
              <Icon name="visibility" className="text-[18px] text-primary" />
              Hình dạng gói khi hiển thị cho người dùng:
            </p>
            <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/50 p-4">
              <VipPlanCard
                planName={watchedPlanName || 'Tên gói'}
                durationDays={watchedDurationDays || 30}
                priceVnd={watchedPriceVnd || 0}
                isActive={watchedIsActive}
                featured={previewFeatured}
                badgeText="Tiết kiệm nhất"
                isLivePreview={true}
              />
            </div>
          </div>
        </div>
      </FormDialog>
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </>
  );
};

/**
 * Hộp thoại Đổi giá nhanh gói VIP (giữ nguyên quy trình tối ưu thao tác nhanh).
 */
const PriceDialog: React.FC<{ plan: AdminPlan | null; onClose: () => void }> = ({ plan, onClose }) => {
  const update = useUpdatePlan();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<{ priceVnd: number }>({ resolver: zodResolver(priceSchema) });

  useEffect(() => {
    if (plan) reset({ priceVnd: plan.priceVnd });
  }, [plan, reset]);

  const price = watch('priceVnd');
  const submit = handleSubmit((values) => {
    if (!plan) return;
    if (values.priceVnd === plan.priceVnd) {
      notifyInfo('Giá chưa thay đổi.');
      return;
    }
    update.mutate(
      { id: plan.planId, body: { priceVnd: values.priceVnd } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã cập nhật giá gói.');
          onClose();
        },
        onError: (error) => {
          if (handleWriteError(error, { setError, fields: ['priceVnd'] }).status === 404) onClose();
        },
      }
    );
  });

  return (
    <FormDialog
      show={!!plan}
      title={plan ? `Đổi giá: ${plan.planName}` : ''}
      onClose={() => !update.isPending && onClose()}
      onSubmit={submit}
      submitLabel="Lưu giá mới"
      loading={update.isPending}
    >
      <FormRow
        id="plan-new-price"
        label="Giá mới (VND)"
        required
        error={errors.priceVnd?.message}
        hint={plan ? `Giá hiện tại: ${formatVnd(plan.priceVnd)}` : undefined}
      >
        <input
          id="plan-new-price"
          type="number"
          min={1}
          step={1000}
          inputMode="numeric"
          aria-invalid={!!errors.priceVnd}
          className={CONTROL}
          {...register('priceVnd', { setValueAs: toNumber })}
        />
      </FormRow>
      <FormAlert tone="info">
        Giá mới {Number.isFinite(price) && price > 0 ? `(${formatVnd(price)}) ` : ''}chỉ áp dụng cho đơn hàng tạo sau khi lưu. Người dùng đang có VIP không bị tính lại tiền.
      </FormAlert>
    </FormDialog>
  );
};

export default AdminSubscriptionPlansPage;
