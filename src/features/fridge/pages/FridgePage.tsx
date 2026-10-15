import React, { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { QUOTA } from '@/constants/quota';
import { apiErrorMessage } from '@/api/http';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { selectIsAuthenticated, selectIsVip, useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { toast, useUiStore } from '@/stores/ui.store';
import { AddItemModal } from '../components/AddItemModal';
import { EditItemModal } from '../components/EditItemModal';
import { EditDetectedItemModal } from '../components/EditDetectedItemModal';
import { FreshnessBadge } from '../components/FreshnessBadge';
import {
  useDeleteFridgeItem,
  useFridgeDetection,
  useFridgeItems,
  useRecipeSuggestions,
} from '../hooks/useFridge';
import { compressImage } from '../lib/compressImage';
import { readImageSize } from '../lib/readImageSize';
import { checkImageDimensions, checkImageFile } from '../schemas/fridge.schema';
import type {
  DetectedItem,
  DetectionQuota,
  DetectionResult,
  Freshness,
  FridgeItem,
  ImageOptimizationResult,
} from '../types/fridge.types';

const FILTERS: { key: Freshness | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FRESH', label: 'FRESH · Còn tươi' },
  { key: 'NON-FRESH', label: 'NON-FRESH · Dùng sớm' },
];

export const FridgePage: React.FC = () => {
  const authed = useAuthStore(selectIsAuthenticated);
  const vip = useAuthStore(selectIsVip);
  const guestAiLeft = useGuestStore((s) => s.quota?.ai.remaining);
  const openSignupPrompt = useUiStore((s) => s.openSignupPrompt);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái chọn và nén ảnh
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<ImageOptimizationResult | null>(null);

  // Trạng thái kết quả nhận diện AI
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [editingDetectedIndex, setEditingDetectedIndex] = useState<number | null>(null);
  const [memberQuota, setMemberQuota] = useState<DetectionQuota | null>(null);
  const [serverError, setServerError] = useState<{ message: string; isTooSmall: boolean } | null>(null);

  // Trạng thái kho tủ lạnh ảo
  const [filter, setFilter] = useState<Freshness | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FridgeItem | null>(null);

  // Hooks dữ liệu
  const detectMutation = useFridgeDetection();
  const itemsQuery = useFridgeItems(filter === 'ALL' ? undefined : filter);
  const allItemsQuery = useFridgeItems();
  const deleteMutation = useDeleteFridgeItem();

  const hasItems = (allItemsQuery.data?.length ?? 0) > 0;
  const suggestionsQuery = useRecipeSuggestions(hasItems);

  // Quản lý URL xem trước ảnh
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Xử lý khi người dùng chọn hoặc thả tệp ảnh
  const handleFilePick = async (file: File | undefined) => {
    setDetectionResult(null);
    setDetectedItems([]);
    setServerError(null);
    setCompressionResult(null);

    if (!file) return;

    // 1. Kiểm tra định dạng cơ bản & dung lượng tối đa (10 MB)
    const basicErr = checkImageFile(file);
    if (basicErr) {
      setSelectedFile(null);
      setImageError(basicErr);
      return;
    }

    // 2. Đọc độ phân giải thực tế của ảnh
    const dimensions = await readImageSize(file);
    if (!dimensions) {
      setSelectedFile(null);
      setImageError('Không thể giải mã tệp ảnh. Vui lòng chọn một tệp hình ảnh hợp lệ.');
      return;
    }

    // 3. Kiểm tra độ phân giải tối thiểu 640×480 - Báo lỗi thân thiện nếu ảnh quá nhỏ!
    const dimensionErr = checkImageDimensions(dimensions.width, dimensions.height);
    if (dimensionErr) {
      setSelectedFile(null);
      setImageError(dimensionErr);
      return;
    }

    setImageError(null);

    // 4. Tự động thu nhỏ ảnh lớn trước khi gửi
    setIsCompressing(true);
    try {
      const optimization = await compressImage(file, {
        maxDimension: 1920,
        maxFileSizeBytes: 1.5 * 1024 * 1024, // 1.5 MB
        quality: 0.85,
      });

      setCompressionResult(optimization);
      setSelectedFile(optimization.file);
    } catch {
      setSelectedFile(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    void handleFilePick(droppedFile);
  };

  // Gửi ảnh lên AI server để nhận diện
  const handleAnalyze = () => {
    if (!selectedFile || detectMutation.isPending || isCompressing) return;
    setServerError(null);

    detectMutation.mutate(selectedFile, {
      onSuccess: (res) => {
        setDetectionResult(res);
        setDetectedItems(res.detected);
        if (authed && res.quota) {
          setMemberQuota(res.quota);
        }
        if (res.saved) {
          toast.success(`Đã nhận diện thành công ${res.detected.length} nguyên liệu và lưu vào tủ lạnh ảo!`);
        } else {
          toast.info(`Đã nhận diện ${res.detected.length} nguyên liệu (kết quả dùng thử không lưu).`);
        }
      },
      onError: (err) => {
        const apiErr = toApiError(err);

        // Báo lỗi thân thiện khi ảnh quá nhỏ từ server (ERR_FRIDGE_IMAGE_TOO_SMALL)
        if (apiErr.errorCode === 'ERR_FRIDGE_IMAGE_TOO_SMALL') {
          setServerError({
            isTooSmall: true,
            message:
              'Độ phân giải ảnh chưa đạt chuẩn tối thiểu 640×480 pixels. Bạn hãy chụp gần hơn, đủ ánh sáng và rõ nét hơn để AI nhận diện nguyên liệu tốt nhất nhé!',
          });
          return;
        }

        if (apiErr.errorCode === 'ERR_MEDIA_FILE_TOO_LARGE') {
          setImageError('Ảnh vượt quá dung lượng tối đa 10 MB. Vui lòng chọn ảnh nhỏ hơn.');
          return;
        }

        if (apiErr.errorCode === 'ERR_QUOTA_AI_EXCEEDED') {
          if (!authed) openSignupPrompt('quota');
          else toast.warning('Bạn đã dùng hết hạn mức nhận diện ảnh hôm nay.');
          return;
        }

        setServerError({
          isTooSmall: false,
          message: apiErrorMessage(err, 'Dịch vụ AI nhận diện đang gián đoạn, vui lòng thử lại.'),
        });
      },
    });
  };

  // Sửa tay nguyên liệu AI nhận diện được
  const handleSaveDetectedEdit = (idx: number, updatedItem: DetectedItem) => {
    setDetectedItems((prev) => {
      const copy = [...prev];
      copy[idx] = updatedItem;
      return copy;
    });
    toast.success(`Đã cập nhật “${updatedItem.name}” (${updatedItem.freshnessStatus})`);
  };

  // Xóa thủ công một nguyên liệu trong kết quả nhận diện
  const handleRemoveDetected = (idx: number) => {
    setDetectedItems((prev) => prev.filter((_, i) => i !== idx));
    toast.info('Đã xóa nguyên liệu khỏi danh sách nhận diện.');
  };

  // Lọc và sắp xếp kho tủ lạnh ảo (ưu tiên mục NON-FRESH xếp trước)
  const visibleItems = useMemo(() => {
    const list = itemsQuery.data ?? [];
    const query = searchQuery.trim().toLowerCase();

    const filtered = query ? list.filter((i) => i.name.toLowerCase().includes(query)) : list;

    // Sắp xếp: NON-FRESH đứng trước để người dùng ưu tiên xử lý sớm
    return [...filtered].sort((a, b) => {
      if (a.freshnessStatus === b.freshnessStatus) return a.name.localeCompare(b.name);
      return a.freshnessStatus === 'NON-FRESH' ? -1 : 1;
    });
  }, [itemsQuery.data, searchQuery]);

  // Hạn mức hiển thị
  const imageLimit = vip ? QUOTA.fridgeImagesPerDay.vip : QUOTA.fridgeImagesPerDay.free;

  // Xóa nguyên liệu khỏi tủ lạnh ảo
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const target = deletingItem;

    deleteMutation.mutate(target.inventoryId, {
      onSuccess: () => {
        toast.success(`Đã xóa “${target.name}” khỏi tủ lạnh`);
        setDeletingItem(null);
      },
      onError: (err) => {
        setDeletingItem(null);
        toast.error(apiErrorMessage(err, 'Không thể xóa nguyên liệu'));
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-margin-mobile py-space-lg sm:px-margin">
      {/* Tiêu đề & Thanh trạng thái hạn mức */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant/40 pb-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Icon name="kitchen" className="text-[26px]" />
            </span>
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
              Tủ Lạnh Ảo &amp; Nhận Diện Nguyên Liệu AI
            </h1>
          </div>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Chụp hoặc tải ảnh tủ lạnh để AI tự động nhận diện nguyên liệu chay, theo dõi độ tươi và gợi ý món ngon giải cứu.
          </p>
        </div>

        {/* Khối hiển thị hạn mức còn lại */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-on-surface"
            aria-live="polite"
          >
            <Icon name="speed" className="text-[20px] text-primary" />
            <div className="font-label-md text-label-md">
              {authed ? (
                memberQuota ? (
                  <span>
                    Ảnh hôm nay: Còn <strong className="text-primary">{memberQuota.remaining}</strong>/
                    {memberQuota.limit} lượt (Đã dùng {memberQuota.used})
                  </span>
                ) : (
                  <span>
                    Hạn mức quét ảnh: Tối đa <strong className="text-primary">{imageLimit} ảnh/ngày</strong>{' '}
                    ({vip ? 'Gói VIP' : 'Miễn phí'})
                  </span>
                )
              ) : typeof guestAiLeft === 'number' ? (
                <span>
                  Lượt AI dùng thử: Còn <strong className="text-amber-700 dark:text-amber-400">{guestAiLeft}</strong>/
                  {QUOTA.guest.ai} lượt (Khách)
                </span>
              ) : (
                <span>
                  Khách vãng lai: Có <strong className="text-amber-700 dark:text-amber-400">{QUOTA.guest.ai} lượt</strong> AI dùng thử
                </span>
              )}
            </div>
          </div>

          {authed && (
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="add_circle" className="text-[18px]" />
              Thêm thủ công
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2"
          >
            <Icon name="photo_camera" className="text-[20px]" />
            Quét ảnh tủ lạnh
          </Button>
        </div>
      </header>

      {/* Bố cục 2 cột chính */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI: AI Vision Studio & Danh sách tủ lạnh (7 cột) */}
        <section className="flex flex-col gap-6 lg:col-span-7">
          {/* 1. KHU VỰC TẢI ẢNH VÀ NHẬN DIỆN */}
          <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <Icon name="center_focus_strong" className="text-[22px] text-primary" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">AI Vision Studio</h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Gemini 2.5 Flash Vision
              </span>
            </div>

            {/* Vùng Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary-fixed/20'
                  : 'border-outline-variant/60 bg-surface-container-low hover:border-outline'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Chọn ảnh tủ lạnh"
                onChange={(e) => {
                  void handleFilePick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
                {/* Xem trước ảnh */}
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-highest shadow-inner md:col-span-5">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Ảnh tủ lạnh đã chọn"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-4 text-on-surface-variant">
                      <Icon name="add_photo_alternate" className="text-[44px] text-outline" />
                      <span className="font-label-sm text-xs text-outline">Chưa có ảnh</span>
                    </div>
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white backdrop-blur-xs">
                      <span className="font-label-sm text-sm">Đang tối ưu ảnh...</span>
                    </div>
                  )}
                </div>

                {/* Thông tin & nút thao tác */}
                <div className="flex flex-col items-center px-2 text-center md:col-span-7 md:items-start md:text-left">
                  <h3 className="font-headline-sm text-[16px] font-semibold text-on-surface">
                    {selectedFile ? selectedFile.name : 'Kéo thả ảnh tủ lạnh hoặc chụp camera'}
                  </h3>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    Hỗ trợ JPG, PNG, WEBP · Tối thiểu <strong>640×480 px</strong> · Tối đa 10 MB
                  </p>

                  {/* Thông báo tự động thu nhỏ / nén ảnh thành công */}
                  {compressionResult?.wasCompressed && (
                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Icon name="bolt" className="text-[16px] text-emerald-600" />
                      <span>
                        Tự động nén ảnh: {(compressionResult.originalSize / (1024 * 1024)).toFixed(1)} MB →{' '}
                        {(compressionResult.compressedSize / 1024).toFixed(0)} KB (giảm {compressionResult.reductionPercentage}%)
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      {selectedFile ? 'Chọn ảnh khác' : 'Chọn tệp ảnh'}
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAnalyze}
                      disabled={!selectedFile || detectMutation.isPending || isCompressing}
                      loading={detectMutation.isPending}
                    >
                      <Icon name="auto_awesome" className="text-[18px]" />
                      {detectMutation.isPending ? 'AI đang nhận diện…' : 'Nhận diện nguyên liệu'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Báo lỗi thân thiện nếu ảnh quá nhỏ hoặc sai định dạng */}
            {imageError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
              >
                <Icon name="warning" className="shrink-0 text-[22px] text-red-600" />
                <div className="flex-1 font-body-sm text-body-sm">
                  <p className="font-semibold">Ảnh không đạt yêu cầu:</p>
                  <p className="mt-0.5">{imageError}</p>
                </div>
              </div>
            )}

            {/* Báo lỗi thân thiện từ máy chủ (Bao gồm lỗi ảnh quá nhỏ ERR_FRIDGE_IMAGE_TOO_SMALL) */}
            {serverError && (
              <div
                role="alert"
                className={`mt-4 flex items-start gap-3 rounded-xl border p-4 font-body-sm text-body-sm ${
                  serverError.isTooSmall
                    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                    : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200'
                }`}
              >
                <Icon
                  name={serverError.isTooSmall ? 'photo_size_select_small' : 'cloud_off'}
                  className={`shrink-0 text-[22px] ${serverError.isTooSmall ? 'text-amber-600' : 'text-red-600'}`}
                />
                <div className="flex-1">
                  <p className="font-semibold">
                    {serverError.isTooSmall ? 'Ảnh chưa đủ độ phân giải chuẩn' : 'Thông báo từ máy chủ'}
                  </p>
                  <p className="mt-0.5">{serverError.message}</p>
                  {serverError.isTooSmall && (
                    <p className="mt-1 text-xs opacity-80">
                      💡 Mẹo: Hãy chụp thẳng góc từ khoảng cách 0.5 – 1 mét, đảm bảo ánh sáng đủ rõ để AI phân tách được từng loại rau củ.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Hiệu ứng loading khi AI đang xử lý */}
            {detectMutation.isPending && (
              <div
                className="mt-5 flex items-center justify-center gap-3 rounded-xl bg-surface-container-low p-6 text-on-surface"
                role="status"
                aria-live="polite"
              >
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                <span className="font-label-md text-label-md">
                  Gemini Vision đang phân tích hình ảnh, nhận diện rau củ và ước lượng độ tươi...
                </span>
              </div>
            )}

            {/* KẾT QUẢ NHẬN DIỆN CÓ THỂ SỬA TAY */}
            {detectionResult && !detectMutation.isPending && (
              <div className="mt-6 border-t border-outline-variant/40 pt-5" aria-label="Kết quả nhận diện">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-[17px] font-semibold text-on-surface">
                      Đã nhận diện {detectedItems.length} nguyên liệu
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold ${
                        detectionResult.saved
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {detectionResult.saved ? '✓ Đã lưu vào tủ lạnh ảo' : 'Kết quả dùng thử (Chưa lưu)'}
                    </span>
                  </div>

                  <span className="font-body-sm text-xs text-on-surface-variant">
                    💡 Bạn có thể bấm “Sửa tay” để chỉnh tên hoặc độ tươi
                  </span>
                </div>

                {detectedItems.length === 0 ? (
                  <div className="rounded-xl bg-surface-container-low p-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                    AI không tìm thấy nguyên liệu thực vật nào trong ảnh. Bạn hãy thử chụp rõ nét và đủ ánh sáng hơn.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {detectedItems.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-2.5 transition-all hover:bg-surface-container"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            name={item.freshnessStatus === 'FRESH' ? 'eco' : 'hourglass_bottom'}
                            className={`text-[20px] ${
                              item.freshnessStatus === 'FRESH' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          />
                          <span className="font-body-md text-body-md font-semibold text-on-surface">
                            {item.name}
                          </span>
                          <FreshnessBadge status={item.freshnessStatus} size="sm" />
                        </div>

                        {/* Các nút chỉnh sửa tay */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => setEditingDetectedIndex(idx)}
                            title="Sửa tay tên hoặc độ tươi"
                          >
                            <Icon name="edit" className="text-[15px]" />
                            <span>Sửa tay</span>
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDetected(idx)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-highest hover:text-red-600"
                            title="Bỏ nguyên liệu này"
                            aria-label={`Xóa ${item.name}`}
                          >
                            <Icon name="close" className="text-[18px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cảnh báo từ AI (nếu phát hiện thịt động vật hoặc vi phạm trường phái) */}
                {detectionResult.warnings && detectionResult.warnings.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon name="notification_important" className="text-[20px] text-amber-600" />
                      <span>Lưu ý cảnh báo từ AI:</span>
                    </div>
                    <ul className="mt-1 list-disc pl-5 font-body-sm text-body-sm">
                      {detectionResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hướng dẫn cho Khách */}
                {!authed && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-fixed/30 p-3.5 text-on-surface">
                    <p className="font-body-sm text-body-sm">
                      Kết quả của Khách chỉ để xem thử. Đăng ký tài khoản để tự động lưu nguyên liệu vào tủ lạnh ảo!
                    </p>
                    <Link
                      to={PATHS.AUTH.REGISTER}
                      className="ml-3 shrink-0 rounded-lg bg-primary px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary no-underline hover:bg-primary/90"
                    >
                      Đăng ký ngay
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. DANH SÁCH NGUYÊN LIỆU TRONG TỦ LẠNH ẢO (Thành viên) */}
          <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Kho Tủ Lạnh Của Bạn</h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  {allItemsQuery.data?.length ?? 0} nguyên liệu đang được lưu trữ
                </p>
              </div>

              {authed && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-44">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm trong tủ..."
                      className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low py-1.5 pl-8 pr-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Icon
                      name="search"
                      className="absolute left-2.5 top-2 text-[18px] text-on-surface-variant"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Các tab lọc độ tươi */}
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Lọc theo độ tươi">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-xl px-3.5 py-1.5 font-label-sm text-label-sm transition-all ${
                    filter === f.key
                      ? 'bg-primary font-semibold text-on-primary shadow-xs'
                      : 'border border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Trạng thái chưa đăng nhập */}
            {!authed ? (
              <div className="flex flex-col items-center gap-2.5 rounded-xl bg-surface-container-low p-8 text-center">
                <Icon name="lock" className="text-[44px] text-outline" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Kho tủ lạnh ảo dành cho thành viên
                </h3>
                <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
                  Đăng nhập hoặc đăng ký tài khoản để lưu nguyên liệu, theo dõi hạn sử dụng độ tươi và nhận công thức giải cứu nguyên liệu sắp hỏng.
                </p>
                <Link
                  to={PATHS.AUTH.LOGIN}
                  className="mt-2 rounded-xl bg-primary px-5 py-2 font-label-md text-label-md text-on-primary no-underline hover:bg-primary/90"
                >
                  Đăng nhập / Đăng ký
                </Link>
              </div>
            ) : itemsQuery.isPending ? (
              <div className="flex flex-col gap-3" role="status" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container" />
                ))}
              </div>
            ) : itemsQuery.isError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-center text-red-900">
                <p className="font-semibold">Không thể tải danh sách tủ lạnh:</p>
                <p className="mt-1 font-body-sm text-body-sm">{apiErrorMessage(itemsQuery.error)}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => void itemsQuery.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-low p-8 text-center">
                <Icon name="kitchen" className="text-[44px] text-outline" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {searchQuery || filter !== 'ALL'
                    ? 'Không có nguyên liệu phù hợp với bộ lọc'
                    : 'Tủ lạnh của bạn đang trống'}
                </h3>
                <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
                  Hãy chụp ảnh tủ lạnh bằng AI hoặc thêm thủ công nguyên liệu để bắt đầu theo dõi độ tươi và nhận gợi ý món ngon!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Icon name="add" className="text-[18px]" />
                  Thêm nguyên liệu ngay
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {visibleItems.map((item) => (
                  <div
                    key={item.inventoryId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5 transition-all hover:border-outline-variant hover:bg-surface-container"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          item.freshnessStatus === 'FRESH'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        <Icon
                          name={item.freshnessStatus === 'FRESH' ? 'eco' : 'hourglass_bottom'}
                          className="text-[22px]"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-body-md text-body-md font-semibold text-on-surface">
                            {item.name}
                          </h4>
                          <FreshnessBadge status={item.freshnessStatus} size="sm" />
                        </div>
                        {item.freshnessStatus === 'NON-FRESH' && (
                          <p className="mt-0.5 font-label-sm text-xs font-medium text-amber-700 dark:text-amber-400">
                            Cần ưu tiên chế biến sớm
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        title="Chỉnh sửa tên hoặc độ tươi"
                        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary"
                        aria-label={`Chỉnh sửa ${item.name}`}
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        title="Xóa khỏi tủ lạnh"
                        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-red-600"
                        aria-label={`Xóa ${item.name}`}
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CỘT PHẢI: GỢI Ý MÓN "GIẢI CỨU TỦ LẠNH" (5 cột - FN-VIS-03) */}
        <section className="flex flex-col gap-6 lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Icon name="lightbulb" className="text-[22px]" />
              </span>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Giải Cứu Tủ Lạnh
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Gợi ý công thức đạt độ khớp nguyên liệu ≥ 70%
                </p>
              </div>
            </div>

            {!authed ? (
              <div className="rounded-xl bg-surface-container-low p-5 text-center font-body-sm text-body-sm text-on-surface-variant">
                Đăng nhập để nhận gợi ý món chay phù hợp với các nguyên liệu đang có trong tủ lạnh của bạn.
              </div>
            ) : !hasItems ? (
              <div className="rounded-xl bg-surface-container-low p-5 text-center font-body-sm text-body-sm text-on-surface-variant">
                Tủ lạnh hiện chưa có nguyên liệu nào. Hãy quét ảnh hoặc thêm nguyên liệu để nhận gợi ý món ngon!
              </div>
            ) : suggestionsQuery.isPending ? (
              <div className="flex flex-col gap-3" role="status" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-container" />
                ))}
              </div>
            ) : suggestionsQuery.isError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
                <p className="font-semibold text-sm">Không thể tải gợi ý món:</p>
                <p className="mt-1 font-body-sm text-xs">{apiErrorMessage(suggestionsQuery.error)}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => void suggestionsQuery.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : (suggestionsQuery.data ?? []).length === 0 ? (
              <div className="rounded-xl bg-surface-container-low p-5 text-center font-body-sm text-body-sm text-on-surface-variant">
                Chưa tìm thấy công thức nào đạt độ tương đồng nguyên liệu ≥ 70%. Hãy thử thêm một vài nguyên liệu phổ biến khác!
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {(suggestionsQuery.data ?? []).map((suggestion) => (
                  <div
                    key={suggestion.recipeId}
                    className="flex flex-col gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 transition-all hover:border-outline hover:bg-surface-container"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-body-md text-[16px] font-bold text-on-surface">
                        {suggestion.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-label-sm text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {Math.round(suggestion.similarity * 100)}% khớp
                      </span>
                    </div>

                    {/* Huy hiệu ưu tiên dùng nguyên liệu sắp hỏng */}
                    {suggestion.usesNonFreshItems && (
                      <span className="w-fit rounded-md bg-amber-100 px-2 py-0.5 font-label-sm text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        ⚡ Ưu tiên: Dùng nguyên liệu cần giải cứu
                      </span>
                    )}

                    {/* Danh sách nguyên liệu còn thiếu */}
                    {suggestion.missingIngredients && suggestion.missingIngredients.length > 0 && (
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        Còn thiếu: {suggestion.missingIngredients.map((m) => m.name).join(', ')}
                      </p>
                    )}

                    <Link
                      to={PATHS.RECIPES.DETAIL(suggestion.recipeId)}
                      className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-surface-container-highest py-2 text-center font-label-sm text-label-sm font-semibold text-on-surface no-underline transition-colors hover:bg-primary hover:text-on-primary"
                    >
                      <span>Xem công thức</span>
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CÁC MODAL HỖ TRỢ */}
      {/* 1. Modal thêm thủ công nguyên liệu */}
      <AddItemModal
        show={isAddModalOpen}
        onHide={() => setIsAddModalOpen(false)}
        onExists={(msg) => toast.warning(msg)}
      />

      {/* 2. Modal chỉnh sửa nguyên liệu trong tủ */}
      <EditItemModal item={editingItem} onHide={() => setEditingItem(null)} />

      {/* 3. Modal sửa tay nguyên liệu AI nhận diện */}
      <EditDetectedItemModal
        item={editingDetectedIndex !== null ? detectedItems[editingDetectedIndex] ?? null : null}
        index={editingDetectedIndex}
        onHide={() => setEditingDetectedIndex(null)}
        onSave={handleSaveDetectedEdit}
      />

      {/* 4. Hộp thoại xác nhận xóa nguyên liệu */}
      <ConfirmDialog
        show={!!deletingItem}
        title="Xóa nguyên liệu khỏi tủ?"
        message={
          deletingItem
            ? `Nguyên liệu “${deletingItem.name}” sẽ bị xóa khỏi tủ lạnh ảo và không còn được dùng khi gợi ý món giải cứu.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};

export default FridgePage;
