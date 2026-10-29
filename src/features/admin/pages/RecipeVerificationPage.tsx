/**
 * SCR-37 · admin/RecipeVerification · `/admin/recipe-verification`
 * FN-ADM-09: POST /admin/recipes/{id}/verify (cấp huy hiệu, note ≤ 500) · DELETE /admin/recipes/{id}/verify (gỡ).
 * Spec không có danh sách ứng viên riêng: dùng GET /recipes công khai (có isVerified, voteCount), tối đa 20/trang.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiErrorCode, apiErrorData, apiErrorMessage } from '@/api/http';
import { FormAlert } from '@/components/ui/forms';
import { dietarySchoolLabel } from '@/constants/dietarySchools';
import { getRecipe } from '@/features/recipes/api/recipes.api';
import { toast } from '@/stores/ui.store';
import { verifyRecipe } from '../api/catalog.api';
import { AdminPage } from '../components/AdminPage';
import { TextArea } from '../components/fields';
import { FilterBar, ResetButton, SearchFilter, SelectFilter } from '../components/Filters';
import { ConfirmDialog, FormActions, FormModal, ServerError } from '../components/FormModal';
import { Pager } from '../components/Pager';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useCategories, useRecipesForVerification, useUnverifyRecipe, useVerifyRecipe } from '../hooks/useCatalog';
import { useListState } from '../hooks/useListState';
import { formatFailedCriteria } from '../lib/criteria';
import { adminKeys } from '../lib/keys';
import { CRITERIA_HINT } from '../lib/labels';
import { verifyNoteSchema, type VerifyNoteForm } from '../schemas/admin.schemas';
import type { RecipeSummary } from '../types/admin.types';

const VOTE_MIN = 10;

interface Filters extends Record<string, unknown> {
  keyword: string;
  categoryId?: string;
  badgeStatus?: 'all' | 'eligible' | 'unverified' | 'verified';
}

export function RecipeVerificationPage() {
  const { filters, page, setFilter, setPage, reset } = useListState<Filters>({ keyword: '' }, 10);
  const q = useRecipesForVerification({ keyword: filters.keyword || undefined, categoryId: filters.categoryId ? Number(filters.categoryId) : undefined, page, size: 10 });
  const cats = useCategories();
  const verify = useVerifyRecipe();
  const unverify = useUnverifyRecipe();
  const qc = useQueryClient();
  const [grant, setGrant] = useState<RecipeSummary | null>(null);
  const [revoke, setRevoke] = useState<RecipeSummary | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [previewRecipeId, setPreviewRecipeId] = useState<number | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const items = q.data?.items ?? [];

  const eligibleItems = items.filter((r) => !r.isVerified && (r.voteCount ?? 0) >= VOTE_MIN);

  const displayedItems = items.filter((r) => {
    if (filters.badgeStatus === 'eligible') {
      return !r.isVerified && (r.voteCount ?? 0) >= VOTE_MIN;
    }
    if (filters.badgeStatus === 'unverified') {
      return !r.isVerified;
    }
    if (filters.badgeStatus === 'verified') {
      return r.isVerified;
    }
    return true;
  });

  return (
    <AdminPage title="Xác minh công thức chuẩn chay" subtitle={CRITERIA_HINT}>
      <FilterBar>
        <SearchFilter label="Tìm công thức" value={filters.keyword} onSearch={(v) => setFilter('keyword', v)} placeholder="Tìm theo tên công thức…" />
        <SelectFilter
          label="Danh mục"
          value={filters.categoryId}
          onChange={(v) => setFilter('categoryId', v)}
          options={(cats.data ?? []).map((c) => [String(c.categoryId), c.categoryName] as const)}
        />
        <SelectFilter
          label="Huy hiệu"
          value={filters.badgeStatus}
          onChange={(v) => setFilter('badgeStatus', v)}
          options={[
            ['eligible', 'Đủ chuẩn chờ cấp'],
            ['unverified', 'Chưa có huy hiệu'],
            ['verified', 'Đã cấp chuẩn chay'],
          ] as const}
        />
        <ResetButton onClick={reset} />

        <div className="w-full lg:w-auto lg:ml-auto">
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            disabled={eligibleItems.length === 0}
            className={`w-full lg:w-auto rounded-lg px-3.5 py-2 font-label-md text-label-md font-semibold transition-all inline-flex items-center justify-center gap-2 ${
              eligibleItems.length > 0
                ? 'bg-primary text-on-primary hover:opacity-90 shadow-sm cursor-pointer'
                : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'
            }`}
            title={
              eligibleItems.length > 0
                ? `Có ${eligibleItems.length} công thức đủ điều kiện trong trang này`
                : 'Không có công thức nào đủ điều kiện cấp huy hiệu trong danh sách'
            }
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Cấp huy hiệu bài đủ chuẩn</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                eligibleItems.length > 0 ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {eligibleItems.length}
            </span>
          </button>
        </div>
      </FilterBar>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} refetch={q.refetch} isEmpty={displayedItems.length === 0} emptyTitle="Không có công thức phù hợp" emptyHint="Thử đổi từ khóa hoặc danh mục.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-space-lg py-space-md font-semibold">Công thức</th>
                  <th className="px-space-md py-space-md font-semibold">Trường phái</th>
                  <th className="px-space-md py-space-md font-semibold">Thời gian nấu</th>
                  <th className="px-space-md py-space-md font-semibold">Lượt tim</th>
                  <th className="px-space-md py-space-md font-semibold">Huy hiệu</th>
                  <th className="px-space-lg py-space-md text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {displayedItems.map((r) => (
                  <tr key={r.recipeId} className="hover:bg-surface-container-low/60">
                    <td className="px-space-lg py-space-md">
                      <button
                        type="button"
                        onClick={() => setPreviewRecipeId(r.recipeId)}
                        className="font-semibold text-primary hover:underline text-left cursor-pointer"
                        title="Xem chi tiết công thức ngay tại đây"
                      >
                        {r.title}
                      </button>
                      <div className="font-mono text-label-sm text-outline">#{r.recipeId}</div>
                    </td>
                    <td className="px-space-md py-space-md text-on-surface-variant font-medium">{dietarySchoolLabel(r.dietarySchool) || '—'}</td>
                    <td className="px-space-md py-space-md text-on-surface-variant">{r.cookTimeMinutes ? `${r.cookTimeMinutes} phút` : '—'}</td>
                    <td className="px-space-md py-space-md">
                      <span className={(r.voteCount ?? 0) >= VOTE_MIN ? 'font-semibold text-primary' : 'text-on-surface-variant'}>{r.voteCount ?? 0}</span>
                      <span className="text-outline"> / {VOTE_MIN}</span>
                    </td>
                    <td className="px-space-md py-space-md">
                      {r.isVerified ? (
                        <StatusPill tone="ok">Chuẩn chay</StatusPill>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                          <StatusPill>Chưa xác minh</StatusPill>
                          {(r.voteCount ?? 0) >= VOTE_MIN && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
                              <span className="material-symbols-outlined text-[13px]">verified</span>
                              Đủ chuẩn
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-space-lg py-space-md text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewRecipeId(r.recipeId)}
                          className="rounded-lg bg-surface-container px-2.5 py-1.5 font-label-sm text-label-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                          title="Xem chi tiết nguyên liệu và các bước chế biến"
                        >
                          Chi tiết
                        </button>
                        {r.isVerified ? (
                          <button
                            type="button"
                            onClick={() => { unverify.reset(); setRevoke(r); }}
                            className="rounded-lg bg-error/15 px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-error hover:bg-error/25 transition-colors cursor-pointer"
                          >
                            Gỡ huy hiệu
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { verify.reset(); setFailed([]); setGrant(r); }}
                            className={`rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm font-semibold transition-opacity cursor-pointer shadow-sm inline-flex items-center gap-1 ${
                              (r.voteCount ?? 0) >= VOTE_MIN
                                ? 'bg-primary text-on-primary hover:opacity-90'
                                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                            title={(r.voteCount ?? 0) >= VOTE_MIN ? 'Đạt đủ 10 lượt tim, sẵn sàng cấp huy hiệu' : 'Chưa đạt tối thiểu 10 lượt tim'}
                          >
                            {(r.voteCount ?? 0) >= VOTE_MIN && <span className="material-symbols-outlined text-[14px]">verified</span>}
                            Cấp huy hiệu
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} onPage={setPage} fetching={q.isFetching} unit="công thức" />}
        </QueryState>
      </div>

      {previewRecipeId !== null && (
        <RecipePreviewModal
          recipeId={previewRecipeId}
          onClose={() => setPreviewRecipeId(null)}
          onOpenGrant={(r) => {
            setPreviewRecipeId(null);
            verify.reset();
            setFailed([]);
            setGrant(r);
          }}
          onOpenRevoke={(r) => {
            setPreviewRecipeId(null);
            unverify.reset();
            setRevoke(r);
          }}
        />
      )}

      <FormModal show={grant !== null} title="Cấp huy hiệu “Công thức chay chuẩn”" onHide={() => setGrant(null)} size="sm">
        {grant && (
          <GrantForm
            recipe={grant}
            pending={verify.isPending}
            failed={failed}
            error={verify.isError && apiErrorCode(verify.error) !== 'ERR_RECIPE_NOT_ELIGIBLE' ? apiErrorMessage(verify.error) : null}
            eligibilityMessage={verify.isError && apiErrorCode(verify.error) === 'ERR_RECIPE_NOT_ELIGIBLE' ? apiErrorMessage(verify.error) : null}
            onCancel={() => setGrant(null)}
            onSubmit={(note) =>
              verify.mutate(
                { id: grant.recipeId, note: note || undefined },
                { onSuccess: () => setGrant(null), onError: (e) => setFailed(apiErrorCode(e) === 'ERR_RECIPE_NOT_ELIGIBLE' ? formatFailedCriteria(apiErrorData(e)) : []) },
              )
            }
          />
        )}
      </FormModal>
      <ConfirmDialog
        show={revoke !== null}
        title="Gỡ huy hiệu?"
        consequence={`Công thức “${revoke?.title ?? ''}” sẽ không còn nhãn “Công thức chay chuẩn”. Thao tác được ghi vào nhật ký kiểm toán.`}
        confirmLabel="Gỡ huy hiệu"
        pending={unverify.isPending}
        error={unverify.isError ? apiErrorMessage(unverify.error) : null}
        onHide={() => setRevoke(null)}
        onConfirm={() => revoke && unverify.mutate(revoke.recipeId, { onSuccess: () => setRevoke(null) })}
      />

      {showBatchModal && (
        <BatchGrantModal
          show={showBatchModal}
          recipes={eligibleItems}
          onHide={() => setShowBatchModal(false)}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: adminKeys.recipesAll });
            void qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
            void q.refetch();
          }}
        />
      )}
    </AdminPage>
  );
}

function BatchGrantModal({
  show,
  recipes,
  onHide,
  onSuccess,
}: {
  show: boolean;
  recipes: RecipeSummary[];
  onHide: () => void;
  onSuccess: () => void;
}) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<{ id: number; title: string; success: boolean; error?: string }[] | null>(null);

  const handleStart = async () => {
    setIsSubmitting(true);
    const runResults: { id: number; title: string; success: boolean; error?: string }[] = [];
    for (let i = 0; i < recipes.length; i++) {
      const r = recipes[i];
      setProgress({ current: i + 1, total: recipes.length });
      try {
        await verifyRecipe(r.recipeId, note.trim() || undefined);
        runResults.push({ id: r.recipeId, title: r.title, success: true });
      } catch (err) {
        runResults.push({
          id: r.recipeId,
          title: r.title,
          success: false,
          error: apiErrorMessage(err),
        });
      }
    }
    setIsSubmitting(false);
    setResults(runResults);
    onSuccess();
    const successCount = runResults.filter((r) => r.success).length;
    if (successCount > 0) {
      toast.success(`Đã cấp huy hiệu thành công cho ${successCount} công thức.`);
    }
  };

  const handleClose = () => {
    setResults(null);
    setProgress(null);
    setNote('');
    onHide();
  };

  return (
    <FormModal
      show={show}
      title="Cấp huy hiệu cho các bài đủ tiêu chuẩn"
      onHide={isSubmitting ? () => {} : handleClose}
      size="lg"
    >
      {results ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/30">
            <h5 className="font-semibold text-body-md text-on-surface mb-2 flex items-center justify-between">
              <span>Kết quả xử lý</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                {results.filter((r) => r.success).length}/{results.length} thành công
              </span>
            </h5>
            <ul className="flex flex-col gap-1.5 max-h-60 overflow-y-auto text-xs pr-1">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <span className="truncate max-w-[260px] font-medium text-on-surface">{r.title}</span>
                  {r.success ? (
                    <span className="text-primary font-semibold flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      Đã cấp
                    </span>
                  ) : (
                    <span className="text-error font-medium truncate max-w-[150px] shrink-0 text-right" title={r.error}>
                      {r.error || 'Thất bại'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 cursor-pointer shadow-sm"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Hệ thống phát hiện <strong className="text-primary font-bold">{recipes.length} công thức</strong> đã đáp ứng đầy đủ tiêu chí chuẩn chay (tối thiểu 10 lượt yêu thích và hoàn tất kiểm duyệt nội dung):
          </p>

          <div className="max-h-52 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-low p-2">
            <ul className="flex flex-col gap-1.5 text-xs">
              {recipes.map((r) => (
                <li key={r.recipeId} className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-on-surface truncate max-w-[280px]">{r.title}</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">#{r.recipeId} · {dietarySchoolLabel(r.dietarySchool)}</span>
                  </div>
                  <span className="text-primary font-bold text-xs shrink-0 bg-primary/10 px-2 py-0.5 rounded-full">
                    {r.voteCount ?? 0}/10 tim
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <TextArea
            label="Ghi chú cấp huy hiệu chung (không bắt buộc)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ví dụ: Đạt chuẩn kiểm định chất lượng và tương tác cộng đồng."
          />

          {isSubmitting && progress && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-container/20 text-primary text-xs font-medium border border-primary/20">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              <span>Đang xử lý cấp huy hiệu: {progress.current}/{progress.total} công thức...</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="rounded-lg bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting || recipes.length === 0}
              onClick={handleStart}
              className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Xác nhận cấp cho {recipes.length} công thức</span>
            </button>
          </div>
        </div>
      )}
    </FormModal>
  );
}

function GrantForm({ recipe, pending, failed, error, eligibilityMessage, onCancel, onSubmit }: { recipe: RecipeSummary; pending: boolean; failed: string[]; error: string | null; eligibilityMessage: string | null; onCancel: () => void; onSubmit: (note: string) => void }) {
  const { register, handleSubmit, formState } = useForm<VerifyNoteForm>({ resolver: zodResolver(verifyNoteSchema), defaultValues: { note: '' } });
  const hasEnoughVotes = (recipe.voteCount ?? 0) >= VOTE_MIN;
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.note))} noValidate className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-1">
        <p className="font-body-md text-body-md text-on-surface">
          Cấp huy hiệu “Công thức chay chuẩn” cho <strong>{recipe.title}</strong> (#{recipe.recipeId}).
        </p>
        {hasEnoughVotes ? (
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            Công thức đạt {recipe.voteCount ?? 0}/10 lượt tim cộng đồng và đã kiểm duyệt nội dung.
          </p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">warning</span>
            Lưu ý: Công thức mới có {recipe.voteCount ?? 0}/10 lượt tim. Hệ thống có thể từ chối nếu chưa đạt tối thiểu 10 tim.
          </p>
        )}
      </div>
      <TextArea label="Ghi chú (không bắt buộc)" maxLength={500} error={formState.errors.note?.message} {...register('note')} />
      {eligibilityMessage && (
        <FormAlert>
          <span className="flex flex-col gap-1">
            <span>{eligibilityMessage}</span>
            {failed.length > 0 && (
              <ul className="list-disc pl-5">
                {failed.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </span>
        </FormAlert>
      )}
      <ServerError message={error} />
      <FormActions onCancel={onCancel} submitLabel="Cấp huy hiệu" pending={pending} />
    </form>
  );
}

function RecipePreviewModal({
  recipeId,
  onClose,
  onOpenGrant,
  onOpenRevoke,
}: {
  recipeId: number;
  onClose: () => void;
  onOpenGrant: (r: RecipeSummary) => void;
  onOpenRevoke: (r: RecipeSummary) => void;
}) {
  const { data: r, isLoading, isError } = useQuery({
    queryKey: ['admin-recipe-preview', recipeId],
    queryFn: () => getRecipe(recipeId),
  });

  return (
    <FormModal
      show={true}
      onHide={onClose}
      title={`Chi tiết công thức #${recipeId}`}
      size="lg"
    >
      {isLoading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          Đang tải dữ liệu chi tiết công thức...
        </div>
      ) : isError || !r ? (
        <div className="p-4 text-center text-xs text-error">
          Không thể tải chi tiết công thức hoặc công thức đã bị xóa.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 max-h-[560px] overflow-y-auto pr-1">
          {/* 1. Header công thức: ảnh nhỏ bên trái, thông tin bên phải */}
          <div className="flex flex-col sm:flex-row gap-3 items-start rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/40">
            {r.imageUrl ? (
              <img
                src={r.imageUrl}
                alt={r.title}
                className="w-full sm:w-36 h-24 object-cover rounded-lg border border-outline-variant/40 shrink-0"
              />
            ) : (
              <div className="w-full sm:w-36 h-24 rounded-lg bg-surface-container-high flex items-center justify-center text-outline shrink-0">
                <span className="material-symbols-outlined text-[28px]">restaurant</span>
              </div>
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface line-clamp-2">
                  {r.title}
                </h4>
                {r.isVerified ? (
                  <StatusPill tone="ok">Chuẩn chay</StatusPill>
                ) : (
                  <StatusPill>Chưa xác minh</StatusPill>
                )}
              </div>
              {r.description && (
                <p className="text-body-sm text-on-surface-variant italic line-clamp-2">
                  {r.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-on-surface-variant">
                {r.dietarySchool && (
                  <span className="rounded bg-primary-container/30 px-2 py-0.5 text-primary font-medium">
                    {dietarySchoolLabel(r.dietarySchool)}
                  </span>
                )}
                {r.cookTimeMinutes && <span>⏱️ Nấu: {r.cookTimeMinutes}p</span>}
                {r.prepTimeMinutes && <span>🔪 Chuẩn bị: {r.prepTimeMinutes}p</span>}
                {r.servings && <span>👥 {r.servings} phần</span>}
                {r.caloriesKcal && <span>🔥 {Math.round(r.caloriesKcal)} kcal</span>}
              </div>
            </div>
          </div>

          {/* 2. Tiêu chuẩn thẩm định chuẩn chay */}
          <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Tiêu chuẩn công thức chuẩn chay
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-2">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                  {r.cookTimeMinutes && r.ingredients.length > 0 && r.instructions.length >= 2 ? 'check_circle' : 'warning'}
                </span>
                <div>
                  <span className="font-semibold block text-on-surface">1. Định lượng &amp; thời gian:</span>
                  <span className="text-on-surface-variant text-[11px]">
                    {r.ingredients.length} nguyên liệu, {r.instructions.length} bước, {r.cookTimeMinutes ?? 0}p nấu
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-2">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                <div>
                  <span className="font-semibold block text-on-surface">2. Kiểm duyệt &amp; trường phái:</span>
                  <span className="text-on-surface-variant text-[11px]">
                    Đã duyệt nội dung, tuân thủ trường phái {dietarySchoolLabel(r.dietarySchool) || 'chay'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-2">
                <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${(r.voteCount ?? 0) >= 10 ? 'text-primary' : 'text-error'}`}>
                  {(r.voteCount ?? 0) >= 10 ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className="font-semibold block text-on-surface">3. Tương tác cộng đồng:</span>
                  <span className={`text-[11px] font-medium ${(r.voteCount ?? 0) >= 10 ? 'text-primary' : 'text-error'}`}>
                    {(r.voteCount ?? 0)}/10 lượt thả tim {(r.voteCount ?? 0) >= 10 ? '(Đạt)' : '(Chưa đạt ≥ 10 tim)'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-2">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                <div>
                  <span className="font-semibold block text-on-surface">4. Báo cáo vi phạm:</span>
                  <span className="text-on-surface-variant text-[11px]">Không có báo cáo chờ xử lý</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Danh sách nguyên liệu */}
          {r.ingredients && r.ingredients.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
              <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">nutrition</span>
                Nguyên liệu ({r.ingredients.length} mục)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {r.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center rounded-lg bg-surface-container-low px-2.5 py-1.5">
                    <span className="font-medium text-on-surface">{ing.name}</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      {ing.quantity > 0 ? `${ing.quantity} ` : ''}{ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Các bước chế biến */}
          {r.instructions && r.instructions.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container">
              <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
                Các bước chế biến ({r.instructions.length} bước)
              </span>
              <ol className="flex flex-col gap-1.5 text-xs text-on-surface leading-relaxed">
                {r.instructions.map((step, i) => (
                  <li key={i} className="rounded-lg bg-surface-container-low p-2.5">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 5. Nút thao tác dưới popup */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-container">
            <a
              href={`/recipes/${r.recipeId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-secondary hover:underline font-semibold"
            >
              <span>Mở trang công khai tab mới</span>
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {r.isVerified ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRevoke({
                      recipeId: r.recipeId,
                      title: r.title,
                      isVerified: true,
                    });
                  }}
                  className="rounded-xl bg-error/15 px-4 py-2 font-label-md text-label-md font-semibold text-error hover:bg-error/25 transition-colors cursor-pointer"
                >
                  Gỡ huy hiệu
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGrant({
                      recipeId: r.recipeId,
                      title: r.title,
                      isVerified: false,
                    });
                  }}
                  className="rounded-xl bg-primary px-4 py-2 font-label-md text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  Cấp huy hiệu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </FormModal>
  );
}
