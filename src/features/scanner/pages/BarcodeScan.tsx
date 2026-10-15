import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { QUOTA } from '@/constants/quota';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { getErrorMessage, notifyApiError } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { CameraScanner } from '../components/CameraScanner';
import { ManualBarcodeForm } from '../components/ManualBarcodeForm';
import { ScanQuotaBadge } from '../components/ScanQuotaBadge';
import { ScanResultCard } from '../components/ScanResultCard';
import type { CameraState } from '../hooks/useBarcodeCamera';
import { useLookupBarcode } from '../hooks/useScanner';
import { VERDICT_INFO } from '../lib/verdict';
import type { ScanMethod } from '../types/scanner.types';

type Mode = 'camera' | 'manual';

const canUseCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

/** Lý do không dùng được camera → lời nhắn khi chuyển sang nhập tay. */
const CAMERA_NOTICE: Partial<Record<CameraState, { title: string; text: string }>> = {
  denied: {
    title: 'Bạn đã từ chối quyền camera',
    text: 'Đã chuyển sang nhập mã tay. Muốn quét bằng camera, hãy bật lại quyền camera cho trang này trong cài đặt trình duyệt.',
  },
  'no-camera': { title: 'Không tìm thấy camera', text: 'Thiết bị này không có camera, hãy nhập mã vạch bằng tay.' },
  busy: { title: 'Camera đang được ứng dụng khác dùng', text: 'Hãy đóng ứng dụng đang dùng camera rồi thử lại, hoặc nhập mã tay.' },
  unsupported: {
    title: 'Trình duyệt không mở được camera',
    text: 'Quét bằng camera cần trình duyệt hỗ trợ và trang chạy qua HTTPS. Hãy nhập mã tay.',
  },
  error: { title: 'Không mở được camera', text: 'Đã có lỗi khi mở camera, hãy nhập mã tay.' },
};

/**
 * SCR-15 scanner/BarcodeScan — /scanner. GET /products/barcode/{barcode} (FN-BAR-01).
 * Quét bằng camera (ZXing) hoặc nhập tay; từ chối camera thì chuyển sang nhập tay. Khách 03 lượt/ngày.
 */
