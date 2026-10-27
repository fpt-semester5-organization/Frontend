import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type {
  ScannerState,
  SelectedImageInfo,
  FridgeScanResponse,
  UploadProgressInfo,
  FridgeScannerProps,
} from '@/types';
import { CameraCapture } from './CameraCapture';
import { ImagePreview } from './ImagePreview';
import { UploadProgress } from './UploadProgress';
import {
  resizeAndCompressImage,
  validateImageFile,
  getImageDimensions,
  validateImageDimensions,
} from '@/utils/imageUtils';
import { uploadFridgeImage } from '@/services/fridgeApi';

export const FridgeScanner: React.FC<FridgeScannerProps> = ({
  onSuccess,
  onError,
  onClose,
  className = '',
}) => {
  // State Machine: idle → camera → preview → uploading → success | error
  const [state, setState] = useState<ScannerState>('idle');

  // Thông tin ảnh hiện tại
  const [currentImage, setCurrentImage] = useState<SelectedImageInfo | null>(null);

  // Tiến trình upload
  const [progress, setProgress] = useState<UploadProgressInfo>({
    percentage: 0,
    phase: 'compressing',
    phaseLabel: 'Chuẩn bị dữ liệu...',
  });

  // Kết quả quét thành công
  const [scanResult, setScanResult] = useState<FridgeScanResponse | null>(null);

  // Lỗi khi upload
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Lỗi khi validate ảnh chọn từ máy
  const [validationError, setValidationError] = useState<string | null>(null);

  // Trạng thái kéo thả tệp vào khung
  const [isDragging, setIsDragging] = useState(false);

  // Quản lý hủy request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref tới input file ẩn để kích hoạt bằng nút "Chọn ảnh tủ lạnh"
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Dọn dẹp object URL khi đổi ảnh hoặc unmount
  useEffect(() => {
    return () => {
      if (currentImage?.previewUrl) {
        try {
          URL.revokeObjectURL(currentImage.previewUrl);
        } catch {
          // Bỏ qua lỗi dọn dẹp
        }
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentImage]);

  /**
   * Reset về trạng thái idle ban đầu
   */
  const handleResetToIdle = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentImage?.previewUrl) {
      URL.revokeObjectURL(currentImage.previewUrl);
    }
    setCurrentImage(null);
    setScanResult(null);
    setUploadError(null);
    setValidationError(null);
    setIsDragging(false);
    setProgress({ percentage: 0, phase: 'compressing', phaseLabel: 'Chuẩn bị dữ liệu...' });
    setState('idle');
  }, [currentImage]);

  /**
   * Chuyển sang màn hình Camera
   */
  const handleStartCamera = () => {
    setUploadError(null);
    setValidationError(null);
    setState('camera');
  };

  /**
   * Xử lý khi ảnh được chọn (từ Camera hoặc Tải lên)
   */
  const handleImageReady = (imageInfo: SelectedImageInfo) => {
    if (currentImage?.previewUrl && currentImage.previewUrl !== imageInfo.previewUrl) {
      URL.revokeObjectURL(currentImage.previewUrl);
    }
    setCurrentImage(imageInfo);
    setUploadError(null);
    setValidationError(null);
    setState('preview');
  };

  /**
   * Kiểm tra và nạp tệp ảnh người dùng chọn hoặc thả vào khung
   */
  const handleProcessPickedFile = async (file: File) => {
    setValidationError(null);

    // 1. Kiểm tra định dạng & dung lượng <= 10MB
    const basicValidation = validateImageFile(file);
    if (!basicValidation.isValid) {
      setValidationError(basicValidation.errorMessage || 'Tệp ảnh không hợp lệ.');
      return;
    }

    try {
      // 2. Kiểm tra độ phân giải tối thiểu 640×480 px
      const dimensions = await getImageDimensions(file);
      const dimensionValidation = validateImageDimensions(dimensions);
      if (!dimensionValidation.isValid) {
        setValidationError(dimensionValidation.errorMessage || 'Độ phân giải ảnh quá nhỏ.');
        return;
      }

      // 3. Tạo Object URL và chuyển sang màn hình Preview
      const previewUrl = URL.createObjectURL(file);
      handleImageReady({
        file,
        blob: file,
        previewUrl,
        name: file.name,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        source: 'upload',
        mimeType: file.type || 'image/jpeg',
      });
    } catch (err) {
      console.error('Lỗi khi đọc file ảnh:', err);
      setValidationError(err instanceof Error ? err.message : 'Không thể đọc thông tin ảnh.');
    }
  };

  // Kéo thả tệp vào khung
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      void handleProcessPickedFile(droppedFile);
    }
  };

  /**
   * Bắt đầu quá trình nén và Upload ảnh
   */
  const handleStartUpload = async () => {
    if (!currentImage) return;

    setState('uploading');
    setUploadError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Tối ưu & Resize ảnh phía client (cạnh dài tối đa 1600px, JPEG 0.85)
      setProgress({
        percentage: 10,
        phase: 'compressing',
        phaseLabel: 'Đang nén & tối ưu hóa ảnh phía trình duyệt...',
      });

      const { blob: compressedBlob } = await resizeAndCompressImage(currentImage.blob, {
        maxDimension: 1600,
        quality: 0.85,
      });

      // 2. Gửi ảnh lên server bằng multipart/form-data
      const result = await uploadFridgeImage(compressedBlob, {
        signal: controller.signal,
        onProgress: (info) => {
          setProgress(info);
        },
      });

      // 3. Hoàn thành thành công
      setScanResult(result);
      setState('success');
      if (currentImage) {
        onSuccess?.(result, currentImage);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('preview');
        return;
      }

      console.error('Lỗi khi quét ảnh tủ lạnh:', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Không thể phân tích ảnh tủ lạnh. Vui lòng kiểm tra lại kết nối mạng.';
      setUploadError(errMsg);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(errMsg));
    } finally {
      abortControllerRef.current = null;
    }
  };

  /**
   * Hủy quá trình upload đang chạy
   */
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('preview');
  };

  // ==========================================
  // RENDER THEO TỪNG TRẠNG THÁI (STATE MACHINE)
  // ==========================================

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm transition-all ${className}`}
    >
      {/* HEADER: AI Vision Studio & Gemini 2.5 Flash Vision */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40 mb-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[24px] text-primary" aria-hidden="true">
            center_focus_strong
          </span>
          <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
            AI Vision Studio
          </h2>
        </div>
        <span className="font-label-sm text-xs sm:text-sm font-medium text-on-surface-variant text-gray-500 dark:text-gray-400">
          Gemini 2.5 Flash Vision
        </span>
      </div>

      {/* 1. MÀN HÌNH IDLE: FORM UI CŨ VỚI 2 NÚT NẰM CẠNH NHAU TRONG 1 KHUNG */}
      {state === 'idle' && (
        <div>
          {/* Khung viền nét đứt: Vùng Drag & Drop + 2 nút thao tác */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all ${
              isDragging
                ? 'border-primary bg-primary-fixed/20'
                : 'border-outline-variant/60 bg-surface-container-low hover:border-outline'
            }`}
          >
            <div className="flex flex-col items-center gap-3 py-6">
              {/* Icon ô vuông bo góc màu xanh nhạt */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf3ec] dark:bg-emerald-950/60 text-[#2d5a38] dark:text-emerald-300 shadow-xs">
                <span className="material-symbols-outlined text-[36px]" aria-hidden="true">
                  add_photo_alternate
                </span>
              </div>

              {/* Dòng tiêu đề chính */}
              <div>
                <h3 className="font-headline-sm text-base sm:text-lg font-semibold text-on-surface text-gray-900 dark:text-gray-100">
                  Kéo thả ảnh tủ lạnh vào đây hoặc bấm để chọn tệp
                </h3>
                {/* Dòng hướng dẫn quy cách tệp */}
                <p className="mt-1 font-body-sm text-xs sm:text-sm text-on-surface-variant text-gray-500 dark:text-gray-400">
                  Hỗ trợ JPG, PNG, WEBP · Tối thiểu <strong>640×480 px</strong> · Tối đa 10 MB
                </p>
              </div>

              {/* 2 NÚT NẰM CẠNH NHAU TRONG CÙNG 1 KHUNG */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {/* NÚT 1: CHỤP ẢNH NGAY */}
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2d5a38]/40"
                  aria-label="Mở máy ảnh chụp trực tiếp"
                >
                  <Camera className="w-5 h-5" aria-hidden="true" />
                  <span>Chụp ảnh ngay</span>
                </button>

                {/* NÚT 2: CHỌN ẢNH TỦ LẠNH (NẰM NGAY BÊN CẠNH) */}
                <button
                  type="button"
                  onClick={() => hiddenFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2d5a38]/40"
                  aria-label="Chọn ảnh tủ lạnh từ thiết bị"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    photo_camera
                  </span>
                  <span>Chọn ảnh tủ lạnh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Báo lỗi nếu chọn ảnh sai định dạng/kích thước */}
          {validationError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Ảnh không đạt yêu cầu:</p>
                <p className="mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          {/* Input file ẩn phục vụ nút "Chọn ảnh tủ lạnh" */}
          <input
            ref={hiddenFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleProcessPickedFile(file);
              }
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* 2. MÀN HÌNH CAMERA: MỞ MÁY ẢNH TRỰC TIẾP TRONG KHUNG */}
      {state === 'camera' && (
        <div className="py-2">
          <CameraCapture
            onCapture={handleImageReady}
            onCancel={handleResetToIdle}
            onSwitchToUpload={() => {
              handleResetToIdle();
              hiddenFileInputRef.current?.click();
            }}
          />
        </div>
      )}

      {/* 3. MÀN HÌNH PREVIEW: XEM LẠI ẢNH ĐÃ CHỤP/CHỌN */}
      {state === 'preview' && currentImage && (
        <div className="py-2">
          <ImagePreview
            imageInfo={currentImage}
            onConfirm={handleStartUpload}
            onRetake={() => {
              if (currentImage.source === 'camera') {
                setState('camera');
              } else {
                handleResetToIdle();
                hiddenFileInputRef.current?.click();
              }
            }}
          />
        </div>
      )}

      {/* 4. MÀN HÌNH UPLOADING: TIẾN TRÌNH NÉN VÀ TẢI LÊN */}
      {state === 'uploading' && (
        <div className="py-6">
          <UploadProgress progress={progress} onCancel={handleCancelUpload} />
        </div>
      )}

      {/* 5. MÀN HÌNH SUCCESS: KẾT QUẢ NHẬN DIỆN NGUYÊN LIỆU */}
      {state === 'success' && scanResult && (
        <div className="p-4 sm:p-6 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="text-left">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                Nhận diện tủ lạnh thành công!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI đã phát hiện {scanResult.data.detected.length} nguyên liệu thực phẩm.
              </p>
            </div>
          </div>

          {/* Cảnh báo độ tươi nếu có */}
          {scanResult.data.warnings && scanResult.data.warnings.length > 0 && (
            <div className="w-full mb-4 p-4 rounded-2xl border border-[#f8dfbe] bg-[#fefbf6] text-[#8a4e0a] shadow-xs flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-[#b76e1a] shrink-0 mt-0.5" />
              <div className="text-sm text-[#734008]">
                <span className="font-semibold">Lưu ý quan trọng: </span>
                {scanResult.data.warnings.join(' ')}
              </div>
            </div>
          )}

          {/* HÌNH ẢNH TỦ LẠNH HIỂN THỊ LUÔN SAU KHI AI QUÉT RA */}
          {currentImage?.previewUrl && (
            <div className="relative my-4 flex min-h-[340px] max-h-[580px] w-full items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/60 bg-[#f4efe8] dark:bg-surface-container p-3 sm:p-5 shadow-inner">
              <div className="relative inline-flex max-h-full max-w-full items-center justify-center">
                <img
                  src={currentImage.previewUrl}
                  alt="Ảnh tủ lạnh đã nhận diện AI"
                  className="max-h-[520px] w-auto max-w-full rounded-xl object-contain shadow-md"
                />
                {/* Lớp phủ Bounding Boxes khoanh vùng từng nguyên liệu trên ảnh tủ lạnh */}
                <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
                  {scanResult.data.detected.map((item, idx) => {
                    if (!item.box2d) return null;
                    const [ymin, xmin, ymax, xmax] = item.box2d;
                    const top = ymin / 10;
                    const left = xmin / 10;
                    const height = (ymax - ymin) / 10;
                    const width = (xmax - xmin) / 10;
                    const isFresh = item.freshnessStatus === 'FRESH';
                    return (
                      <div
                        key={idx}
                        style={{
                          top: `${top}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                        }}
                        className={`absolute border-2 rounded-md ${
                          isFresh ? 'border-[#3d5c47] bg-[#3d5c47]/15' : 'border-[#94532f] bg-[#94532f]/20'
                        }`}
                      >
                        <span
                          className={`absolute -top-6 left-0 text-[11px] font-bold px-1.5 py-0.5 rounded shadow-xs text-white whitespace-nowrap ${
                            isFresh ? 'bg-[#3d5c47]' : 'bg-[#94532f]'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Danh sách nguyên liệu nhận diện */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[320px] overflow-y-auto pr-1">
            {scanResult.data.detected.map((item, index) => {
              const isFresh = item.freshnessStatus === 'FRESH';
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </p>
                      {item.foodGroup && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.foodGroup}</p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isFresh
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isFresh ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    />
                    {isFresh ? 'Tươi ngon' : 'Cần dùng sớm'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nút hành động */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetToIdle}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Quét thêm ảnh khác</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white font-semibold text-sm shadow-md transition-colors"
              >
                <span>Xem tủ lạnh & nấu ăn</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. MÀN HÌNH ERROR: BÁO LỖI VÀ THỬ LẠI */}
      {state === 'error' && (
        <div role="alert" className="p-6 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="h-14 w-14 mb-3 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            Không thể phân tích ảnh tủ lạnh
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 bg-red-50/70 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-900/60 w-full">
            {uploadError || 'Đã có lỗi xảy ra trong quá trình nhận diện ảnh.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={handleStartUpload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white text-sm font-semibold shadow-md active:scale-95 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Thử lại</span>
            </button>

            <button
              type="button"
              onClick={handleResetToIdle}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span>Chọn ảnh khác</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
