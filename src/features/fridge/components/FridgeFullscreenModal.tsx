import React, { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { DetectedItem } from '../types/fridge.types';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { FreshnessBadge } from './FreshnessBadge';

interface FridgeFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  items: DetectedItem[];
  hoveredIndex: number | null;
  onHoverItem: (index: number | null) => void;
  showBoxes: boolean;
  onToggleShowBoxes: () => void;
}

export const FridgeFullscreenModal: React.FC<FridgeFullscreenModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  items,
  hoveredIndex,
  onHoverItem,
  showBoxes,
  onToggleShowBoxes,
}) => {
  // Lắng nghe phím ESC để đóng modal và khoá cuộn body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeItem = hoveredIndex !== null && items[hoveredIndex] ? items[hoveredIndex] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem toàn màn hình ảnh tủ lạnh và khung nhận diện"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-slate-100 backdrop-blur-md"
    >
      {/* Thanh tiêu đề & Công cụ trên cùng */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Icon name="crop_free" className="text-[22px]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">
              Chi Tiết Khung Nhận Diện AI
            </h2>
            <p className="text-xs text-slate-400">
              Phát hiện {items.length} nguyên liệu · Bấm hoặc rê chuột vào khung để xem chi tiết
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.some((it) => it.box2d) && (
            <button
              type="button"
              onClick={onToggleShowBoxes}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              title={showBoxes ? 'Ẩn khung nhận diện trên ảnh' : 'Hiện khung nhận diện trên ảnh'}
            >
              <Icon
                name={showBoxes ? 'visibility_off' : 'visibility'}
                className="text-[16px] text-emerald-400"
              />
              <span className="hidden sm:inline">{showBoxes ? 'Ẩn khung' : 'Hiện khung'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 hover:text-red-400"
            title="Đóng chế độ xem (Phím Esc)"
            aria-label="Đóng"
          >
            <Icon name="close" className="text-[18px]" />
            <span className="hidden sm:inline">Đóng (Esc)</span>
          </button>
        </div>
      </header>

      {/* Vùng hiển thị ảnh phóng to toàn màn hình */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
        <div className="relative inline-flex max-h-full max-w-full items-center justify-center">
          <img
            src={imageUrl}
            alt="Ảnh tủ lạnh toàn màn hình"
            className="max-h-[70vh] max-w-[94vw] rounded-xl object-contain shadow-2xl ring-1 ring-white/10"
          />
          <BoundingBoxOverlay
            items={items}
            hoveredIndex={hoveredIndex}
            onHoverItem={onHoverItem}
            showBoxes={showBoxes}
          />
        </div>

        {/* Floating Tooltip khi đang focus/hover vào 1 nguyên liệu */}
        {activeItem && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-white/20 bg-slate-900/90 px-4 py-2 text-center shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{activeItem.name}</span>
              <FreshnessBadge status={activeItem.freshnessStatus} size="sm" />
              {(activeItem.isAnimalProduct || activeItem.isRedMeat) && (
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-red-300">
                  ⚠️ Cảnh báo mặn
                </span>
              )}
              {activeItem.confidence != null && (
                <span className="text-xs text-slate-400">
                  Độ tin cậy: {Math.round(activeItem.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Thanh trượt nguyên liệu thu nhỏ phía dưới để chọn nhanh */}
      {items.length > 0 && (
        <footer className="shrink-0 border-t border-white/10 bg-slate-900/70 p-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-full items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {items.map((item, idx) => {
              const isSelected = hoveredIndex === idx;
              return (
                <button
                  key={`${item.name}-${idx}`}
                  type="button"
                  aria-label={`Chọn ${item.name}`}
                  onClick={() => onHoverItem(isSelected ? null : idx)}
                  onMouseEnter={() => onHoverItem(idx)}
                  className={`group flex shrink-0 items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400 shadow-md'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
                      <Icon name="eco" className="text-[20px]" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-300">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.freshnessStatus === 'FRESH' ? 'Tươi ngon' : 'Sắp hỏng'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
};
