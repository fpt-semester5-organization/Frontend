import React, { useState, useEffect } from 'react';
import { FridgeScanner } from '@/components/FridgeScanner';
import { isMockEnabled, setMockOverride } from '@/services/fridgeApi';
import type { FridgeScanResponse } from '@/types';
import {
  Refrigerator,
  Sparkles,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Info,
  Server,
  Zap,
} from 'lucide-react';

export const App: React.FC = () => {
  const [mockActive, setMockActive] = useState<boolean>(isMockEnabled());
  const [lastResult, setLastResult] = useState<FridgeScanResponse | null>(null);
  const [isSecure, setIsSecure] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setIsSecure(window.isSecureContext || isLocal);
    }
  }, []);

  const handleToggleMock = (enabled: boolean) => {
    setMockOverride(enabled);
    setMockActive(enabled);
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4] dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors">
      {/* Thanh Header chính */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-emerald-900/10 dark:border-emerald-500/10 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Tên dự án */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-sm">
              <Refrigerator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-emerald-900 dark:text-emerald-300 tracking-tight">
                  VeggieLife
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  AI Vision Studio
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tính năng Quét tủ lạnh bằng hình ảnh
              </p>
            </div>
          </div>

          {/* Công tắc Mock API & Trạng thái bảo mật */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* Trạng thái HTTPS / Localhost */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isSecure
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isSecure ? 'Camera khả dụng (HTTPS/Local)' : 'Cần HTTPS để mở Camera'}</span>
            </div>

            {/* Công tắc Bật/Tắt Mock API */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <span className="px-2 font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <Server className="h-3.5 w-3.5 text-emerald-600" />
                API:
              </span>
              <button
                type="button"
                onClick={() => handleToggleMock(true)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  mockActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Mock Data
              </button>
              <button
                type="button"
                onClick={() => handleToggleMock(false)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  !mockActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Backend Thật
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* Banner thông tin môi trường và lưu ý Camera */}
        <div className="w-full max-w-3xl mb-6 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-emerald-600" />
              <span>Chế độ kiểm thử ({mockActive ? 'Mock API Giả Lập' : 'Backend API Thật'}):</span>
            </p>
            <p>
              Hệ thống hỗ trợ cả 2 luồng: <strong>Chụp ảnh trực tiếp từ camera</strong> và{' '}
              <strong>Tải ảnh / Kéo thả ảnh từ thiết bị</strong>. Ảnh được nén và tối ưu tự động
              trước khi truyền tải.
            </p>
          </div>
        </div>

        {/* COMPONENT TRỌNG TÂM: FRIDGE SCANNER */}
        <section aria-label="Bộ quét tủ lạnh" className="w-full flex justify-center">
          <FridgeScanner
            onSuccess={(result) => {
              setLastResult(result);
            }}
          />
        </section>

        {/* Khối xem trước JSON phản hồi từ AI dành cho lập trình viên & kiểm thử */}
        {lastResult && (
          <section className="w-full max-w-3xl mt-10 p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Dữ liệu phản hồi từ API (JSON Schema)
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mã phản hồi: {lastResult.statusCode}</span>
              </span>
            </div>

            <pre className="p-4 rounded-xl bg-gray-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-80 shadow-inner">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500">
        <p>VeggieLife — Ứng dụng ẩm thực và gợi ý thực đơn thông minh cho người ăn chay.</p>
        <p className="mt-1">
          Lưu ý kỹ thuật: Camera Web API bắt buộc hoạt động trên <code>https://</code> hoặc{' '}
          <code>http://localhost</code>.
        </p>
      </footer>
    </div>
  );
};

export default App;
