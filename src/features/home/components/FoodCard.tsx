import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { FoodDish } from '../data/mockFoodsData';
import { getFallbackFoodImage } from '@/lib/foodImages';

export interface FoodCardProps {
  dish: FoodDish;
  className?: string;
  onSelect?: (dish: FoodDish) => void;
}

/** Thẻ món ăn đồng bộ với chuẩn thiết kế VeggieLife, dẫn thẳng sang giao diện đầy đủ /recipes?food= */
export const FoodCard: React.FC<FoodCardProps> = ({ dish, className, onSelect }) => {
  const navigate = useNavigate();
  const fallbackImg = React.useMemo(
    () => getFallbackFoodImage(null, dish.foodName, dish.categoryName),
    [dish.foodName, dish.categoryName]
  );
  const [imgSrc, setImgSrc] = React.useState<string>(dish.imageUrl || fallbackImg);
  const [hasFallbackFailed, setHasFallbackFailed] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(dish.imageUrl || fallbackImg);
    setHasFallbackFailed(false);
  }, [dish.imageUrl, fallbackImg]);

  const handleImageError = () => {
    if (imgSrc !== fallbackImg) {
      setImgSrc(fallbackImg);
    } else {
      setHasFallbackFailed(true);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(dish);
    }
    navigate(`/recipes?food=${dish.foodId}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-feed cursor-pointer',
        className
      )}
    >
      {/* Ảnh món ăn chất lượng cao tỉ lệ 4:3 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
        {!hasFallbackFailed ? (
          <img referrerPolicy="no-referrer"
            src={imgSrc}
            alt={dish.foodName}
            width={480}
            height={360}
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60 p-4">
            <div className="flex flex-col items-center gap-1.5 text-primary">
              <Icon name="restaurant" className="text-[40px]" />
            </div>
          </div>
        )}

        {/* Badge danh mục góc trái */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-label-sm text-label-sm text-on-secondary shadow-sm font-medium">
            {dish.categoryName}
          </span>
        </div>

        {/* Số lượng công thức có sẵn góc phải */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-primary shadow-sm">
            <Icon name="menu_book" className="text-[14px]" />
            {dish.totalRecipes > 0 ? `${dish.totalRecipes} công thức` : 'Đang cập nhật'}
          </span>
        </div>
      </div>

      {/* Nội dung thông tin món ăn */}
      <div className="flex flex-1 flex-col justify-between p-space-md">
        <div className="flex flex-col gap-2">
          {/* Tên món ăn chuẩn typography */}
          <h3 className="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">
            {dish.foodName}
          </h3>

          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
            {dish.description}
          </p>


        </div>

        {/* Nút hành động dẫn trực tiếp sang giao diện to đầy đủ của Web (/recipes?food=...) */}
        <div className="mt-4 flex items-center justify-between border-t border-outline-variant/40 pt-3">
          <Link
            to={`/recipes?food=${dish.foodId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-label-md text-label-md font-semibold text-primary group-hover:underline flex items-center gap-1.5"
          >
            <span>Xem các công thức</span>
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-on-primary shadow-xs">
            <Icon name="arrow_forward" className="text-[16px]" />
          </span>
        </div>
      </div>
    </article>
  );
};
