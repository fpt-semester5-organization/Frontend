/**
 * SCR-40 · admin/AuditLogs · `/admin/audit-logs`
 * FN-ADM-17: GET /admin/audit-logs (actorUserId, action, targetTable, targetId, from, to, page, size). Chỉ đọc.
 */
import { formatDateTime } from '@/lib/format';
import { AdminPage } from '../components/AdminPage';
import { DateFilter, FilterBar, ResetButton, SearchFilter } from '../components/Filters';
import { Pager } from '../components/Pager';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useListState } from '../hooks/useListState';
import { useAuditLogs } from '../hooks/useSystem';
import { ROLE_LABEL } from '../lib/labels';
import { dateRangeSchema } from '../schemas/admin.schemas';

interface Filters extends Record<string, unknown> {
  actorUserId: string;
  action: string;
  targetTable: string;
  targetId: string;
  from: string;
  to: string;
}
const INITIAL: Filters = { actorUserId: '', action: '', targetTable: '', targetId: '', from: '', to: '' };

export function AuditLogsPage() {
  const { filters, page, size, setFilter, setPage, reset } = useListState<Filters>(INITIAL);
  const actorOk = filters.actorUserId === '' || (/^\d+$/.test(filters.actorUserId) && Number(filters.actorUserId) > 0);
  const range = dateRangeSchema.safeParse({ from: filters.from, to: filters.to });
  const rangeError = range.success ? null : range.error.issues[0]?.message;
  const valid = actorOk && range.success;

  const q = useAuditLogs({
    actorUserId: filters.actorUserId && actorOk ? Number(filters.actorUserId) : undefined,
    action: filters.action || undefined,
    targetTable: filters.targetTable || undefined,
    targetId: filters.targetId || undefined,
    from: valid ? filters.from || undefined : undefined,
    to: valid ? filters.to || undefined : undefined,
    page,
    size,
  });
  const rows = q.data?.items ?? [];

  return (
    <AdminPage wide title="Nhật ký kiểm toán" subtitle="Mọi thao tác nhạy cảm của Admin và hệ thống. Chỉ đọc; không thể sửa hoặc xóa.">
      <FilterBar>
        <SearchFilter label="Mã người thực hiện" value={filters.actorUserId} onSearch={(v) => setFilter('actorUserId', v)} placeholder="Mã người thực hiện" maxLength={12} />
        <SearchFilter label="Hành động" value={filters.action} onSearch={(v) => setFilter('action', v)} placeholder="Hành động (USER_SANCTION…)" maxLength={50} />
        <SearchFilter label="Bảng đích" value={filters.targetTable} onSearch={(v) => setFilter('targetTable', v)} placeholder="Bảng đích (Users…)" maxLength={50} />
        <SearchFilter label="Mã đối tượng" value={filters.targetId} onSearch={(v) => setFilter('targetId', v)} placeholder="Mã đối tượng" maxLength={50} />
        <DateFilter label="Từ ngày" value={filters.from} onChange={(v) => setFilter('from', v)} />
        <DateFilter label="Đến ngày" value={filters.to} onChange={(v) => setFilter('to', v)} />
        <ResetButton onClick={reset} />
        {!actorOk && <p role="alert" className="w-full font-label-sm text-label-sm text-error">Mã người thực hiện phải là số nguyên dương.</p>}
        {rangeError && <p role="alert" className="w-full font-label-sm text-label-sm text-error">{rangeError}</p>}
      </FilterBar>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} refetch={q.refetch} isEmpty={rows.length === 0} emptyTitle="Chưa có bản ghi nhật ký" emptyHint="Không có thao tác nào khớp bộ lọc hiện tại.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-space-lg py-space-md font-semibold">Thời điểm</th>
                  <th className="px-space-md py-space-md font-semibold">Người thực hiện</th>
                  <th className="px-space-md py-space-md font-semibold">Hành động</th>
                  <th className="px-space-md py-space-md font-semibold">Đối tượng</th>
                  <th className="px-space-md py-space-md font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {rows.map((r) => (
                  <tr key={r.auditId} className="hover:bg-surface-container-low/60">
                    <td className="whitespace-nowrap px-space-lg py-space-md text-on-surface-variant">{formatDateTime(r.createdAt)}</td>
                    <td className="px-space-md py-space-md">
                      <span className="font-mono">{r.actorUserId ? `#${r.actorUserId}` : 'Hệ thống'}</span>{' '}
                      {r.actorRole && <StatusPill tone={r.actorRole === 'SYSTEM' ? 'neutral' : 'ok'}>{ROLE_LABEL[r.actorRole] ?? r.actorRole}</StatusPill>}
                    </td>
                    <td className="px-space-md py-space-md font-mono font-semibold text-on-surface">{r.action}</td>
                    <td className="px-space-md py-space-md font-mono text-on-surface-variant">{[r.targetTable, r.targetId].filter(Boolean).join(' #') || '—'}</td>
                    <td className="max-w-[360px] px-space-md py-space-md text-on-surface-variant">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && <Pager meta={q.data.meta} onPage={setPage} fetching={q.isFetching} unit="bản ghi" />}
        </QueryState>
      </div>
    </AdminPage>
  );
}