const BarcodeScan: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMember = useAuthStore((state) => state.isAuthenticated);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);
  const lookup = useLookupBarcode();
  const [mode, setMode] = useState<Mode>(() => (canUseCamera() ? 'camera' : 'manual'));
  const [cameraNotice, setCameraNotice] = useState<CameraState | null>(() => (canUseCamera() ? null : 'unsupported'));
  const [initialBarcode, setInitialBarcode] = useState<string | undefined>();
  const [scanKey, setScanKey] = useState(0);

  const runLookup = useCallback(
    (barcode: string, method: ScanMethod) =>
      lookup.mutate(
        { barcode, method },
        {
          onError: (error) => {
            const apiError = toApiError(error);
            // 404, 403 hết lượt, 503, 400 hiện ngay trong trang; còn lại báo bằng toast.
            if (![400, 403, 404, 502, 503].includes(apiError.status)) notifyApiError(apiError);
          },
        }
      ),
    [lookup]
  );

  // Mở lại từ lịch sử: điền mã và kiểm tra một lần (state của router, tải lại trang không chạy lại).
  useEffect(() => {
    const barcode = (location.state as { barcode?: string } | null)?.barcode;
    if (!barcode) return;
    setMode('manual');
    setInitialBarcode(barcode);
    runLookup(barcode, 'MANUAL_INPUT');
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraUnavailable = useCallback((state: CameraState) => {
    setCameraNotice(state);
    setMode('manual');
  }, []);

  const scanAnother = () => {
    lookup.reset();
    setInitialBarcode(undefined);
    setScanKey((key) => key + 1);
  };

  const error = lookup.error ? toApiError(lookup.error) : null;
  const variables = lookup.variables;
  const notice = cameraNotice ? CAMERA_NOTICE[cameraNotice] : undefined;

  const renderResult = () => {
    if (lookup.isPending) {
      return (
        <div role="status" aria-busy="true" aria-label="Đang tra cứu sản phẩm" className="flex flex-col gap-space-sm">
          <Skeleton className="h-28" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40" />
        </div>
      );
    }
    if (error) {
      if (error.status === 404) {
        return (
          <EmptyState
            icon="search_off"
            title="Không tìm thấy sản phẩm"
            description={`Chưa có dữ liệu cho mã ${variables?.barcode ?? ''}. Lượt này không bị tính. Hãy kiểm tra lại mã hoặc thử sản phẩm khác.`}
            action={<Button variant="outline" onClick={scanAnother}>Quét sản phẩm khác</Button>}
          />
        );
      }
      if (error.errorCode === 'ERR_QUOTA_BARCODE_EXCEEDED') {
        return (
          <EmptyState
            icon="lock"
            title={`Bạn đã dùng hết ${QUOTA.guest.barcodeDaily} lượt quét hôm nay`}
            description="Đăng ký tài khoản miễn phí để quét không giới hạn, được cảnh báo dị ứng cá nhân và lưu lịch sử quét."
            action={<Button onClick={() => openSignupPrompt()}>Đăng ký miễn phí</Button>}
          />
        );
      }
      if (error.status === 503 || error.status === 502) {
        return (
          <FormAlert tone="warning" title="Dịch vụ tạm gián đoạn">
            <p>{getErrorMessage(error)}</p>
            {variables && (
              <button
                type="button"
                onClick={() => runLookup(variables.barcode, variables.method)}
                className="mt-1 font-label-md text-label-md text-primary hover:underline"
              >
                Thử lại
              </button>
            )}
          </FormAlert>
        );
      }
    }
    if (lookup.data) {
      return (
        <div className="flex flex-col gap-space-md">
          <ScanResultCard result={lookup.data.data} isMember={isMember} />
          <Button variant="outline" onClick={scanAnother} className="self-start">
            <Icon name="barcode_scanner" className="text-[18px]" />
            Quét sản phẩm khác
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-space-md rounded-xl border border-dashed border-outline-variant px-space-lg py-space-xl text-center">
        <Icon name="eco" className="text-[40px] text-primary" />
        <p className="font-label-lg text-label-lg text-on-surface">Sản phẩm này có thuần chay không?</p>
        <p className="max-w-[360px] font-body-sm text-body-sm text-on-surface-variant">
          Quét hoặc nhập mã vạch, VeggieLife đối chiếu thành phần với từ điển phụ gia E-numbers và cho kết luận:
        </p>
        <ul className="flex flex-wrap justify-center gap-space-sm">
          {(['GREEN', 'YELLOW', 'RED'] as const).map((verdict) => (
            <li key={verdict} className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 font-label-sm text-label-sm', VERDICT_INFO[verdict].badge)}>
              <Icon name={VERDICT_INFO[verdict].icon} className="text-[16px]" />
              {VERDICT_INFO[verdict].short}: {VERDICT_INFO[verdict].label}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Quét mã vạch</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Kiểm tra sản phẩm đóng gói có thuần chay không qua phụ gia E-numbers.
          </p>
        </div>
        {isMember ? (
          <Link
            to={PATHS.SCANNER.HISTORY}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-4 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
          >
            <Icon name="history" className="text-[18px]" />
            Lịch sử quét
          </Link>
        ) : (
          <ScanQuotaBadge />
        )}
      </header>

      <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          aria-label="Quét hoặc nhập mã"
          className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card"
        >
          <div role="tablist" aria-label="Cách nhập mã" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1">
            {([
              ['camera', 'photo_camera', 'Quét bằng camera'],
              ['manual', 'keyboard', 'Nhập mã tay'],
            ] as const).map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md transition-colors',
                  mode === value ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <Icon name={icon} className="text-[18px]" />
                {label}
              </button>
            ))}
          </div>

          {mode === 'manual' && notice && (
            <FormAlert tone={cameraNotice === 'denied' ? 'warning' : 'info'} title={notice.title}>
              {notice.text}
            </FormAlert>
          )}

          {mode === 'camera' ? (
            <CameraScanner
              key={scanKey}
              autoStart={scanKey > 0}
              paused={lookup.isPending || !!lookup.data}
              onDetected={(barcode) => runLookup(barcode, 'CAMERA_BARCODE')}
              onUnavailable={handleCameraUnavailable}
            />
          ) : (
            <ManualBarcodeForm
              key={scanKey}
              onSubmit={(barcode) => runLookup(barcode, 'MANUAL_INPUT')}
              submitting={lookup.isPending}
              initialBarcode={initialBarcode}
              serverError={error?.status === 400 ? getErrorMessage(error) : null}
              autoFocus={cameraNotice !== null}
            />
          )}

          {!isMember && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Khách quét được {QUOTA.guest.barcodeDaily} lượt mỗi ngày (mã không tìm thấy không bị tính).
            </p>
          )}
        </section>

        <section aria-label="Kết quả" aria-live="polite" className="min-w-0">
          {renderResult()}
        </section>
      </div>
    </div>
  );
};

export default BarcodeScan;
