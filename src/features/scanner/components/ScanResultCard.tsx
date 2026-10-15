import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { ADDITIVE_INFO, ADDITIVE_ORDER, allergenLabel, VERDICT_INFO } from '../lib/verdict';
import type { ProductScanResult } from '../types/scanner.types';

/** Kết quả quét (FN-BAR-01): kết luận Xanh/Vàng/Đỏ, phụ gia phát hiện, cảnh báo dị ứng cá nhân (Thành viên). */
export const ScanResultCard: React.FC<{ result: ProductScanResult; isMember: boolean }> = ({ result, isMember }) => {
  const location = useLocation();
  const verdict = VERDICT_INFO[result.veganVerdict] ?? VERDICT_INFO.YELLOW;
  const additives = [...result.detectedAdditives].sort(
    (a, b) => ADDITIVE_ORDER.indexOf(a.veganStatus) - ADDITIVE_ORDER.indexOf(b.veganStatus)
  );
  const returnUrl = `${location.pathname}${location.search}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-card">
      <header className={cn('flex items-center gap-space-md p-space-lg', verdict.hero)} role="status">
        <Icon name={verdict.icon} filled className="text-[44px]" />
        <div className="min-w-0">
          <p className="font-label-sm text-label-sm uppercase tracking-wide opacity-80">Kết luận: {verdict.short}</p>
          <h2 className="font-headline-md text-headline-md">{verdict.label}</h2>
          {result.verdictText && <p className="font-body-md text-body-md">{result.verdictText}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-space-lg p-space-lg">
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-sm text-headline-sm break-words text-on-surface">{result.productName}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {result.brand && <span>{result.brand} · </span>}
            <span className="font-mono tabular-nums">{result.barcode}</span>
          </p>
        </div>

        <section aria-labelledby="scan-additives" className="flex flex-col gap-space-sm">
          <h4 id="scan-additives" className="font-label-lg text-label-lg text-on-surface">
            Phụ gia phát hiện ({additives.length})
          </h4>
          {additives.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Không phát hiện mã phụ gia E nào trong thành phần.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {additives.map((additive) => (
                <li
                  key={additive.code}
                  className="flex items-center gap-space-sm rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-body-sm"
                >
                  <span className="w-14 shrink-0 font-mono font-semibold text-on-surface">{additive.code}</span>
                  <span className="min-w-0 flex-1 text-on-surface-variant">{additive.name}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 font-label-sm text-label-sm', ADDITIVE_INFO[additive.veganStatus].className)}>
                    {ADDITIVE_INFO[additive.veganStatus].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="scan-allergy" className="flex flex-col gap-space-sm">
          <h4 id="scan-allergy" className="font-label-lg text-label-lg text-on-surface">
            Dị ứng của bạn
          </h4>
          {isMember && result.personalAllergyCheck ? (
            result.allergenWarnings.length > 0 ? (
              <div className="flex flex-col gap-space-xs rounded-lg bg-error-container p-space-md text-on-error-container" role="alert">
                <p className="flex items-center gap-1.5 font-label-md text-label-md">
                  <Icon name="warning" className="text-[18px]" />
                  Có chất bạn đã khai báo dị ứng
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {result.allergenWarnings.map((warning, index) => (
                    <li key={index} className="rounded-full bg-white/60 px-2.5 py-0.5 font-label-sm text-label-sm">
                      {allergenLabel(warning)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-success">
                <Icon name="check_circle" className="text-[18px]" />
                Không thấy chất nào trong danh sách dị ứng bạn đã khai báo.
              </p>
            )
          ) : isMember ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Khai báo dị ứng trong hồ sơ để được cảnh báo khi quét.{' '}
              <Link to={PATHS.ME.DIETARY_PREFERENCES} className="text-primary no-underline hover:underline">
                Khai báo ngay
              </Link>
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              <Link to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)} className="text-primary no-underline hover:underline">
                Đăng ký miễn phí
              </Link>{' '}
              để được cảnh báo dị ứng cá nhân, quét không giới hạn và lưu lịch sử quét.
            </p>
          )}
        </section>

        <p className="flex items-start gap-1.5 border-t border-surface-container pt-space-sm font-body-sm text-body-sm text-outline">
          <Icon name="info" className="mt-0.5 text-[16px]" />
          Kết quả dựa trên dữ liệu sản phẩm và từ điển phụ gia E-numbers, chỉ để tham khảo. Hãy đọc kỹ nhãn trên bao bì.
        </p>
      </div>
    </article>
  );
};
