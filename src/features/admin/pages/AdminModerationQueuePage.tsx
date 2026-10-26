/**
 * SCR-34 & SCR-35 · admin/AdminModerationQueue · `/admin/moderation`
 * FN-ADM-04 (GET /admin/moderation/queue) · FN-ADM-05 (PUT /admin/moderation/reports/{id}/decision) · FN-ADM-06 (DELETE /admin/comments/{id})
 * Gộp toàn diện kiểm duyệt nội dung & bình luận vào một Hub tổng với 4 Tab trực quan:
 * 1. "Tất cả nội dung" (ALL)
 * 2. "Bài do AI gắn cờ" (AI_SCAN)
 * 3. "Bài bị báo cáo" (USER_REPORT)
 * 4. "Bình luận" (COMMENT)
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '@/api/http';
import { formatDateTime } from '@/lib/format';
import { getRecipe } from '@/features/recipes/api/recipes.api';
import { getPost } from '@/features/community/api/community.api';
import { DecisionModal, type DecisionTarget } from '../components/DecisionModal';
import { FormModal, ReasonConfirmModal } from '../components/FormModal';
import { AdminPage } from '../components/AdminPage';
import { FilterBar, ResetButton, SelectFilter } from '../components/Filters';
import { Pager } from '../components/Pager';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useDecideReport, useDeleteComment, useModerationCount, useModerationQueue } from '../hooks/useModeration';
import { useListState } from '../hooks/useListState';
import { SOURCE_LABEL, TARGET_LABEL, VIOLATION_LABEL, targetLink } from '../lib/labels';
import { toastApiError } from '../lib/api';
import type { ModerationItem, ModerationTargetType, ReportSource, ViolationType } from '../types/admin.types';

const VIOLATIONS = Object.entries(VIOLATION_LABEL) as [ViolationType, string][];
const TARGETS = Object.entries(TARGET_LABEL) as [ModerationTargetType, string][];

const AI_COUNT_FILTER = { reportSource: 'AI_SCAN' as const };
const USER_COUNT_FILTER = { reportSource: 'USER_REPORT' as const };
const COMMENT_COUNT_FILTER = { targetType: 'COMMENT' as const };

export type ModerationTab = 'ALL' | 'AI_SCAN' | 'USER_REPORT' | 'COMMENT';

interface Filters extends Record<string, unknown> {
  reportSource?: ReportSource;
  violationType?: ViolationType;
  targetType?: ModerationTargetType;
}

export interface AdminModerationQueuePageProps {
  initialTab?: ModerationTab;
}

export function AdminModerationQueuePage({ initialTab }: AdminModerationQueuePageProps = {}) {
  const [searchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as ModerationTab | null;
  const defaultTab: ModerationTab = initialTab ?? (paramTab && ['ALL', 'AI_SCAN', 'USER_REPORT', 'COMMENT'].includes(paramTab) ? paramTab : 'ALL');

  const [activeTab, setActiveTab] = useState<ModerationTab>(defaultTab);

  const { filters, page, size, setFilter, setMultipleFilters, setPage, reset } = useListState<Filters>({
    reportSource: defaultTab === 'AI_SCAN' ? 'AI_SCAN' : defaultTab === 'USER_REPORT' ? 'USER_REPORT' : undefined,
    targetType: defaultTab === 'COMMENT' ? 'COMMENT' : undefined,
  });

  const q = useModerationQueue({ ...filters, page, size });
  const allCount = useModerationCount();
  const aiCount = useModerationCount(AI_COUNT_FILTER);
  const userCount = useModerationCount(USER_COUNT_FILTER);
  const commentCount = useModerationCount(COMMENT_COUNT_FILTER);

  const decide = useDecideReport();
  const del = useDeleteComment();

  const [target, setTarget] = useState<DecisionTarget | null>(null);
  const [toDelete, setToDelete] = useState<ModerationItem | null>(null);
  const [inspecting, setInspecting] = useState<ModerationItem | null>(null);

  const selectTab = (tab: ModerationTab) => {
    setActiveTab(tab);
    if (tab === 'ALL') {
      setMultipleFilters({ reportSource: undefined, targetType: undefined });
    } else if (tab === 'AI_SCAN') {
      setMultipleFilters({ reportSource: 'AI_SCAN', targetType: undefined });
    } else if (tab === 'USER_REPORT') {
      setMultipleFilters({ reportSource: 'USER_REPORT', targetType: undefined });
    } else if (tab === 'COMMENT') {
      setMultipleFilters({ targetType: 'COMMENT', reportSource: undefined });
    }
  };

  const open = (item: ModerationItem, decision: DecisionTarget['decision']) => {
    decide.reset();
    setTarget({
      reportId: item.reportId,
      decision,
      label: `${TARGET_LABEL[item.targetType] ?? item.targetType} #${item.targetId}`,
    });
  };

  const items = q.data?.items ?? [];

  return (
    <AdminPage
      title="Hàng đợi kiểm duyệt nội dung"
      subtitle="Trung tâm kiểm duyệt hợp nhất: bài viết, công thức, video và bình luận do AI phát hiện hoặc người dùng báo cáo (Human-in-the-loop)."
    >
      {/* 4 Tab trực quan: Tất cả, AI gắn cờ, Người dùng báo cáo, Bình luận */}
      <div className="flex flex-wrap border-b border-outline-variant/30" role="tablist" aria-label="Nguồn và loại kiểm duyệt">
        {[
          { id: 'ALL' as const, label: 'Tất cả nội dung', icon: 'dashboard_customize', count: allCount },
          { id: 'AI_SCAN' as const, label: 'Bài do AI gắn cờ', icon: 'smart_toy', count: aiCount },
          { id: 'USER_REPORT' as const, label: 'Bài bị báo cáo', icon: 'group', count: userCount },
          { id: 'COMMENT' as const, label: 'Bình luận', icon: 'rate_review', count: commentCount },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id.toLowerCase()}`}
            aria-selected={activeTab === t.id}
            aria-controls="panel-moderation-queue"
            onClick={() => selectTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-label-md text-label-md transition-all sm:px-5 sm:font-label-lg sm:text-label-lg ${
              activeTab === t.id
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-on-surface-variant hover:border-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
            <span>{t.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm ${
                activeTab === t.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {t.count.isLoading ? '…' : t.count.isError ? '—' : (t.count.data ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <FilterBar>
        <SelectFilter
          label="Loại vi phạm"
          value={filters.violationType}
          onChange={(v) => setFilter('violationType', v)}
          options={VIOLATIONS}
        />
        {activeTab !== 'COMMENT' && (
          <SelectFilter
            label="Đối tượng"
            value={filters.targetType}
            onChange={(v) => setFilter('targetType', v)}
            options={TARGETS}
          />
        )}
        <ResetButton
          onClick={() => {
            reset();
            selectTab(activeTab);
          }}
        />
      </FilterBar>

      <div
        id="panel-moderation-queue"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"
      >
        <QueryState
          isLoading={q.isLoading}
          isError={q.isError}
          error={q.error}
          refetch={q.refetch}
          isEmpty={items.length === 0}
          emptyTitle="Hàng đợi trống"
          emptyHint="Không có nội dung nào cần kiểm duyệt trong mục này."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                  <th className="px-space-lg py-space-md font-semibold">Báo cáo</th>
                  <th className="px-space-md py-space-md font-semibold">Đối tượng</th>
                  <th className="px-space-md py-space-md font-semibold">Vi phạm &amp; bằng chứng</th>
                  <th className="px-space-md py-space-md font-semibold">Trạng thái</th>
                  <th className="px-space-lg py-space-md text-right font-semibold">Quyết định</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {items.map((it) => {
                  const link = targetLink(it.targetType, it.targetId);
                  const isComment = it.targetType === 'COMMENT';
                  return (
                    <tr
                      key={it.reportId}
                      className={`transition-colors hover:bg-surface-container-low/60 ${
                        it.reportSource === 'AI_SCAN' ? 'bg-secondary-container/10' : ''
                      }`}
                    >
                      <td className="px-space-lg py-space-md align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-secondary">#RPT-{it.reportId}</span>
                          <span className="inline-flex items-center gap-1 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">
                              {it.reportSource === 'AI_SCAN' ? 'smart_toy' : 'group'}
                            </span>
                            {SOURCE_LABEL[it.reportSource] ?? it.reportSource}
                          </span>
                          <span className="text-outline">{formatDateTime(it.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-space-md py-space-md align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant font-medium">
                              {TARGET_LABEL[it.targetType] ?? it.targetType}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInspecting(it)}
                              className="font-mono font-bold text-primary hover:underline cursor-pointer"
                              title="Bấm để xem nội dung nguyên bản"
                            >
                              #{it.targetId}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInspecting(it)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 font-label-sm text-label-sm text-primary hover:bg-primary/20 font-semibold cursor-pointer w-fit transition-colors"
                            title="Xem chi tiết nội dung nguyên bản ngay tại đây"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {it.targetType === 'RECIPE' ? 'restaurant_menu' : it.targetType === 'POST' ? 'article' : 'chat'}
                            </span>
                            <span>Xem nguyên bản</span>
                          </button>
                        </div>
                      </td>
                      <td className="max-w-[340px] px-space-md py-space-md align-top">
                        <div className="flex flex-col gap-2">
                          <span className="w-fit rounded bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-bold text-on-surface">
                            {VIOLATION_LABEL[it.violationType] ?? it.violationType}
                          </span>
                          {it.evidenceSummary && (
                            <div className="rounded-lg bg-surface-container-low p-2.5 border-l-2 border-primary/50">
                              <span className="text-[11px] font-semibold text-on-surface-variant block mb-0.5">Trích dẫn nội dung vi phạm:</span>
                              <p className="text-on-surface text-xs italic font-medium leading-relaxed line-clamp-3">
                                {it.evidenceSummary}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-space-md py-space-md align-top">
                        <StatusPill tone={it.status === 'INVESTIGATING' ? 'warn' : 'wait'}>
                          {it.status === 'INVESTIGATING' ? 'Đang điều tra' : 'Chờ xử lý'}
                        </StatusPill>
                      </td>
                      <td className="px-space-lg py-space-md text-right align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspecting(it)}
                            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-low flex items-center gap-1"
                            title="Xem chi tiết nội dung vi phạm"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => open(it, 'DISMISS')}
                            className="rounded-xl bg-surface-container px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
                          >
                            Bác bỏ báo cáo
                          </button>
                          {isComment && (
                            <button
                              type="button"
                              onClick={() => {
                                del.reset();
                                setToDelete(it);
                              }}
                              className="rounded-xl bg-error/15 px-3 py-1.5 font-label-md text-label-md font-semibold text-error hover:bg-error/25"
                            >
                              Xóa bình luận
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => open(it, 'UPHOLD')}
                            className="rounded-xl bg-error px-3 py-1.5 font-label-md text-label-md text-on-error shadow-sm hover:opacity-90"
                          >
                            Xác nhận vi phạm
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} onPage={setPage} fetching={q.isFetching} unit="mục cần kiểm duyệt" />}
        </QueryState>
      </div>

      <DecisionModal
        target={target}
        pending={decide.isPending}
        error={decide.isError ? apiErrorMessage(decide.error) : null}
        onHide={() => setTarget(null)}
        onSubmit={(v) =>
          target &&
          decide.mutate(
            { id: target.reportId, body: { decision: target.decision, ...v } },
            {
              onSuccess: () => setTarget(null),
              onError: (e) => {
                const s = (e as { response?: { status?: number } }).response?.status;
                if (s === 404) toastApiError(e);
              },
            },
          )
        }
      />

      <ReasonConfirmModal
        show={toDelete !== null}
        title="Xóa bình luận vi phạm?"
        consequence={`Bình luận #${toDelete?.targetId ?? ''} và toàn bộ trả lời bên dưới sẽ bị ẩn khỏi người dùng (xóa mềm). Lý do xóa được lưu vào nhật ký kiểm toán.`}
        confirmLabel="Xóa bình luận"
        pending={del.isPending}
        error={del.isError ? apiErrorMessage(del.error) : null}
        onHide={() => setToDelete(null)}
        onConfirm={(reason) =>
          toDelete &&
          del.mutate(
            { id: toDelete.targetId, reason },
            {
              onSuccess: () => {
                setToDelete(null);
                void q.refetch();
              },
            },
          )
        }
      />

      {inspecting && (
        <InspectionModal
          item={inspecting}
          onClose={() => setInspecting(null)}
          onOpenDecision={(it, dec) => open(it, dec)}
          onDeleteComment={(it) => {
            del.reset();
            setToDelete(it);
          }}
        />
      )}
    </AdminPage>
  );
}

