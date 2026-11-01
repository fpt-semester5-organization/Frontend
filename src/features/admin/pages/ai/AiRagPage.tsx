import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { notifySuccess } from '@/lib/notify';
import { formatServerDateTime } from '@/lib/serverDate';
import { AdminQueryError, CARD, CONTROL, ServerMessageDialog, StatRow } from '../../components/AdminUi';
import { useKnowledgeStatus, useReindexKnowledge } from '../../hooks/useAdminAi';
import { KNOWLEDGE_SCOPE_LABEL, KNOWLEDGE_SOURCE_LABEL } from '../../lib/labels';
import { handleWriteError } from '../../lib/writeError';
import type { KnowledgeScope, KnowledgeSource } from '../../types/admin.types';

/**
 * Trang Quản trị Kho tri thức Chatbot RAG (Qdrant · `/admin/ai/rag`).
 * Theo dõi trạng thái Vector Database, số điểm tri thức theo nguồn và kích hoạt đồng bộ lại.
 */
export const AiRagPage: React.FC = () => {
  const status = useKnowledgeStatus();
  const reindex = useReindexKnowledge();
  const [scope, setScope] = useState<KnowledgeScope>('ALL');
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const run = () =>
    reindex.mutate(scope, {
      onSuccess: (res) => {
        notifySuccess(res.message || 'Đã xếp job đồng bộ kho tri thức.');
        setJobId(res.data?.jobId ?? null);
        setConfirming(false);
      },
      onError: (error) => {
        setConfirming(false);
        handleWriteError(error, { onConflict: setConflict });
      },
    });

  const sources = Object.entries(status.data?.bySource ?? {}) as [KnowledgeSource, number][];

  return (
    <div className="flex flex-col gap-space-lg">
      <div className={cn(CARD, 'grid gap-space-lg p-space-md sm:p-space-lg lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-container">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Kho tri thức Chatbot (Qdrant Vector DB)
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Lưu trữ các vector embedding phục vụ truy xuất thông tin tăng cường (RAG) cho Trợ lý Dinh dưỡng.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
              <Icon name="database" className="text-[24px]" />
            </div>
          </div>

          {status.isPending ? (
            <div aria-busy="true" aria-label="Đang tải trạng thái kho tri thức" className="h-48 animate-pulse rounded-xl bg-surface-container" />
          ) : status.isError && !status.data ? (
            <AdminQueryError error={status.error} onRetry={() => void status.refetch()} retrying={status.isRefetching} />
          ) : (
            <div className="flex flex-col gap-space-md">
              <dl className="grid gap-x-space-lg font-body-sm text-body-sm sm:grid-cols-2">
                <StatRow label="Bộ sưu tập (Collection)">{status.data.collection || '–'}</StatRow>
                <StatRow label="Tổng số điểm (Vector Points)">{formatNumber(status.data.totalPoints)}</StatRow>
                <StatRow label="Đồng bộ gần nhất">{formatServerDateTime(status.data.lastIndexedAt) || 'Chưa đồng bộ'}</StatRow>
                <StatRow label="Đang chờ / Lỗi">
                  <span className={cn(status.data.failed > 0 && 'text-error font-semibold')}>
                    {formatNumber(status.data.pending)} / {formatNumber(status.data.failed)}
                  </span>
                </StatRow>
              </dl>

              {status.data.failed > 0 && (
                <FormAlert tone="warning">
                  {formatNumber(status.data.failed)} mục đồng bộ lỗi: hãy thử chọn đúng nguồn bị lỗi ở bảng bên cạnh và bấm "Đồng bộ lại".
                </FormAlert>
              )}

              <div className="mt-2">
                <h3 className="font-label-md text-label-md text-on-surface mb-2">Phân bổ Vector theo nguồn tri thức:</h3>
                {sources.length === 0 ? (
                  <EmptyState
                    icon="database"
                    title="Kho tri thức đang trống"
                    description="Chạy đồng bộ toàn bộ để nạp sách dinh dưỡng, công thức món chay, bài viết và từ điển vào chatbot."
                  />
                ) : (
                  <ul className="grid gap-x-space-lg gap-y-1 font-body-sm text-body-sm sm:grid-cols-2" aria-label="Số điểm theo nguồn">
                    {sources.map(([source, count]) => (
                      <li key={source} className="flex justify-between gap-2 border-b border-surface-container py-2">
                        <span className="flex items-center gap-1.5 text-on-surface-variant">
                          <Icon name="bookmark" className="text-[16px] text-primary" />
                          {KNOWLEDGE_SOURCE_LABEL[source] ?? 'Nguồn khác'}
                        </span>
                        <span className="font-medium tabular-nums text-on-surface">{formatNumber(count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Form Kích hoạt Đồng bộ lại */}
        <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md border border-surface-container">
          <div className="flex items-center gap-2">
            <Icon name="sync" className="text-[20px] text-primary" />
            <h3 className="font-label-lg text-label-lg font-semibold text-on-surface">Đồng bộ lại Kho tri thức</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Nạp lại dữ liệu đã phê duyệt vào Qdrant. Hệ thống sẽ tự cập nhật khi có bài viết/công thức mới; bạn chỉ cần kích hoạt thủ công khi kho bị lệch hoặc cần cập nhật sách.
          </p>

          <label className="flex flex-col gap-1 font-label-md text-label-md text-on-surface mt-2">
            Phạm vi đồng bộ
            <select value={scope} onChange={(e) => setScope(e.target.value as KnowledgeScope)} className={CONTROL}>
              {(Object.keys(KNOWLEDGE_SCOPE_LABEL) as KnowledgeScope[]).map((value) => (
                <option key={value} value={value}>
                  {KNOWLEDGE_SCOPE_LABEL[value]}
                </option>
              ))}
            </select>
          </label>

          <Button onClick={() => setConfirming(true)} loading={reindex.isPending} className="mt-2">
            <Icon name="sync" className="text-[18px]" />
            Đồng bộ lại
          </Button>

          {jobId && (
            <div role="status" className="mt-2 rounded-lg bg-surface-container p-3 font-body-sm text-body-sm text-on-surface-variant">
              Đã xếp hàng job <span className="font-label-md text-label-md font-semibold text-primary">{jobId}</span>. Hệ thống tự động làm mới khi job hoàn tất.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        show={confirming}
        title="Xác nhận đồng bộ lại kho tri thức?"
        message={
          <>
            Phạm vi lựa chọn: <strong>{KNOWLEDGE_SCOPE_LABEL[scope]}</strong>. Quá trình này sẽ tạo lại vector embeddings chạy nền và tính vào lượng token sử dụng của ngày hôm nay.
            Trong lúc đồng bộ, Chatbot vẫn phục vụ người dùng bình thường bằng dữ liệu hiện có.
          </>
        }
        confirmLabel="Bắt đầu đồng bộ"
        loading={reindex.isPending}
        onConfirm={run}
        onCancel={() => !reindex.isPending && setConfirming(false)}
      />
      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </div>
  );
};

export default AiRagPage;
