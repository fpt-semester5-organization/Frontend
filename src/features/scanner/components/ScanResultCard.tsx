import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { additiveStatus, allergenWarningText, verdictMeta } from '../lib/verdict';
import type { BarcodeResult } from '../types/scanner.types';

/** Kết quả quét: kết luận Xanh/Vàng/Đỏ, đối chiếu dị ứng cá nhân (Thành viên), phụ gia E-number phát hiện. */
export function ScanResultCard({ result, isMember }: { result: BarcodeResult; isMember: boolean }) {
  const v = verdictMeta(result.veganVerdict);
  const warnings = result.allergenWarnings.map(allergenWarningText);
  return (
    <article className="mb-space-xl overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm" aria-label="Kết quả quét">
      <div className="flex flex-col items-start justify-between gap-space-lg bg-gradient-to-r from-surface-container-low/60 to-surface-container-lowest p-space-lg lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Mã vạch {result.barcode}</span>
          <h2 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">{result.productName}</h2>
          {result.brand && <span className="font-body-md text-body-md text-on-surface-variant">{result.brand}</span>}
        </div>
        <div className={`flex w-full shrink-0 items-center gap-space-md rounded-xl p-space-md shadow-sm lg:w-auto ${v.panel}`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${v.dot} text-on-primary`}>
            <span className="material-symbols-outlined text-[26px]">{v.icon}</span>
          </div>
          <div className="flex flex-col">
            <span className={`font-headline-sm text-headline-sm font-bold tracking-tight ${v.text}`}>{v.label}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{result.verdictText}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-lg p-space-lg md:grid-cols-2">
        <section className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-md shadow-sm" aria-label="Kiểm tra dị ứng">
          <div>
            <div className="mb-space-sm flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-secondary">warning</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Kiểm tra dị ứng</h3>
              </div>
              {isMember && result.personalAllergyCheck && (
                <span className={`rounded-md px-2 py-0.5 font-label-sm text-label-sm font-semibold ${warnings.length ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                  {warnings.length ? `Khớp ${warnings.length} mục` : 'Không khớp'}
                </span>
              )}
            </div>
            {warnings.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Không phát hiện chất dị ứng nào trong sản phẩm này.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 rounded-lg bg-secondary-fixed/30 p-space-sm">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-secondary">notification_important</span>
                    <p className="font-label-md text-label-md font-bold text-secondary">Phát hiện: {w}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isMember && (
            <Link to={PATHS.ME.DIETARY} className="mt-space-md inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-secondary hover:underline">
              Xem lại cài đặt dị ứng của tôi
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          )}
        </section>

        <section className="rounded-xl bg-surface-container-low p-space-md shadow-sm" aria-label="Phụ gia E-number">
          <div className="mb-space-sm flex items-center justify-between pb-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-primary">science</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Phụ gia e-Numbers</h3>
            </div>
            <span className="rounded-md bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed">{result.detectedAdditives.length} phụ gia</span>
          </div>
          {result.detectedAdditives.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Không phát hiện mã phụ gia (E-number) trong danh sách thành phần.</p>
          ) : (
            <ul className="flex flex-col gap-space-sm">
              {result.detectedAdditives.map((a) => {
                const s = additiveStatus(a.veganStatus);
                return (
                  <li key={a.code} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest p-2.5 shadow-sm">
                    <span className="font-label-md text-label-md font-bold text-on-surface">{a.code} - {a.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-label-sm text-label-sm font-semibold ${s.cls}`}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-lowest p-space-lg">
        <Link to={PATHS.FRIDGE} className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary">
          <span className="material-symbols-outlined text-[18px]">kitchen</span>
          Mở tủ lạnh ảo
        </Link>
        <Link to={PATHS.CHAT.ROOT} className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-2.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container">
          <span className="material-symbols-outlined text-[18px] text-primary">smart_toy</span>
          Hỏi trợ lý
        </Link>
        {isMember && (
          <Link to={PATHS.SCANNER.HISTORY} className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-2.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">history</span>
            Lịch sử quét
          </Link>
        )}
      </div>
    </article>
  );
}