function InspectionModal({
  item,
  onClose,
  onOpenDecision,
  onDeleteComment,
}: {
  item: ModerationItem;
  onClose: () => void;
  onOpenDecision: (item: ModerationItem, decision: 'UPHOLD' | 'DISMISS') => void;
  onDeleteComment: (item: ModerationItem) => void;
}) {
  const isComment = item.targetType === 'COMMENT';

  return (
    <FormModal
      show={true}
      onHide={onClose}
      title={`Thẩm tra ${TARGET_LABEL[item.targetType] ?? item.targetType} #${item.targetId} (Báo cáo #RPT-${item.reportId})`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Thông tin báo cáo & Nguồn */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-surface-container-low p-3.5 text-xs">
          <div>
            <span className="text-on-surface-variant block mb-1">Nguồn phát hiện</span>
            <span className="font-semibold text-on-surface inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">
                {item.reportSource === 'AI_SCAN' ? 'smart_toy' : 'group'}
              </span>
              {SOURCE_LABEL[item.reportSource] ?? item.reportSource}
            </span>
          </div>
          <div>
            <span className="text-on-surface-variant block mb-1">Thời gian ghi nhận</span>
            <span className="font-semibold text-on-surface">{formatDateTime(item.createdAt)}</span>
          </div>
          <div>
            <span className="text-on-surface-variant block mb-1">Đối tượng</span>
            <span className="font-semibold text-on-surface">
              {TARGET_LABEL[item.targetType] ?? item.targetType} #{item.targetId}
            </span>
          </div>
          <div>
            <span className="text-on-surface-variant block mb-1">Loại vi phạm</span>
            <span className="font-bold text-error">
              {VIOLATION_LABEL[item.violationType] ?? item.violationType}
            </span>
          </div>
        </div>

        {/* Lý do / Bằng chứng vi phạm */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-error">report</span>
            Lý do / Bằng chứng vi phạm ghi nhận
          </label>
          <div className="rounded-xl border border-error/30 bg-error-container/15 p-3.5 text-body-md text-on-surface leading-relaxed shadow-inner">
            {item.evidenceSummary ? (
              <p className="whitespace-pre-wrap font-medium">{item.evidenceSummary}</p>
            ) : (
              <p className="text-on-surface-variant italic">Không có đoạn trích dẫn mô tả bằng chứng.</p>
            )}
          </div>
        </div>

        {/* Nội dung nguyên bản từ Database */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              {item.targetType === 'RECIPE' ? 'restaurant_menu' : item.targetType === 'POST' ? 'article' : 'chat'}
            </span>
            Nội dung nguyên bản của {TARGET_LABEL[item.targetType] ?? item.targetType} #{item.targetId}
          </label>
          <OriginalContentRenderer item={item} />
        </div>

        {/* Thao tác xử lý */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDecision(item, 'DISMISS');
            }}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
          >
            Bác bỏ báo cáo
          </button>
          {isComment && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteComment(item);
              }}
              className="rounded-xl bg-error/15 px-4 py-2 font-label-md text-label-md font-semibold text-error hover:bg-error/25"
            >
              Xóa bình luận
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDecision(item, 'UPHOLD');
            }}
            className="rounded-xl bg-error px-4 py-2 font-label-md text-label-md text-on-error hover:opacity-90 shadow-sm"
          >
            Xác nhận vi phạm
          </button>
        </div>
      </div>
    </FormModal>
  );
}

