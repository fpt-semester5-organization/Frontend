import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import {
  AiParsedChip,
  CONTEXT_CATEGORIES,
  ContextCategory,
  QUICK_CONTEXT_SUGGESTIONS,
} from '../lib/aiContextParser';

interface AiContextChipsProps {
  chips: AiParsedChip[];
  onChipsChange: (chips: AiParsedChip[]) => void;
  isAnalyzing?: boolean;
  statusMessage?: string | null;
  onApply?: () => void;
  isApplying?: boolean;
  showApplyButton?: boolean;
  readOnly?: boolean;
  title?: string;
  className?: string;
}

export const AiContextChips: React.FC<AiContextChipsProps> = ({
  chips,
  onChipsChange,
  isAnalyzing = false,
  statusMessage,
  onApply,
  isApplying = false,
  showApplyButton = false,
  readOnly = false,
  title = 'Context AI đã hiểu',
  className,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newChipValue, setNewChipValue] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleDelete = (id: string) => {
    onChipsChange(chips.filter((c) => c.id !== id));
  };

  const handleStartEdit = (chip: AiParsedChip) => {
    if (readOnly) return;
    setEditingId(chip.id);
    setEditValue(chip.label);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      onChipsChange(
        chips.map((c) => (c.id === editingId ? { ...c, label: trimmed } : c))
      );
    } else {
      handleDelete(editingId);
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleAddCustomChip = () => {
    const val = newChipValue.trim();
    if (val) {
      const newChip: AiParsedChip = {
        id: `chip_custom_${Date.now()}`,
        category: 'other',
        label: val,
        icon: CONTEXT_CATEGORIES.other.icon,
      };
      onChipsChange([...chips, newChip]);
      setNewChipValue('');
      setIsAdding(false);
    }
  };

  const handleAddSuggestion = (suggestion: { label: string; category: ContextCategory }) => {
    const exists = chips.some(
      (c) => c.label.toLowerCase() === suggestion.label.toLowerCase()
    );
    if (!exists) {
      const newChip: AiParsedChip = {
        id: `chip_sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: suggestion.category,
        label: suggestion.label,
        icon: CONTEXT_CATEGORIES[suggestion.category].icon,
      };
      onChipsChange([...chips, newChip]);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-surface-container bg-surface-container-low p-4 sm:p-5 shadow-card transition-all',
        className
      )}
    >
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-xs">
            <Icon name="auto_awesome" className="text-[16px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline-sm font-serif text-headline-sm text-on-surface">
                {title}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-xs font-semibold bg-primary-fixed text-on-primary-fixed">
                {chips.length} tiêu chí
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {readOnly
                ? 'Các tiêu chí đã được hệ thống áp dụng khi khởi tạo thực đơn'
                : 'Kiểm tra, xóa hoặc bấm để sửa từng tiêu chí trước khi hệ thống lập thực đơn'}
            </p>
          </div>
        </div>

        {/* Action Button: Áp dụng lưu ý (khi hiển thị trên thực đơn đã tạo) */}
        {showApplyButton && onApply && (
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying || isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-label-md text-xs bg-primary-container text-on-primary shadow-xs hover:bg-primary active:scale-95 transition-all disabled:opacity-50"
          >
            <Icon
              name={isApplying ? 'refresh' : 'check'}
              className={cn('text-[14px]', isApplying && 'animate-spin')}
            />
            {isApplying ? 'Đang áp dụng...' : 'Áp dụng lưu ý'}
          </button>
        )}
      </div>

      {/* Status banner nếu đang phân tích */}
      {(isAnalyzing || statusMessage) && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary-fixed/60 px-3 py-1.5 text-xs text-on-primary-fixed animate-fadeIn">
          <Icon
            name={isAnalyzing ? 'sync' : 'info'}
            className={cn('text-[14px]', isAnalyzing && 'animate-spin text-primary')}
          />
          <span>{statusMessage || (isAnalyzing ? 'AI đang tổng hợp ngữ cảnh có cấu trúc...' : '')}</span>
        </div>
      )}

      {/* Danh sách các Chips */}
      {chips.length === 0 ? (
        <div className="p-3.5 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {readOnly
              ? 'Thực đơn được tạo theo chế độ dinh dưỡng tiêu chuẩn, không có lưu ý ngữ cảnh riêng lúc khởi tạo.'
              : 'Chưa có tiêu chí nào. Nhập lưu ý ở ô bên trên hoặc chọn nhanh các gợi ý bên dưới để AI tự động hiểu context!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => {
            const meta = CONTEXT_CATEGORIES[chip.category] || CONTEXT_CATEGORIES.other;
            const isEditing = editingId === chip.id;

            if (isEditing) {
              return (
                <div
                  key={chip.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary bg-surface-container-lowest px-2.5 py-1 shadow-xs"
                >
                  <input
                    type="text"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDownEdit}
                    className="w-36 font-body-sm text-xs bg-transparent border-none outline-hidden text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="text-primary hover:text-primary-container"
                    title="Lưu"
                  >
                    <Icon name="check" className="text-[14px]" />
                  </button>
                </div>
              );
            }

            return (
              <span
                key={chip.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-label-sm text-xs font-medium shadow-2xs transition-all group',
                  meta.badgeClass,
                  !readOnly && 'hover:shadow-xs'
                )}
              >
                <Icon name={meta.icon} className="text-[13px] opacity-80" />
                <button
                  type="button"
                  onClick={() => handleStartEdit(chip)}
                  disabled={readOnly}
                  className={cn(
                    'text-left transition-colors',
                    !readOnly && 'hover:underline cursor-text'
                  )}
                  title={!readOnly ? 'Bấm để sửa tiêu chí này' : undefined}
                >
                  {chip.label}
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(chip.id)}
                    className="ml-0.5 rounded-full p-0.5 text-current opacity-60 hover:opacity-100 hover:bg-black/10 transition-opacity"
                    title="Xóa tiêu chí này"
                  >
                    <Icon name="close" className="text-[12px]" />
                  </button>
                )}
              </span>
            );
          })}

          {/* Nút thêm tiêu chí tuỳ ý */}
          {!readOnly && (
            <>
              {isAdding ? (
                <div className="inline-flex items-center gap-1 rounded-lg border border-primary bg-surface-container-lowest px-2 py-1 shadow-xs">
                  <input
                    type="text"
                    placeholder="Nhập tiêu chí mới..."
                    value={newChipValue}
                    autoFocus
                    onChange={(e) => setNewChipValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomChip();
                      } else if (e.key === 'Escape') {
                        setIsAdding(false);
                        setNewChipValue('');
                      }
                    }}
                    className="w-32 font-body-sm text-xs bg-transparent border-none outline-hidden text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomChip}
                    className="text-primary hover:text-primary-container px-1"
                    title="Thêm"
                  >
                    <Icon name="check" className="text-[13px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-on-surface-variant hover:text-on-surface"
                    title="Hủy"
                  >
                    <Icon name="close" className="text-[13px]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-2.5 py-1 font-label-sm text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                >
                  <Icon name="add" className="text-[13px]" />
                  <span>Thêm tiêu chí</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Gợi ý nhanh */}
      {!readOnly && (
        <div className="mt-3.5 pt-3 border-t border-surface-container">
          <div className="flex items-center gap-1.5 font-label-sm text-[11px] text-on-surface-variant mb-1.5">
            <Icon name="tips_and_updates" className="text-[13px] text-secondary" />
            <span>Gợi ý thêm nhanh:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_CONTEXT_SUGGESTIONS.map((sug) => {
              const alreadyHas = chips.some(
                (c) => c.label.toLowerCase() === sug.label.toLowerCase()
              );
              if (alreadyHas) return null;
              return (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => handleAddSuggestion(sug)}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed px-2 py-0.5 font-label-sm text-[11px] text-on-surface-variant transition-all border border-surface-container-high"
                >
                  <span>+</span>
                  <span>{sug.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
