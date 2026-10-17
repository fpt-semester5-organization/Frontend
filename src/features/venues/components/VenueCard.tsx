import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { formatDistance } from '../lib/geo';
import type { NearbyVenue } from '../types/venues.types';

const ACTION =
  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-label-md text-label-md no-underline transition-colors';

interface VenueCardProps {
  venue: NearbyVenue;
  isSelected?: boolean;
  onSelect?: (venue: NearbyVenue) => void;
}

/** Thẻ quán trong danh sách kết quả (FN-MAP-01): ảnh, tên, địa chỉ, khoảng cách, điểm, loại quán, danh mục. */
export const VenueCard: React.FC<VenueCardProps> = ({ venue, isSelected, onSelect }) => {
  const distance = formatDistance(venue.distanceKm);
  const ratingNum = Number(venue.rating);
  const hasRating = venue.rating !== undefined && venue.rating !== null && !isNaN(ratingNum) && ratingNum > 0;

  return (
    <article
      onClick={() => onSelect?.(venue)}
      className={cn(
        'flex gap-space-md rounded-xl border p-space-md shadow-card transition-all cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-md'
          : 'border-surface-container bg-surface-container-lowest hover:border-outline-variant hover:shadow-md'
      )}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-primary-fixed to-secondary-fixed sm:h-24 sm:w-24">
        {venue.thumbnailUrl ? (
          <img src={venue.thumbnailUrl} alt={venue.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-primary">
            <Icon name="storefront" className="text-[32px]" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-label-lg text-label-lg break-words text-on-surface">{venue.name}</h3>
        <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">{venue.address}</p>

        <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1 font-label-sm text-label-sm text-on-surface-variant">
          {distance && (
            <span className="inline-flex items-center gap-0.5">
              <Icon name="near_me" className="text-[14px]" />
              {distance}
            </span>
          )}
          {hasRating && (
            <span className="inline-flex items-center gap-0.5" aria-label={`Đánh giá ${formatNumber(ratingNum)} trên 5`}>
              <Icon name="star" filled className="text-[14px] text-secondary" />
              {formatNumber(ratingNum)}
            </span>
          )}
          <span
            className={cn(
              'rounded-full px-2 py-0.5',
              venue.isFullyVegan ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
            )}
          >
            {venue.isFullyVegan ? 'Thuần chay' : 'Có món chay'}
          </span>
        </div>

        {venue.categories && venue.categories.length > 0 && (
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{venue.categories.join(' · ')}</p>
        )}

        <div className="mt-1 flex flex-wrap gap-space-xs" onClick={(e) => e.stopPropagation()}>
          <a
            href={venue.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${ACTION} bg-primary-container text-on-primary hover:bg-primary`}
          >
            <Icon name="directions" className="text-[16px]" />
            Chỉ đường
          </a>
          <Link
            to={PATHS.VENUES.DETAIL(venue.venueId)}
            className={`${ACTION} bg-surface-container text-on-surface hover:bg-surface-container-high`}
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
};

export const VenueListSkeleton: React.FC = () => (
  <div role="status" aria-busy="true" aria-label="Đang tìm quán" className="flex flex-col gap-space-sm">
    {[0, 1, 2].map((key) => (
      <div key={key} className="flex gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-card">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-surface-container sm:h-24 sm:w-24" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    ))}
  </div>
);