function OriginalContentRenderer({ item }: { item: ModerationItem }) {
  const isRecipe = item.targetType === 'RECIPE';
  const isPost = item.targetType === 'POST';

  const recipeQuery = useQuery({
    queryKey: ['admin-preview-recipe', item.targetId],
    queryFn: () => getRecipe(item.targetId),
    enabled: isRecipe,
  });

  const postQuery = useQuery({
    queryKey: ['admin-preview-post', item.targetId],
    queryFn: () => getPost(item.targetId),
    enabled: isPost,
  });

  if (isRecipe) {
    if (recipeQuery.isLoading) {
      return (
        <div className="p-4 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Đang tải dữ liệu công thức nguyên bản...
        </div>
      );
    }
    if (recipeQuery.isError || !recipeQuery.data) {
      return (
        <div className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface-variant">
          Không thể tải chi tiết công thức từ máy chủ hoặc công thức đã bị xóa.
        </div>
      );
    }
    const r = recipeQuery.data;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 max-h-[380px] overflow-y-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {r.imageUrl && (
            <img
              src={r.imageUrl}
              alt={r.title}
              className="w-full sm:w-36 h-24 object-cover rounded-lg border border-outline-variant/40 shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface line-clamp-2">
              {r.title}
            </h4>
            {r.description && (
              <p className="text-body-sm text-on-surface-variant italic line-clamp-2">
                {r.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-on-surface-variant">
              {r.dietarySchool && (
                <span className="rounded bg-primary-container/30 px-1.5 py-0.5 text-primary font-medium">
                  {r.dietarySchool}
                </span>
              )}
              {r.cookTimeMinutes && <span>⏱️ Nấu: {r.cookTimeMinutes}p</span>}
              {r.prepTimeMinutes && <span>🔪 Chuẩn bị: {r.prepTimeMinutes}p</span>}
              {r.caloriesKcal && <span>🔥 {Math.round(r.caloriesKcal)} kcal</span>}
            </div>
          </div>
        </div>

        {/* Danh sách nguyên liệu nguyên bản */}
        {r.ingredients && r.ingredients.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[15px]">nutrition</span>
              Nguyên liệu nguyên bản ({r.ingredients.length} mục)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {r.ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between items-center rounded-lg bg-surface-container-low px-2.5 py-1">
                  <span className="font-medium text-on-surface">{ing.name}</span>
                  <span className="text-on-surface-variant font-mono">
                    {ing.quantity > 0 ? `${ing.quantity} ` : ''}{ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Các bước nấu nguyên bản */}
        {r.instructions && r.instructions.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
            <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[15px]">format_list_numbered</span>
              Các bước chế biến nguyên bản ({r.instructions.length} bước)
            </span>
            <ol className="flex flex-col gap-1.5 text-xs text-on-surface leading-relaxed">
              {r.instructions.map((step, i) => (
                <li key={i} className="rounded-lg bg-surface-container-low p-2">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  if (isPost) {
    if (postQuery.isLoading) {
      return (
        <div className="p-4 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Đang tải dữ liệu bài viết nguyên bản...
        </div>
      );
    }
    if (postQuery.isError || !postQuery.data) {
      return (
        <div className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface-variant">
          Không thể tải chi tiết bài viết từ máy chủ hoặc bài viết đã bị xóa.
        </div>
      );
    }
    const p = postQuery.data;
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 max-h-[380px] overflow-y-auto">
        <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {p.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant pb-1.5 border-b border-surface-container">
          <span className="font-medium text-on-surface">{p.author?.fullName ?? 'Tác giả'}</span>
          <span>•</span>
          <span>{formatDateTime(p.createdAt)}</span>
        </div>
        {p.imageUrl && (
          <img
            src={p.imageUrl}
            alt={p.title}
            className="w-full max-h-52 object-cover rounded-lg border border-outline-variant/40"
          />
        )}
        <div className="text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
          {p.content}
        </div>
      </div>
    );
  }

  return null;
}

export default AdminModerationQueuePage;
