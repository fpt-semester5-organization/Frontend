import React, { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime } from '@/lib/format';
import { StatusPill } from './StatusPill';
import { ROLE_LABEL } from '../lib/labels';
import type { AuditLog } from '../types/admin.types';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
  actionMeta: {
    label: string;
    severity: 'critical' | 'warning' | 'info';
    severityLabel: string;
    icon: string;
    tone: 'error' | 'warning' | 'info' | 'success' | 'neutral';
  };
  targetLabel: string;
  cleanedNote: string;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  onClose,
  actionMeta,
  targetLabel,
  cleanedNote,
}) => {
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

  const formatJson = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  const formattedOld = formatJson(log.oldValue);
  const formattedNew = formatJson(log.newValue);
  const hasDiff = Boolean(formattedOld || formattedNew);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="document"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-surface-container bg-surface-container-lowest shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container bg-surface-container-low/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                actionMeta.severity === 'critical'
                  ? 'bg-error-container text-error'
                  : actionMeta.severity === 'warning'
                    ? 'bg-warning-container text-warning'
                    : 'bg-primary-container text-primary'
              }`}
            >
              <Icon name={actionMeta.icon} className="text-[24px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="audit-detail-title" className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {actionMeta.label}
                </h2>
                <StatusPill tone={actionMeta.tone}>{actionMeta.severityLabel}</StatusPill>
              </div>
              <p className="font-mono text-body-xs text-on-surface-variant">
                Mã bản ghi: #{log.auditId} · {formatDateTime(log.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Thông tin cốt lõi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-3.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Tác nhân thực hiện</span>
              <div className="mt-1 flex items-center gap-2">
                <Icon name={log.actorRole === 'SYSTEM' ? 'smart_toy' : 'person'} className="text-[20px] text-primary" />
                <span className="font-semibold text-on-surface">
                  {log.actorUserId ? `Tài khoản #${log.actorUserId}` : 'Hệ thống tự động'}
                </span>
                {log.actorRole && (
                  <StatusPill tone={log.actorRole === 'SYSTEM' ? 'neutral' : 'ok'}>
                    {ROLE_LABEL[log.actorRole] ?? log.actorRole}
                  </StatusPill>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-3.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Đối tượng tác động</span>
              <div className="mt-1 flex items-center gap-2 font-mono text-on-surface">
                <Icon name="dns" className="text-[18px] text-outline" />
                <span className="font-semibold">{targetLabel}</span>
              </div>
            </div>
          </div>

          {/* Ghi chú nghiệp vụ */}
          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-4">
            <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
              Ghi chú nghiệp vụ & Mô tả thao tác
            </span>
            <p className="mt-1 font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
              {cleanedNote || 'Không có ghi chú bổ sung cho bản ghi này.'}
            </p>
            <div className="mt-2 text-xs font-mono text-outline">
              Mã kỹ thuật (Action Enum): <span className="font-semibold text-on-surface">{log.action}</span>
            </div>
          </div>

          {/* Dữ liệu thay đổi (Old Value vs New Value Diff) */}
          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                <Icon name="compare_arrows" className="text-[18px]" />
                Thay đổi dữ liệu (Data Changes)
              </span>
              <span className="font-label-xs text-label-xs text-outline">
                {hasDiff ? 'Dữ liệu trước và sau thao tác' : 'Không có thay đổi dữ liệu bảng'}
              </span>
            </div>

            {hasDiff ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-container-low p-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-outline/10 text-xs font-medium text-error">
                    <span>Trước thay đổi (Old Value)</span>
                  </div>
                  <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-on-surface-variant">
                    {formattedOld || '<Không có dữ liệu cũ>'}
                  </pre>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-outline/10 text-xs font-medium text-success">
                    <span>Sau thay đổi (New Value)</span>
                  </div>
                  <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-on-surface">
                    {formattedNew || '<Không có dữ liệu mới>'}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-body-sm text-outline italic">
                Bản ghi này ghi nhận sự kiện hệ thống hoặc đăng nhập/truy cập, không làm thay đổi trực tiếp trường dữ liệu nào.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-surface-container bg-surface-container-low/50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
