/**
 * SCR-16 · scanner/ScanHistory · `/scanner/history`
 * FN: FN-BAR-02 · Huỳnh Việt Phát · Sprint 6
 * Nối API thật: GET /users/me/scans (lọc verdict, allergenOnly, phân trang).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, ListSkeleton } from '@/components/common/ScreenStates';
import { Pagination } from '@/features/shared/components/Pagination';
import { toProblem } from '@/features/shared/lib/problem';
import { formatDateTime } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { VerdictBadge } from '../components/VerdictBadge';
import { useScanHistory } from '../hooks/useScanner';
import type { VeganVerdict } from '../types/scanner.types';

const SIZE = 20;
const FILTERS: { key: VeganVerdict | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'GREEN', label: 'Thuần chay' },
  { key: 'YELLOW', label: 'Cần lưu ý' },
  { key: 'RED', label: 'Không thuần chay' },
];

export function ScanHistoryPage() {
  const [verdict, setVerdict] = useState<VeganVerdict | 'ALL'>('ALL');
  const [allergenOnly, setAllergenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const q = useScanHistory({ verdict: verdict === 'ALL' ? undefined : verdict, allergenOnly, page, size: SIZE });

  const pill = (active: boolean) =>
    `px-3 py-1.5 font-label-sm text-label-sm uppercase tracking-wider transition-colors ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`;

  if (q.isPending && !q.data) return <ListSkeleton rows={6} />;
  if (q.isError && !q.data) return <ErrorState message={toProblem(q.error).message} onRetry={() => void q.refetch()} />;

  const data = q.data!;
  return (
    <main className="min-h-screen w-full bg-surface-container-lowest pt-[72px]">
      <div className="flex w-full flex-col">
        <section className="w-full bg-surface-container-lowest pb-space-lg pt-space-md">
          <div className="mx-auto max-w-7xl px-margin">
            <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
              <Link to={PATHS.SCANNER.ROOT} className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary">
                <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                Quét mã vạch
              </Link>
              <Link to={PATHS.SCANNER.ROOT} className="inline-flex items-center gap-space-xs bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary-container">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Quét sản phẩm mới</span>
              </Link>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-primary">Lịch sử quét mã vạch</h1>
          </div>
        </section>

        <section className="w-full flex-1 bg-surface-container-low py-space-lg">
          <div className="mx-auto max-w-7xl px-margin">
            <div className="mb-space-md flex flex-wrap items-center gap-space-xs bg-surface-container-lowest p-space-md shadow-sm" role="group" aria-label="Bộ lọc">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={verdict === f.key} onClick={() => { setVerdict(f.key); setPage(1); }} className={pill(verdict === f.key)}>
                  {f.label}
                </button>
              ))}
              <label className="ml-auto flex cursor-pointer items-center gap-2 font-label-md text-label-md text-on-surface">
                <input type="checkbox" checked={allergenOnly} onChange={(e) => { setAllergenOnly(e.target.checked); setPage(1); }} className="h-4 w-4 accent-primary" />
                Chỉ hiện sản phẩm dính dị ứng
              </label>
            </div>

            {data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 bg-surface-container-lowest p-space-xl text-center shadow-sm" role="status">
                <span className="material-symbols-outlined text-[44px] text-outline">history</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Chưa có lịch sử quét</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {verdict !== 'ALL' || allergenOnly ? 'Không có lượt quét nào khớp bộ lọc.' : 'Quét mã vạch đầu tiên để xem thành phần sản phẩm.'}
                </p>
                <Link to={PATHS.SCANNER.ROOT} className="mt-2 inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary">
                  Quét mã vạch
                </Link>
              </div>
            ) : (
              <div className={`overflow-hidden bg-surface-container-lowest shadow-sm ${q.isFetching ? 'opacity-70' : ''}`} aria-busy={q.isFetching}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                        <th className="px-space-md py-3 font-semibold">Sản phẩm &amp; mã vạch</th>
                        <th className="px-space-md py-3 font-semibold">Kết quả đánh giá</th>
                        <th className="px-space-md py-3 font-semibold">Dị ứng</th>
                        <th className="px-space-md py-3 font-semibold">Thời gian</th>
                        <th className="px-space-md py-3 text-right font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm text-on-surface">
                      {data.items.map((s) => (
                        <tr key={s.scanId} className="transition-colors odd:bg-surface-container-lowest even:bg-surface hover:bg-surface-container-low">
                          <td className="px-space-md py-4">
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-headline-sm text-headline-sm font-bold text-primary">{s.productName}</span>
                              <span className="mt-0.5 w-fit bg-surface-container px-1.5 py-0.5 font-mono font-label-sm text-label-sm text-on-surface-variant">{s.barcode}</span>
                            </div>
                          </td>
                          <td className="px-space-md py-4"><VerdictBadge verdict={s.veganVerdict} /></td>
                          <td className="px-space-md py-4">
                            {s.isAllergenTriggered ? (
                              <span className="inline-flex items-center gap-1 bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-fixed">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                Có chất dị ứng
                              </span>
                            ) : (
                              <span className="text-on-surface-variant">Không</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-space-md py-4 text-on-surface-variant">{formatDateTime(s.scannedAt)}</td>
                          <td className="whitespace-nowrap px-space-md py-4 text-right">
                            <Link to={`${PATHS.SCANNER.ROOT}?barcode=${encodeURIComponent(s.barcode)}`} className="bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-primary transition-colors hover:bg-primary hover:text-on-primary">
                              Quét lại
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={data.meta.page} size={data.meta.size} total={data.meta.total} onPage={setPage} />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
