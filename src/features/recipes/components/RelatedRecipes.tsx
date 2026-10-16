import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PATHS } from '@/routes/paths';
import { useRelatedRecipes } from '../hooks/useRecipes';
import { RecipeCard, RecipeCardSkeleton } from './RecipeCard';

const GRID = 'grid grid-cols-1 gap-gutter-mobile sm:grid-cols-2 sm:gap-gutter lg:grid-cols-3';

/** "Món tương tự" (FN-POST-11): cùng trường phái, chung nguyên liệu chính, nhiều lượt thả tim. */
export const RelatedRecipes: React.FC<{ recipeId: number }> = ({ recipeId }) => {
  const related = useRelatedRecipes(recipeId);

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-space-md">
      <h2 id="related-title" className="font-headline-md text-headline-sm text-on-surface sm:text-headline-md">
        Món tương tự
      </h2>
      {related.isPending ? (
        <div className={GRID} role="status" aria-label="Đang tải món tương tự">
          <RecipeCardSkeleton count={3} />
        </div>
      ) : related.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-low p-space-md">
          <p className="font-body-md text-body-md text-on-surface-variant">Chưa tải được món tương tự.</p>
          <Button size="sm" variant="outline" onClick={() => related.refetch()} loading={related.isRefetching}>
            Thử lại
          </Button>
        </div>
      ) : related.data.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant">
          Chưa có món tương tự.{' '}
          <Link to={PATHS.RECIPES.ROOT} className="text-primary">
            Xem kho công thức
          </Link>
        </p>
      ) : (
        <div className={GRID}>
          {related.data.slice(0, 6).map((item) => (
            <RecipeCard key={item.recipeId} item={item} />
          ))}
        </div>
      )}
    </section>
  );
};
