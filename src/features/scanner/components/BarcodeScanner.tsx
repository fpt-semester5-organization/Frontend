import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  SwitchCamera,
  Upload,
  Search,
  AlertCircle,
  ScanLine,
  RefreshCw,
} from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isScanningActive: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  isScanningActive,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'veggie-barcode-scanner-viewfinder';
  const hasScannedRef = useRef(false);

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Đang khởi tạo máy ảnh...');

  // Reset flag khi scanner kích hoạt lại
  useEffect(() => {
    if (isScanningActive) {
      hasScannedRef.current = false;
    }
  }, [isScanningActive]);

  // Âm thanh bip khi nhận diện thành công
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  }, []);

  const handleBarcodeFound = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean || hasScannedRef.current || !isScanningActive) return;
      hasScannedRef.current = true;
      playBeep();
      onScan(clean);
    },
    [isScanningActive, onScan, playBeep]
  );

  // Lấy danh sách camera
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Ưu tiên camera sau
          const backCam = devices.find((d) =>
            /back|rear|environment|sau/i.test(d.label)
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Lỗi lấy danh sách camera:', err);
      });
  }, []);

  // Khởi chạy camera quét mã
  useEffect(() => {
    if (!isScanningActive) return;

    let isMounted = true;
    const scanner = new Html5Qrcode(containerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    });
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        setScannerStatus('Đang mở camera...');
        const cameraConfig = selectedCameraId
          ? selectedCameraId
          : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 25,
            videoConstraints: {
              facingMode: selectedCameraId ? undefined : 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => {
            if (isMounted) {
              handleBarcodeFound(decodedText);
            }
          },
          () => {
            // Callback khi frame không phát hiện mã
          }
        );

        if (isMounted) {
          setHasCameraPermission(true);
          setScannerStatus('Đang quét mã...');
        }
      } catch (err: any) {
        console.warn('Lỗi mở camera HD, thử chế độ tương thích:', err);
        try {
          await scanner.start(
            cameraConfig,
            { fps: 20 },
            (decodedText) => {
              if (isMounted) {
                handleBarcodeFound(decodedText);
              }
            },
            () => {}
          );
          if (isMounted) {
            setHasCameraPermission(true);
            setScannerStatus('Đang quét mã...');
          }
        } catch (fallbackErr: any) {
          console.error('Lỗi khởi động camera:', fallbackErr);
          if (isMounted) {
            setHasCameraPermission(false);
            setScannerStatus('Không thể truy cập camera');
          }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch((e) => console.warn('Lỗi dừng scanner:', e));
      }
    };
  }, [isScanningActive, selectedCameraId, handleBarcodeFound]);

  // Đổi camera
  const handleToggleCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  // Quét từ file ảnh tải lên
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      // Dùng instance độc lập quét file
      const fileScanner = new Html5Qrcode('veggie-file-scanner-temp');
      const result = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      setIsProcessingFile(false);
      if (result) {
        handleBarcodeFound(result);
      }
    } catch (err) {
      setIsProcessingFile(false);
      alert('Không nhận diện được mã vạch từ ảnh này. Vui lòng chụp gần, rõ nét hoặc nhập số mã vạch bên dưới.');
    }
    e.target.value = '';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeFound(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Scanner Viewfinder Box */}
      <div className="relative w-full aspect-square max-w-[420px] bg-stone-950 rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-950/20 flex items-center justify-center">
        {/* Html5Qrcode Target Container */}
        <div id={containerId} className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

        {/* Hidden container for file scans */}
        <div id="veggie-file-scanner-temp" className="hidden" />

        {/* Top Controls Overlay */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/10">
            <ScanLine className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{scannerStatus}</span>
          </div>

          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleToggleCamera}
                title="Đổi camera"
                className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-all cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scanning Laser Beam & Guidelines across full screen */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-[320px] h-[160px] border-2 border-emerald-400/60 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.2)]">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-md" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-md" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-md" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-md" />
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-[scannerBeam_1.6s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Guidance tip on bottom */}
        <div className="absolute bottom-4 inset-x-4 flex justify-center z-10 pointer-events-none">
          <span className="text-[11px] font-semibold text-white drop-shadow-md bg-black/60 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/20">
            Để mã vạch ở bất kỳ đâu trong khung hình (cách 15 - 25cm)
          </span>
        </div>

        {/* Camera Permission Alert */}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 bg-stone-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-20">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <h4 className="text-base font-bold">Chưa cấp quyền máy ảnh</h4>
            <p className="text-xs text-gray-300 mt-1 max-w-xs leading-relaxed">
              Vui lòng cho phép quyền truy cập camera trên thanh địa chỉ của trình duyệt hoặc sử dụng tính năng tải ảnh / nhập mã thủ công bên dưới.
            </p>
          </div>
        )}

        {/* Processing Image Indicator */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white z-20">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <span className="text-xs font-medium">Đang đọc mã vạch từ ảnh...</span>
          </div>
        )}
      </div>

      {/* Alternative Input Methods */}
      <div className="w-full mt-6 space-y-4">
        {/* Manual Barcode Input Form */}
        <form onSubmit={handleManualSubmit} className="relative flex items-center w-full">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Hoặc nhập dãy số mã vạch (ví dụ: 737628064502, 5449000000996)..."
            className="w-full pl-4 pr-24 py-3 rounded-full border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#133e2e] focus:ring-2 focus:ring-[#133e2e]/15 outline-none transition-all shadow-xs"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="absolute right-1.5 px-4 py-2 rounded-full bg-[#133e2e] hover:bg-[#0c281e] text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>Tra cứu</span>
          </button>
        </form>

        {/* Upload Image Option */}
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-[#133e2e] cursor-pointer py-1.5 px-3 rounded-lg hover:bg-gray-100/80 transition-colors">
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Tải ảnh chụp sản phẩm từ thiết bị</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
