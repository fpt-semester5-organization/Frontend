import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScanBarcode, Sparkles, Loader2, History, ArrowRight } from 'lucide-react';
import { scanBarcodeApi } from '../api/scanner.api';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResultModal } from '../components/ScanResultModal';
import type { BarcodeScanResponse } from '../types/scanner.types';

export const ScannerPage = () => {
  const [scanResult, setScanResult] = useState<BarcodeScanResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentScans, setRecentScans] = useState<BarcodeScanResponse[]>([]);

  // Mutation gọi API Backend (đã tích hợp Open Food Facts)
  const mutation = useMutation({
    mutationFn: scanBarcodeApi,
    onSuccess: (res) => {
      if (res.data) {
        setScanResult(res.data);
        setIsModalOpen(true);
        setRecentScans((prev) => [res.data, ...prev.filter((p) => p.barcode !== res.data.barcode)].slice(0, 10));
      }
    },
    onError: (err: any) => {
      alert((err?.response?.data?.message || err?.message || 'Không thể tra cứu mã vạch. Vui lòng thử lại.'));
    },
  });

  const handleBarcodeDetected = (barcode: string) => {
    if (mutation.isPending) return;
    mutation.mutate(barcode);
  };

  const sampleBarcodes = [
    { code: '737628064502', name: 'Thai Peanut Rice Noodles', desc: 'Mì gạo thuần chay' },
    { code: '5449000000996', name: 'Coca-Cola 330ml', desc: 'Nước giải khát' },
    { code: '8934567890123', name: 'Sản phẩm mẫu VN', desc: 'Thử nghiệm tra cứu' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#133e2e] text-xs font-semibold uppercase tracking-wider">
            <ScanBarcode className="w-4 h-4" />
            <span>Open Food Facts + ZXing Scanner</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#133e2e] tracking-tight">
            Quét mã vạch kiểm tra thuần chay
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Sử dụng camera quét mã vạch sản phẩm để phân tích thành phần, phát hiện chất phụ gia E-number và xác định tính thuần chay tức thì.
          </p>
        </div>

        {/* Scanner Container */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          {/* Loading Indicator Overlay */}
          {mutation.isPending && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
              <Loader2 className="w-10 h-10 text-[#133e2e] animate-spin" />
              <p className="text-sm font-medium text-[#133e2e]">
                Đang tra cứu từ Open Food Facts &amp; kiểm tra thành phần...
              </p>
            </div>
          )}

          {/* ZXing Camera Scanner Component */}
          <BarcodeScanner
            onScan={handleBarcodeDetected}
            isScanningActive={!isModalOpen && !mutation.isPending}
          />

          {/* Quick Demo Samples */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Mã vạch thử nhanh:</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {sampleBarcodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleBarcodeDetected(item.code)}
                  className="p-3 rounded-xl border border-gray-200 hover:border-[#133e2e] hover:bg-emerald-50/50 text-left transition-all text-xs group cursor-pointer"
                >
                  <div className="font-mono font-bold text-gray-900 group-hover:text-[#133e2e]">
                    {item.code}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">{item.name}</div>
                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                    <span>Thử quét</span>
                    <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scans Session Log */}
        {recentScans.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-[#133e2e]" />
              <span>Sản phẩm vừa quét trong phiên này ({recentScans.length})</span>
            </h3>
            <div className="divide-y divide-gray-100">
              {recentScans.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setScanResult(item);
                    setIsModalOpen(true);
                  }}
                  className="py-3 flex items-center justify-between text-xs hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{item.productName}</span>
                    <span className="text-gray-500 text-[11px]">Mã: {item.barcode} · {item.brand}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-medium text-[10px] ${
                      item.veganVerdict === 'VEGAN'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.veganVerdict === 'NON_VEGAN'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.veganVerdict === 'VEGAN' ? 'Thuần chay' : item.veganVerdict === 'NON_VEGAN' ? 'Phi chay' : 'Lưu ý'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result Modal */}
      <ScanResultModal
        result={scanResult}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onScanAgain={() => {
          setIsModalOpen(false);
          setScanResult(null);
        }}
      />
    </div>
  );
};
