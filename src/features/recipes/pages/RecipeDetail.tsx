/**
 * SCR-12 · recipes/RecipeDetail · `/recipes/:id`
 * FN: FN-POST-02, FN-POST-11, FN-COMM-01 · Huỳnh Việt Phát · Sprint 5
 * Chi tiết công thức hiển thị đầy đủ cho cả Khách; thả tim, bình luận, báo cáo dùng chung với Cộng đồng (FN-COMM-01..05).
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { dietarySchoolLabel } from '@/constants/dietarySchools';
import { CommentSection } from '@/features/community/components/CommentSection';
import { ReportDialog } from '@/features/community/components/ReportDialog';
import { VoteButton } from '@/features/community/components/VoteButton';
import type { ContentRef } from '@/features/community/types/community.types';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { RelatedRecipes } from '../components/RelatedRecipes';
import { useRecipe } from '../hooks/useRecipes';
import type { RecipeDetail as RecipeDetailData } from '../types/recipe.types';

const PAGE = 'mx-auto flex w-full max-w-[1100px] flex-col gap-space-xl px-margin-mobile py-space-lg sm:px-margin';
const CARD = 'rounded-2xl bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl';
const ACTION =
  'inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md text-on-surface no-underline transition-all hover:bg-surface-container';

const NotFound: React.FC = () => (
  <EmptyState
    icon="search_off"
    title="Không tìm thấy công thức"
    description="Công thức không tồn tại, đã bị gỡ hoặc đang chờ kiểm duyệt."
    action={
      <Link
        to={PATHS.RECIPES.ROOT}
        className="inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
      >
        Về kho công thức
      </Link>
    }
  />
);

const Fact: React.FC<{ icon: string; label: string; value: string | null }> = ({ icon, label, value }) => (
  <div className="flex flex-col gap-0.5 rounded-xl bg-surface-container-low p-space-sm">
    <dt className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
      <Icon name={icon} className="text-[16px]" />
      {label}
    </dt>
    <dd className="font-headline-sm text-headline-sm text-on-surface tabular-nums">{value ?? '—'}</dd>
  </div>
);

const formatQuantity = (line: RecipeDetailData['ingredients'][number]) =>
  [Number.isFinite(line.quantity) && line.quantity > 0 ? formatNumber(line.quantity) : null, line.unit].filter(Boolean).join(' ');

const RecipeDetail: React.FC = () => {
  const { id } = useParams();
  const recipeId = Number(id);
  const validId = Number.isInteger(recipeId) && recipeId > 0;
  const navigate = useNavigate();
  const { isMember, requireMember } = useRequireMember();
  const recipe = useRecipe(recipeId);
  const target = useMemo<ContentRef>(() => ({ resource: 'recipes', id: recipeId }), [recipeId]);
  const [reportOpen, setReportOpen] = useState(false);

  if (!validId) return <NotFound />;

  if (recipe.isPending) {
    return (
      <div className={PAGE} role="status" aria-label="Đang tải công thức">
        <Skeleton className="h-5 w-64 max-w-full" />
        <div className="grid gap-space-lg lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <div className="flex flex-col gap-space-md">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-20" />
            <Skeleton className="h-28" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (recipe.isError) {
    if (toApiError(recipe.error).status === 404) return <NotFound />;
    return <ErrorState error={recipe.error} onRetry={() => recipe.refetch()} retrying={recipe.isRefetching} />;
  }

  const data = recipe.data;
  const school = dietarySchoolLabel(data.dietarySchool);
  const kcal = Number.isFinite(data.caloriesKcal) && data.caloriesKcal > 0 ? `${formatNumber(Math.round(data.caloriesKcal))} kcal` : null;
  const minutes = (value: number | null) => (value !== null && value >= 0 ? `${value} phút` : null);
  const canReport = !isMember || data.memberActions.canReport;

  return (
    <div className={PAGE}>
      {/* Luôn một dòng (tên món dài thì cắt bớt) để đổi font không làm khối bên dưới nhảy (CLS). */}
      <nav aria-label="Đường dẫn" className="flex items-center gap-space-xs font-label-md text-label-md whitespace-nowrap text-on-surface-variant">
        <Link to={PATHS.HOME} className="shrink-0 text-on-surface-variant no-underline hover:text-primary">
          Trang chủ
        </Link>
        <span className="text-outline-variant">/</span>
        <Link to={PATHS.RECIPES.ROOT} className="shrink-0 text-on-surface-variant no-underline hover:text-primary">
          Kho công thức
        </Link>
        <span className="text-outline-variant">/</span>
        <span aria-current="page" className="min-w-0 truncate text-primary">
          {data.title}
        </span>
      </nav>

      <article className="flex flex-col gap-space-xl">
        <header className="grid items-start gap-space-lg lg:grid-cols-2 lg:gap-space-xl">
          <figure className="relative overflow-hidden rounded-2xl bg-surface-container">
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={`Món ${data.title}`}
                width={960}
                height={720}
                // Ảnh món là phần tử lớn nhất màn đầu (LCP) nên tải ngay.
                {...{ fetchpriority: 'high' }}
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60">
                <Icon name="restaurant" className="text-[56px] text-on-primary-fixed-variant" />
              </div>
            )}
          </figure>

          <div className="flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center gap-2">
              {school && (
                <span className="rounded-full bg-secondary px-2.5 py-1 font-label-sm text-label-sm text-on-secondary">{school}</span>
              )}
              {data.isVerified && (
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary">
                  <Icon name="verified" filled className="text-[16px]" />
                  Công thức chay chuẩn
                </span>
              )}
              {data.type === 'VIDEO' && (
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary">
                  <Icon name="smart_display" className="text-[16px]" />
                  Có video hướng dẫn
                </span>
              )}
            </div>

            <h1 className="font-headline-lg text-headline-lg-mobile break-words text-on-surface sm:text-headline-lg">{data.title}</h1>
            {data.description && (
              <p className="font-body-lg text-body-lg leading-relaxed whitespace-pre-line text-on-surface-variant">
                {data.description}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-space-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <Fact icon="timer" label="Chuẩn bị" value={minutes(data.prepTimeMinutes)} />
              <Fact icon="skillet" label="Nấu" value={minutes(data.cookTimeMinutes)} />
              <Fact icon="group" label="Khẩu phần" value={data.servings ? `${data.servings} người` : null} />
              <Fact icon="local_fire_department" label="Năng lượng" value={kcal} />
            </dl>

            <div className="flex flex-wrap items-center gap-space-sm">
              <VoteButton target={target} voteCount={data.voteCount} canVote={data.memberActions.canVote} />
              <a href="#comments" className={ACTION}>
                <Icon name="chat_bubble_outline" className="text-[20px] text-on-surface-variant" />
                {formatNumber(data.commentCount)} bình luận
              </a>
              {canReport && (
                <button
                  type="button"
                  onClick={() => requireMember(() => setReportOpen(true))}
                  aria-label="Báo cáo công thức"
                  className={`${ACTION} text-on-surface-variant hover:text-secondary`}
                >
                  <Icon name="flag" className="text-[20px]" />
                  Báo cáo
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="grid items-start gap-space-lg lg:grid-cols-12">
          <section aria-labelledby="ingredients-title" className={`${CARD} lg:sticky lg:top-24 lg:col-span-5`}>
            <h2 id="ingredients-title" className="flex items-center justify-between gap-2 font-headline-sm text-headline-sm text-on-surface">
              Nguyên liệu
              <span className="font-label-md text-label-md text-on-surface-variant">
                {data.servings ? `Cho ${data.servings} người` : `${data.ingredients.length} loại`}
              </span>
            </h2>
            {data.ingredients.length === 0 ? (
              <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Công thức chưa có danh sách nguyên liệu.</p>
            ) : (
              <ul className="mt-space-md flex flex-col divide-y divide-surface-container">
                {data.ingredients.map((line, index) => (
                  <li key={`${line.ingredientId}-${index}`} className="flex items-baseline justify-between gap-space-md py-2.5">
                    <span className="font-body-md text-body-md text-on-surface">{line.name}</span>
                    <span className="shrink-0 font-label-md text-label-md text-on-surface tabular-nums">{formatQuantity(line)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="steps-title" className={`${CARD} lg:col-span-7`}>
            <h2 id="steps-title" className="flex items-center justify-between gap-2 font-headline-sm text-headline-sm text-on-surface">
              Cách làm
              <span className="font-label-md text-label-md text-on-surface-variant">{data.instructions.length} bước</span>
            </h2>
            {data.instructions.length === 0 ? (
              <p className="mt-space-md font-body-md text-body-md text-on-surface-variant">Công thức chưa có các bước thực hiện.</p>
            ) : (
              <ol className="mt-space-md flex flex-col gap-space-md">
                {data.instructions.map((step, index) => (
                  <li key={index} className="flex gap-space-md">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-label-md text-label-md text-on-primary"
                    >
                      {index + 1}
                    </span>
                    <p className="pt-1 font-body-md text-body-md leading-relaxed break-words whitespace-pre-line text-on-surface">
                      <span className="sr-only">Bước {index + 1}: </span>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </article>

      <RelatedRecipes recipeId={recipeId} />

      {/* UNSPECIFIED: GET /recipes/{id} không trả tác giả nên chưa gắn nhãn "Tác giả" cho bình luận của người đăng. */}
      <CommentSection target={target} authorId={null} commentCount={data.commentCount} canComment={data.memberActions.canComment} />

      <ReportDialog
        show={reportOpen}
        content={target}
        target={{ type: 'RECIPE', id: recipeId }}
        onClose={() => setReportOpen(false)}
        onReported={() => navigate(PATHS.RECIPES.ROOT, { replace: true })}
      />
    </div>
  );
};

export default RecipeDetail;
