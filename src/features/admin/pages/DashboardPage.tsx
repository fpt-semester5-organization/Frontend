/**
 * SCR-38 · admin/Dashboard · `/admin`
 * FN-ADM-18: GET /admin/analytics/overview?from&to (YYYY-MM-DD). Chỉ đọc; mọi số liệu lấy từ API, không có số giả.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { AdminPage, Panel, StatCard } from '../components/AdminPage';
import { DateFilter } from '../components/Filters';
import { QueryState } from '../components/QueryState';
import { useAnalyticsOverview } from '../hooks/useSystem';
import { presetRange, type RangePreset } from '../lib/dates';
import { ACCOUNT_STATUS_LABEL } from '../lib/labels';

const PRESETS: [RangePreset, string][] = [
  ['TODAY', 'Hôm nay'],
  ['WEEK', '7 ngày qua'],
  ['MONTH', 'Tháng này'],
];
const nf = new Intl.NumberFormat('vi-VN');
const num = (n?: number) => (n === undefined || n === null ? '—' : nf.format(n));

export function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset | 'CUSTOM'>('MONTH');
  const [range, setRange] = useState(() => presetRange('MONTH'));
  const invalid = !!range.from && !!range.to && range.from > range.to;
  const q = useAnalyticsOverview(invalid ? {} : range);
  const d = q.data;

  const pick = (p: RangePreset) => {
    setPreset(p);
    setRange(presetRange(p));
  };
  const byStatus = Object.entries(d?.users?.byStatus ?? {});

  return (
    <AdminPage
      title="Tổng quan nền tảng & vận hành"
      subtitle="Số liệu trong khoảng thời gian đã chọn (người dùng mới, doanh thu VIP, chi phí AI). Số tổng không phụ thuộc khoảng thời gian."
      actions={
        <div className="inline-flex items-center rounded-xl bg-surface-container-high p-1 font-label-md text-label-md shadow-inner" role="group" aria-label="Khoảng thời gian">
          {PRESETS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={preset === k} onClick={() => pick(k)} className={`rounded-lg px-3.5 py-1.5 transition-colors ${preset === k ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-space-sm">
        <DateFilter label="Từ ngày" value={range.from} onChange={(v) => { setPreset('CUSTOM'); setRange((r) => ({ ...r, from: v })); }} />
        <DateFilter label="Đến ngày" value={range.to} onChange={(v) => { setPreset('CUSTOM'); setRange((r) => ({ ...r, to: v })); }} />
        {invalid && <p role="alert" className="font-label-sm text-label-sm text-error">Từ ngày phải trước hoặc bằng đến ngày.</p>}
      </div>

      <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} refetch={q.refetch} isEmpty={!d} emptyTitle="Chưa có số liệu" emptyHint="Máy chủ chưa trả số liệu cho khoảng thời gian này." rows={4}>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng người dùng" value={num(d?.users?.total)} hint={`+${num(d?.users?.newInPeriod)} trong kỳ`} />
          <StatCard tone={d?.moderationQueue ? 'alert' : 'default'} label="Hàng đợi kiểm duyệt" value={<>{num(d?.moderationQueue)} <span className="font-body-md text-body-md font-normal text-on-surface-variant">mục</span></>} hint={<Link to={PATHS.ADMIN.MODERATION} className="text-secondary hover:underline">Mở hàng đợi</Link>} />
          <StatCard label="Doanh thu VIP (trong kỳ)" value={d?.vip?.revenueVnd === undefined ? '—' : formatVnd(d.vip.revenueVnd)} hint={`${num(d?.vip?.active)} thành viên VIP đang hiệu lực`} />
          <StatCard label="Chi phí AI (trong kỳ)" value={d?.aiCostUsd === undefined ? '—' : `$${d.aiCostUsd.toFixed(2)}`} hint={<Link to={PATHS.ADMIN.AI} className="text-secondary hover:underline">Chi tiết token &amp; chi phí</Link>} />
        </div>

        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
          <Panel title="Nội dung">
            <dl className="grid grid-cols-3 gap-space-md p-space-lg text-center">
              {([['Công thức', d?.content?.recipes], ['Bài viết', d?.content?.posts], ['Video', d?.content?.videos]] as const).map(([label, n]) => (
                <div key={label}>
                  <dd className="font-headline-md text-headline-md text-on-surface">{num(n)}</dd>
                  <dt className="font-label-md text-label-md text-on-surface-variant">{label}</dt>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Người dùng theo trạng thái" actions={<Link to={PATHS.ADMIN.USERS} className="font-label-md text-label-md text-secondary hover:underline">Quản lý</Link>}>
            {byStatus.length === 0 ? (
              <p className="p-space-lg font-body-sm text-body-sm text-on-surface-variant">Máy chủ chưa trả phân bổ theo trạng thái.</p>
            ) : (
              <ul className="divide-y divide-surface-container p-space-sm">
                {byStatus.map(([status, n]) => (
                  <li key={status} className="flex items-center justify-between px-space-md py-2 font-body-sm text-body-sm">
                    <span>{ACCOUNT_STATUS_LABEL[status]?.text ?? status}</span>
                    <span className="font-semibold">{num(n)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </QueryState>
    </AdminPage>
  );
}
