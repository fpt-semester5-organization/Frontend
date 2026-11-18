import React, { useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { formatServerDateTime } from '@/lib/serverDate';
import { StatusBadge } from './AdminUi';
import { featureLabel, llmopsStatusLabel, ROLE_LABEL } from '../lib/labels';
import { formatUsd } from '../lib/llmops';
import type { LlmopsLogItem } from '../types/admin.types';

interface LlmopsLogDetailSheetProps {
  log: LlmopsLogItem | null;
  onClose: () => void;
}

/**
 * Modal hiển thị thông tin cốt lõi của một lượt truy vấn API AI (dành cho Admin / Báo cáo nghiệm thu).
 * Chỉ tập trung vào các trường dữ liệu thực tế từ Database: Người gọi, Tính năng, Thời gian, Token, Chi phí và Lỗi (nếu có).
 */
export const LlmopsLogDetailSheet: React.FC<LlmopsLogDetailSheetProps> = ({ log, onClose }) => {
  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (log) {
      window.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [log, onClose]);

  if (!log) return null;

  const statusInfo = llmopsStatusLabel(log.requestStatus);
  const estimatedVnd = Math.round(log.costEstimateUsd * 25400);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="llmops-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Dialog căn giữa màn hình (kích thước ~1/3 màn hình) */}
      <div
        role="document"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-surface-container bg-surface-container-lowest shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200"
      >
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between border-b border-surface-container bg-surface-container-low/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="smart_toy" className="text-[22px]" />
            </div>
            <div>
              <h2 id="llmops-dialog-title" className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Chi tiết lượt truy vấn API AI #{log.logId}
              </h2>
              <p className="font-body-xs text-on-surface-variant">
                {formatServerDateTime(log.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge tone={statusInfo.tone}>
              {statusInfo.label}
            </StatusBadge>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Người thực hiện & Tính năng */}
          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={log.userFullName || `User #${log.userId}`}
                  src={log.userAvatarUrl}
                  size="md"
                  className="ring-2 ring-surface-container"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-body-md font-semibold text-on-surface truncate">
                    {log.userFullName || `Người dùng #${log.userId}`}
                  </span>
                  <span className="font-body-xs text-on-surface-variant truncate">
                    {log.userEmail || 'Không có email'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 font-label-sm font-medium border',
                    log.userRole === 'VIP'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : log.userRole === 'ADMIN'
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-surface-container text-on-surface-variant border-surface-container-high'
                  )}
                >
                  {ROLE_LABEL[log.userRole] || log.userRole}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant">
                  ID: #{log.userId}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Tính năng gọi AI</span>
              <span className="font-semibold text-on-surface">{featureLabel(log.featureCode)}</span>
            </div>
          </div>

          {/* 3 Chỉ số tài nguyên cốt lõi */}
          <div className="grid grid-cols-3 gap-3">
            {/* Thời gian */}
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-3.5 flex flex-col justify-between">
              <span className="font-label-sm text-on-surface-variant">Thời gian xử lý</span>
              <div className="mt-2 font-mono text-headline-sm font-bold text-on-surface">
                {(log.executionTimeMs / 1000).toFixed(2)}
                <span className="text-body-xs font-normal text-on-surface-variant ml-1">s</span>
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant mt-1">
                {formatNumber(log.executionTimeMs)} ms
              </span>
            </div>

            {/* Tokens */}
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-3.5 flex flex-col justify-between">
              <span className="font-label-sm text-on-surface-variant">Token tiêu thụ</span>
              <div className="mt-2 font-mono text-headline-sm font-bold text-on-surface">
                {formatNumber(log.tokensConsumed)}
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1">
                tokens
              </span>
            </div>

            {/* Chi phí */}
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-3.5 flex flex-col justify-between">
              <span className="font-label-sm text-on-surface-variant">Chi phí ước tính</span>
              <div className="mt-2 font-mono text-headline-sm font-bold text-secondary">
                {formatUsd(log.costEstimateUsd)}
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant mt-1">
                ≈ {formatNumber(estimatedVnd)} đ
              </span>
            </div>
          </div>

          {/* Chi tiết lỗi nếu có */}
          {log.errorMessage && (
            <div className="rounded-xl border border-error/30 bg-error-container/20 p-4">
              <div className="flex items-center gap-2 text-error font-semibold font-label-md">
                <Icon name="error" className="text-[20px]" />
                <span>Thông báo lỗi</span>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-error/20 bg-surface-container-lowest p-3 font-mono text-[12px] text-error">
                {log.errorMessage}
              </pre>
            </div>
          )}
        </div>

        {/* --- FOOTER --- */}
        <div className="flex items-center justify-end border-t border-surface-container bg-surface-container-low/50 px-6 py-3.5">
          <Button type="button" variant="secondary" onClick={onClose} className="px-5">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
