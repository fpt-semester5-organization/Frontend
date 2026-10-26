/**
 * SCR-37 · admin/RecipeVerification · `/admin/recipe-verification`
 * FN-ADM-09: POST /admin/recipes/{id}/verify (cấp huy hiệu, note ≤ 500) · DELETE /admin/recipes/{id}/verify (gỡ).
 * Spec không có danh sách ứng viên riêng: dùng GET /recipes công khai (có isVerified, voteCount), tối đa 20/trang.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiErrorCode, apiErrorData, apiErrorMessage } from '@/api/http';
import { FormAlert } from '@/components/ui/forms';
import { AdminPage } from '../components/AdminPage';
import { TextArea } from '../components/fields';
import { FilterBar, ResetButton, SearchFilter } from '../components/Filters';
import { ConfirmDialog, FormActions, FormModal, ServerError } from '../components/FormModal';
import { Pager } from '../components/Pager';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useCategories, useRecipesForVerification, useUnverifyRecipe, useVerifyRecipe } from '../hooks/useCatalog';
import { useListState } from '../hooks/useListState';
import { formatFailedCriteria } from '../lib/criteria';
import { CRITERIA_HINT } from '../lib/labels';
import { verifyNoteSchema, type VerifyNoteForm } from '../schemas/admin.schemas';
import type { RecipeSummary } from '../types/admin.types';
import { SelectFilter } from '../components/Filters';

const VOTE_MIN = 10;

interface Filters extends Record<string, unknown> {
  keyword: string;
  categoryId?: string;
}

export function RecipeVerificationPage() {
  const { filters, page, setFilter, setPage, reset } = useListState<Filters>({ keyword: '' }, 10);
  const q = useRecipesForVerification({ keyword: filters.keyword || undefined, categoryId: filters.categoryId ? Number(filters.categoryId) : undefined, page, size: 10 });
  const cats = useCategories();
  const verify = useVerifyRecipe();
  const unverify = useUnverifyRecipe();
  const [grant, setGrant] = useState<RecipeSummary | null>(null);
  const [revoke, setRevoke] = useState<RecipeSummary | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const items = q.data?.items ?? [];

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
        <ResetButton onClick={reset} />
      </FilterBar>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} refetch={q.refetch} isEmpty={items.length === 0} emptyTitle="Không có công thức phù hợp" emptyHint="Thử đổi từ khóa hoặc danh mục.">
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
                {items.map((r) => (
                  <tr key={r.recipeId} className="hover:bg-surface-container-low/60">
                    <td className="px-space-lg py-space-md">
                      <Link to={`/recipes/${r.recipeId}`} className="font-semibold text-primary hover:underline">{r.title}</Link>
                      <div className="font-mono text-label-sm text-outline">#{r.recipeId}</div>
                    </td>
                    <td className="px-space-md py-space-md text-on-surface-variant">{r.dietarySchool ?? '—'}</td>
                    <td className="px-space-md py-space-md text-on-surface-variant">{r.cookTimeMinutes ? `${r.cookTimeMinutes} phút` : '—'}</td>
                    <td className="px-space-md py-space-md">
                      <span className={(r.voteCount ?? 0) >= VOTE_MIN ? 'font-semibold text-primary' : 'text-on-surface-variant'}>{r.voteCount ?? 0}</span>
                      <span className="text-outline"> / {VOTE_MIN}</span>
                    </td>
                    <td className="px-space-md py-space-md">{r.isVerified ? <StatusPill tone="ok">Chuẩn chay</StatusPill> : <StatusPill>Chưa xác minh</StatusPill>}</td>
                    <td className="px-space-lg py-space-md text-right">
                      {r.isVerified ? (
                        <button type="button" onClick={() => { unverify.reset(); setRevoke(r); }} className="rounded-xl bg-surface-container px-3 py-1.5 font-label-md text-label-md text-error hover:bg-surface-container-high">
                          Gỡ huy hiệu
                        </button>
                      ) : (
                        <button type="button" onClick={() => { verify.reset(); setFailed([]); setGrant(r); }} className="rounded-xl bg-primary-container px-3 py-1.5 font-label-md text-label-md text-on-primary hover:opacity-90">
                          Cấp huy hiệu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} onPage={setPage} fetching={q.isFetching} unit="công thức" />}
        </QueryState>
      </div>

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
    </AdminPage>
  );
}

function GrantForm({ recipe, pending, failed, error, eligibilityMessage, onCancel, onSubmit }: { recipe: RecipeSummary; pending: boolean; failed: string[]; error: string | null; eligibilityMessage: string | null; onCancel: () => void; onSubmit: (note: string) => void }) {
  const { register, handleSubmit, formState } = useForm<VerifyNoteForm>({ resolver: zodResolver(verifyNoteSchema), defaultValues: { note: '' } });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.note))} noValidate className="flex flex-col gap-space-md">
      <p className="font-body-md text-body-md text-on-surface-variant">“{recipe.title}” phải đủ 4 tiêu chí; hệ thống kiểm tra khi bạn xác nhận.</p>
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
