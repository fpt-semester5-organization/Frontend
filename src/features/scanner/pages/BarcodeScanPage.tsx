/**
 * SCR-15 · scanner/BarcodeScan (camera + nhập tay) · `/scanner`
 * FN: FN-BAR-01 · Huỳnh Việt Phát · Sprint 6
 * Nối API thật: GET /products/barcode/{barcode} (+ GET /users/me/scans cho "quét gần đây" của Thành viên).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { InlineAlert } from '@/features/shared/components/InlineAlert';
import { useQuotaDialog } from '@/features/shared/hooks/useQuotaDialog';
import { toProblem } from '@/features/shared/lib/problem';
import { PATHS } from '@/routes/paths';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth.store';
import { ScanResultCard } from '../components/ScanResultCard';
import { VerdictBadge } from '../components/VerdictBadge';
import { useBarcodeCamera } from '../hooks/useBarcodeCamera';
import { useBarcodeLookup, useRecentScans } from '../hooks/useScanner';
import { BARCODE_REGEX, barcodeSchema, type BarcodeForm } from '../schemas/barcode.schema';
import type { BarcodeResult, ScanMethod } from '../types/scanner.types';

type View =
  | { kind: 'idle' }
  | { kind: 'result'; result: BarcodeResult }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'error'; message: string; retry: { barcode: string; method: ScanMethod }; service: boolean };

export function BarcodeScanPage() {
  const authed = useAuthStore(selectIsAuthenticated);
  const lookup = useBarcodeLookup();
  const recent = useRecentScans();
  const { handle: handleQuota, dialog } = useQuotaDialog();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [view, setView] = useState<View>({ kind: 'idle' });

  const [params] = useSearchParams();
  const prefill = (params.get('barcode') ?? '').trim();
  const form = useForm<BarcodeForm>({ resolver: zodResolver(barcodeSchema), defaultValues: { barcode: BARCODE_REGEX.test(prefill) ? prefill : '' } });

  const run = (barcode: string, method: ScanMethod) => {
    if (lookup.isPending) return;
    lookup.mutate(
      { barcode, method },
      {
        onSuccess: (result) => setView({ kind: 'result', result }),
        onError: (err) => {
          const p = toProblem(err);
          if (handleQuota(err)) return;
          if (p.code === 'ERR_PRODUCT_NOT_FOUND') return setView({ kind: 'not-found', barcode });
          if (p.code === 'ERR_VALIDATION') {
            form.setError('barcode', { message: p.fields.barcode ?? p.message });
            return;
          }
          setView({ kind: 'error', message: p.message, retry: { barcode, method }, service: p.code === 'ERR_EXT_OPENFOODFACTS_FAILED' || p.upstream });
        },
      },
    );
  };

  const onDetect = (text: string) => {
    const code = text.trim();
    if (!BARCODE_REGEX.test(code)) return; // bỏ qua mã không phải EAN/UPC (vd. QR)
    if (lookup.isPending) return;
    setMode('manual');
    form.setValue('barcode', code, { shouldValidate: true });
    run(code, 'CAMERA_BARCODE');
  };
  const { videoRef, error: cameraError } = useBarcodeCamera(mode === 'camera', onDetect);

  useEffect(() => {
    // Khách từ chối quyền camera -> chuyển sang nhập tay (method MANUAL_INPUT).
    if (cameraError) setMode('manual');
  }, [cameraError]);

  const submit = form.handleSubmit((v) => run(v.barcode, 'MANUAL_INPUT'));
  const modeBtn = (active: boolean) =>
    `flex items-center gap-2 px-space-md py-2 rounded-lg font-label-md text-label-md transition-all ${active ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`;

  return (
    <main className="min-h-[calc(100vh-140px)] w-full bg-surface pt-[72px]">
      <div className="mx-auto max-w-[1440px] px-margin py-space-xl">
        <div className="mb-space-lg flex flex-col justify-between gap-space-md md:flex-row md:items-center">
          <h1 className="mt-1 font-headline-lg text-headline-lg tracking-tight text-primary">Quét mã vạch &amp; e-Numbers</h1>
        </div>

        <div className="mb-space-xl rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="mb-space-md inline-flex rounded-lg bg-surface-container-low p-1" role="tablist" aria-label="Chế độ quét">
              <button type="button" role="tab" aria-selected={mode === 'camera'} onClick={() => setMode('camera')} className={modeBtn(mode === 'camera')}>
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Quét camera trực tiếp</span>
              </button>
              <button type="button" role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')} className={modeBtn(mode === 'manual')}>
                <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                <span>Nhập mã vạch thủ công</span>
              </button>
            </div>

            {mode === 'camera' && (
              <div className="relative mb-space-md flex aspect-video w-full max-w-xl items-center justify-center overflow-hidden rounded-xl bg-surface-container" id="camera-viewport">
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-8 flex flex-col items-center justify-between rounded-lg p-4">
                  <div className="flex w-full items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                    <span>[ Đang tìm mã vạch... ]</span>
                    <span className="h-2.5 w-2.5 animate-ping rounded-full bg-secondary" />
                  </div>
                  <div className="h-0.5 w-3/4 animate-pulse bg-secondary shadow-sm" />
                  <p className="rounded-md bg-surface-container-lowest/80 px-3 py-1 font-body-sm text-body-sm text-on-surface-variant">Căn chỉnh mã vạch vào giữa khung ngắm camera</p>
                </div>
              </div>
            )}
            {cameraError && (
              <InlineAlert tone="warning" className="mb-space-md w-full">
                {cameraError}
              </InlineAlert>
            )}

            {mode === 'manual' && (
              <form className="flex w-full flex-col items-start gap-space-sm sm:flex-row" onSubmit={submit} noValidate>
                <div className="w-full flex-1">
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">qr_code_scanner</span>
                    <input
                      {...form.register('barcode')}
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="Mã vạch"
                      aria-invalid={!!form.formState.errors.barcode}
                      placeholder="Nhập 8–14 chữ số dưới mã vạch"
                      className={`w-full rounded-lg bg-surface-container-low py-3 pl-12 pr-4 font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container ${form.formState.errors.barcode ? 'ring-1 ring-error' : ''}`}
                    />
                  </div>
                  {form.formState.errors.barcode && (
                    <p role="alert" className="mt-1 font-label-sm text-label-sm text-error">
                      {form.formState.errors.barcode.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={lookup.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3 font-label-md text-label-md text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <span>{lookup.isPending ? 'Đang thẩm định...' : 'Phân Tích Ngay'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {lookup.isPending && (
          <div className="mb-space-xl animate-pulse space-y-4 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm" role="status" aria-busy="true" aria-label="Đang tra cứu sản phẩm">
            <div className="h-7 w-1/2 rounded bg-surface-container-high" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-32 rounded-xl bg-surface-container" />
              <div className="h-32 rounded-xl bg-surface-container" />
            </div>
          </div>
        )}

        {!lookup.isPending && view.kind === 'result' && <ScanResultCard result={view.result} isMember={true} />}

        {!lookup.isPending && view.kind === 'not-found' && (
          <div className="mb-space-xl flex flex-col items-center gap-2 rounded-xl bg-surface-container-lowest p-space-xl text-center shadow-sm" role="status">
            <span className="material-symbols-outlined text-[44px] text-outline">search_off</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Không tìm thấy sản phẩm</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Mã {view.barcode} chưa có trong cơ sở dữ liệu và Open Food Facts. Lượt quét này không bị tính vào hạn mức của bạn.</p>
          </div>
        )}

        {!lookup.isPending && view.kind === 'error' && (
          <InlineAlert
            tone="error"
            title={view.service ? 'Dịch vụ tạm gián đoạn' : 'Không tra cứu được'}
            className="mb-space-xl"
            action={
              <button type="button" onClick={() => run(view.retry.barcode, view.retry.method)} className="shrink-0 rounded-lg bg-error px-3 py-1.5 font-label-md text-label-md text-on-error">
                Thử lại
              </button>
            }
          >
            {view.message}
          </InlineAlert>
        )}

        {authed && (
          <section className="flex flex-col gap-space-md" aria-label="Quét gần đây">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Quét gần đây</h2>
              <Link to={PATHS.SCANNER.HISTORY} className="inline-flex items-center gap-1 font-label-md text-label-md font-semibold text-primary hover:underline">
                {recent.data ? `Xem tất cả ${recent.data.meta.total} mục` : 'Xem tất cả'}
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </div>
            {recent.isPending ? (
              <div className="grid animate-pulse grid-cols-1 gap-space-md md:grid-cols-3" role="status" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-surface-container" />
                ))}
              </div>
            ) : recent.isError ? (
              <InlineAlert
                tone="error"
                action={
                  <button type="button" onClick={() => void recent.refetch()} className="shrink-0 font-label-md text-label-md font-semibold underline">
                    Thử lại
                  </button>
                }
              >
                {toProblem(recent.error).message}
              </InlineAlert>
            ) : recent.data.items.length === 0 ? (
              <p className="rounded-xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant">Chưa có lịch sử quét. Quét mã vạch đầu tiên để xem thành phần sản phẩm.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-space-md md:grid-cols-3">
                {recent.data.items.map((s) => (
                  <li key={s.scanId}>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('barcode', s.barcode);
                        setMode('manual');
                        run(s.barcode, 'MANUAL_INPUT');
                      }}
                      className="flex w-full items-center justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-label-md text-label-md font-bold text-on-surface">{s.productName}</span>
                        <span className="truncate font-body-sm text-body-sm text-on-surface-variant">{s.barcode}</span>
                        <VerdictBadge verdict={s.veganVerdict} className="mt-1" />
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-outline-variant">chevron_right</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      {dialog}
    </main>
  );
}
