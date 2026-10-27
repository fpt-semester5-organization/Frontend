import React from 'react';
import type { DetectedItem } from '../types/fridge.types';
import { isValidBox2D } from '../lib/cropImage';

interface BoundingBoxOverlayProps {
  items: DetectedItem[];
  hoveredIndex: number | null;
  onHoverItem: (index: number | null) => void;
  onClickItem?: (index: number) => void;
  showBoxes?: boolean;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  items,
  hoveredIndex,
  onHoverItem,
  onClickItem,
  showBoxes = true,
}) => {
  if (!showBoxes || !items || items.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      aria-label="Lớp phủ khung nhận diện nguyên liệu"
    >
      {items.map((item, idx) => {
        if (!item.box2d || !isValidBox2D(item.box2d)) return null;

        const [ymin, xmin, ymax, xmax] = item.box2d;
        const top = ymin / 10;
        const left = xmin / 10;
        const height = (ymax - ymin) / 10;
        const width = (xmax - xmin) / 10;

        const isHovered = hoveredIndex === idx;
        const isDimmed = hoveredIndex !== null && !isHovered;

        // Xác định màu sắc theo trạng thái an toàn / độ tươi
        const isWarning = item.isAnimalProduct || item.isRedMeat;
        const isFresh = item.freshnessStatus === 'FRESH';

        let borderColor = 'border-[#3d5c47]';
        let bgTint = 'bg-[#3d5c47]/15';
        let badgeBg = 'bg-[#3d5c47] text-white';

        if (isWarning) {
          borderColor = 'border-[#b42318]';
          bgTint = 'bg-[#b42318]/20';
          badgeBg = 'bg-[#b42318] text-white';
        } else if (!isFresh) {
          borderColor = 'border-[#94532f]';
          bgTint = 'bg-[#94532f]/20';
          badgeBg = 'bg-[#94532f] text-white';
        }

        return (
          <div
            key={`${item.name}-${idx}`}
            role="button"
            tabIndex={0}
            className={`pointer-events-auto absolute cursor-pointer rounded-sm border-2 transition-all duration-150 ${borderColor} ${bgTint} ${
              isHovered
                ? 'z-30 ring-2 ring-white ring-offset-1 shadow-lg scale-[1.01]'
                : isDimmed
                  ? 'opacity-35 z-10'
                  : 'opacity-85 z-20 hover:opacity-100'
            }`}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
            onClick={() => onClickItem?.(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClickItem?.(idx);
              }
            }}
            onMouseEnter={() => onHoverItem(idx)}
            onMouseLeave={() => onHoverItem(null)}
            onFocus={() => onHoverItem(idx)}
            onBlur={() => onHoverItem(null)}
            aria-label={`${item.name} (${item.freshnessStatus})`}
          >
            {/* Nhãn định danh nguyên liệu: nếu ở sát mép trên cùng thì hiển thị lọt vào trong hộp */}
            <div
              className={`absolute ${
                top < 6 ? 'top-0.5 left-0.5' : '-top-6 left-0'
              } flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-sm transition-opacity duration-150 ${badgeBg} ${
                isHovered ? 'opacity-100 scale-105 z-40' : 'opacity-90'
              }`}
            >
              <span>{item.name}</span>
              {item.quantity && (
                <span className="text-[10px] font-normal opacity-90">
                  ({item.quantity})
                </span>
              )}
              {item.confidence != null && (
                <span className="text-[10px] opacity-80">
                  {Math.round(item.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
