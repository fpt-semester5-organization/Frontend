import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { useScanHistory } from '../hooks/useScanner';
import { VERDICT_INFO } from '../lib/verdict';
import type { VeganVerdict } from '../types/scanner.types';

const PAGE_SIZE = 20;
const VERDICTS: VeganVerdict[] = ['GREEN', 'YELLOW', 'RED'];
const SCAN_LINK =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline shadow-sm hover:bg-primary';

/** SCR-16 scanner/ScanHistory — /scanner/history. GET /users/me/scans (FN-BAR-02), chỉ Thành viên. */
const ScanHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const verdictParam = searchParams.get('verdict');
  const verdict = VERDICTS.includes(verdictParam as VeganVerdict) ? (verdictParam as VeganVerdict) : undefined;
  const allergenOnly = searchParams.get('allergenOnly') === 'true';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const history = useScanHistory({ verdict, allergenOnly, page, size: PAGE_SIZE });

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const filtered = !!verdict || allergenOnly;

  const renderBody = () => {
    if (history.isPending) {
      return (
        <div role="status" aria-busy="true" aria-label="Đang tải lịch sử quét" className="flex flex-col gap-space-sm">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-16" />
          ))}
        </div>
      );
    }
    if (history.isError) return <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isRefetching} />;

    const { items, meta } = history.data;
    if (items.length === 0) {
      return filtered ? (
        <EmptyState
          icon="filter_alt_off"
          title="Không có lượt quét nào khớp bộ lọc"
          action={
            <button
              type="button"
              onClick={() => updateParams({ verdict: null, allergenOnly: null })}
              className="font-label-md text-label-md text-primary hover:underline"
            >
              Bỏ lọc
            </button>
          }
        />
      ) : (
        <EmptyState
          icon="barcode_scanner"
          title="Bạn chưa quét sản phẩm nào"
          description="Mỗi lần quét khi đã đăng nhập sẽ được lưu ở đây để xem lại."
          action={
            <Link to={PATHS.SCANNER.ROOT} className={SCAN_LINK}>
              Quét sản phẩm đầu tiên
            </Link>
          }
        />
      );
    }

    return (
      <>
        <ul className={cn('flex flex-col gap-space-sm', history.isPlaceholderData && 'opacity-60')}>
          {items.map((scan) => {
            const info = VERDICT_INFO[scan.veganVerdict] ?? VERDICT_INFO.YELLOW;
            return (
              <li
                key={scan.scanId}
                className="flex flex-wrap items-center gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card sm:flex-nowrap"
              >
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', info.badge)}>
                  <Icon name={info.icon} filled className="text-[24px]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate font-label-lg text-label-lg text-on-surface">{scan.productName}</p>
                  <p className="flex flex-wrap items-center gap-x-space-sm font-body-sm text-body-sm text-on-surface-variant">
                    <span className="font-mono tabular-nums">{scan.barcode}</span>
                    <span>{formatDateTime(scan.scannedAt)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className={cn('rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', info.badge)}>{info.label}</span>
                  {scan.isAllergenTriggered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-error-container">
                      <Icon name="warning" className="text-[14px]" />
                      Dị ứng
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(PATHS.SCANNER.ROOT, { state: { barcode: scan.barcode } })}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-label-md text-label-md text-primary hover:bg-primary-fixed"
                  >
                    <Icon name="refresh" className="text-[18px]" />
                    Quét lại
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <Pagination
          className="mt-space-lg"
          page={page}
          size={PAGE_SIZE}
          total={meta.total}
          onPageChange={(next) => updateParams({ page: String(next) })}
        />
      </>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <Link to={PATHS.SCANNER.ROOT} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
          <Icon name="barcode_scanner" className="text-[16px]" />
          Quét mã vạch
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-primary" aria-current="page">
          Lịch sử quét
        </span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Lịch sử quét</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Các sản phẩm bạn đã quét, mới nhất trước.</p>
        </div>
        <Link to={PATHS.SCANNER.ROOT} className={SCAN_LINK}>
          <Icon name="barcode_scanner" className="text-[18px]" />
          Quét mã mới
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-space-sm">
        <div role="radiogroup" aria-label="Lọc theo kết luận" className="flex flex-wrap rounded-xl bg-surface-container p-1">
          {[undefined, ...VERDICTS].map((value) => (
            <button
              key={value ?? 'ALL'}
              type="button"
              role="radio"
              aria-checked={verdict === value}
              onClick={() => updateParams({ verdict: value ?? null })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-label-md text-label-md transition-colors',
                verdict === value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {value && <span className={cn('h-2.5 w-2.5 rounded-full', VERDICT_INFO[value].dot)} />}
              {value ? VERDICT_INFO[value].short : 'Tất cả'}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={allergenOnly}
            onChange={(event) => updateParams({ allergenOnly: event.target.checked ? 'true' : null })}
            className="accent-primary"
          />
          Chỉ lượt có cảnh báo dị ứng
        </label>
      </div>

      {renderBody()}
    </div>
  );
};

export default ScanHistory;
