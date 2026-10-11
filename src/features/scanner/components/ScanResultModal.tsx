import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, RefreshCw, X, ShieldAlert } from 'lucide-react';
import type { BarcodeScanResponse } from '../types/scanner.types';

interface ScanResultModalProps {
  result: BarcodeScanResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onScanAgain: () => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  result,
  isOpen,
  onClose,
  onScanAgain,
}) => {
  if (!isOpen || !result) return null;

  const isVegan = result.veganVerdict === 'VEGAN';
  const isNonVegan = result.veganVerdict === 'NON_VEGAN';

  const getStatusConfig = () => {
    if (isVegan) {
      return {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-800',
        badgeBg: 'bg-emerald-700 text-white',
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
        title: 'Sản phẩm Thuần Chay',
        badgeText: 'VEGAN',
      };
    }
    if (isNonVegan) {
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        badgeBg: 'bg-red-700 text-white',
        icon: <XCircle className="w-8 h-8 text-red-600" />,
        title: 'Không Thuần Chay',
        badgeText: 'NON-VEGAN',
      };
    }
    return {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      badgeBg: 'bg-amber-600 text-white',
      icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
      title: 'Cần Lưu Ý / Chưa Rõ',
      badgeText: 'DOUBTFUL',
    };
  };

  const status = getStatusConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className={`p-6 border-b flex items-start gap-4 ${status.bg}`}>
          <div className="p-2.5 rounded-xl bg-white shadow-xs flex-shrink-0">
            {status.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase ${status.badgeBg}`}>
                {status.badgeText}
              </span>
              <span className="text-xs font-mono text-gray-500">Mã: {result.barcode}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {status.title}
            </h2>
            <p className={`text-xs mt-1 leading-relaxed ${status.text}`}>
              {result.verdictText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Product Basic Info */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">
              Tên sản phẩm
            </span>
            <div className="text-base font-bold text-gray-900">{result.productName}</div>
            <div className="text-xs text-gray-500 mt-0.5">Thương hiệu: <b className="text-gray-700">{result.brand || 'Chưa cập nhật'}</b></div>
          </div>

          {/* Personal Allergy Trigger Alert */}
          {result.personalAllergyCheck && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <b className="font-semibold">Cảnh báo dị ứng cá nhân:</b> Sản phẩm chứa thành phần dị ứng trong hồ sơ sức khỏe của bạn!
              </div>
            </div>
          )}

          {/* Detected Additives (E-numbers) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#133e2e]" />
              <span>Chất phụ gia phát hiện ({result.detectedAdditives?.length || 0})</span>
            </h3>
            {result.detectedAdditives && result.detectedAdditives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.detectedAdditives.map((add, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-gray-200 bg-white flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-gray-800">{add.code}</span>
                      <div className="text-[11px] text-gray-500 line-clamp-1">{add.name}</div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        add.veganStatus === 'VEGAN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : add.veganStatus === 'NON_VEGAN'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {add.veganStatus === 'VEGAN' ? 'Chay' : add.veganStatus === 'NON_VEGAN' ? 'Phi chay' : 'Lưu ý'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Không phát hiện phụ gia E-number đáng ngại.</p>
            )}
          </div>

          {/* Allergen Warnings */}
          {result.allergenWarnings && result.allergenWarnings.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Chất gây dị ứng
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.allergenWarnings.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quota info */}
          {result.quota && (
            <div className="pt-2 text-center text-[11px] text-gray-400">
              Lượt quét còn lại hôm nay: <b className="text-gray-700">{result.quota.remaining}</b> / {result.quota.limit}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-white text-xs font-medium text-gray-700 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={onScanAgain}
            className="px-5 py-2.5 rounded-xl bg-[#133e2e] hover:bg-[#0c281e] text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Quét mã khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};
