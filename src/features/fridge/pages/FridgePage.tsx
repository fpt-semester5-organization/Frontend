import React, { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { QUOTA } from '@/constants/quota';
import { apiErrorMessage } from '@/api/http';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { storage } from '@/lib/storage';
import { PATHS } from '@/routes/paths';
import { selectIsAuthenticated, selectIsVip, useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { toast, useUiStore } from '@/stores/ui.store';
import { AddItemModal } from '../components/AddItemModal';
import { EditItemModal } from '../components/EditItemModal';
import { EditDetectedItemModal } from '../components/EditDetectedItemModal';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { FridgeScanner } from '@/components/FridgeScanner';
import { useQueryClient } from '@tanstack/react-query';
import {
  createFridgeItem,
  deleteFridgeItem,
  updateFridgeItem,
} from '../api/fridge.api';
import {
  fridgeKeys,
  useDeleteFridgeItem,
  useFridgeDetection,
  useFridgeItems,
  useRecipeSuggestions,
} from '../hooks/useFridge';
import { compressImage } from '../lib/compressImage';
import { cropAllDetectedThumbnails } from '../lib/cropImage';
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

interface IngredientVisual {
  icon: string;
  bg: string;
  text: string;
}

function getIngredientVisual(_name?: string): IngredientVisual {
  return {
    icon: 'eco',
    bg: 'bg-[#eaf3ec] text-[#2d5a38] border border-[#c4dec8]',
    text: 'text-[#2d5a38]',
  };
}

// Loại bỏ các mã tài liệu đặc tả / quy tắc nội bộ (ví dụ: BR-ADM-CNT-003, FN-AUTH-02, D109) ra khỏi giao diện
function cleanTechnicalCodes(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*\([A-Z0-9\-_,\s]+\)/g, '')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .trim();
}

// Kiểm tra nguyên liệu có phải là đồ ăn mặn (thịt, cá, gia cầm, hải sản) cần loại trừ khỏi tủ lạnh chay
function isNonVegetarianMeat(item: { name: string; foodGroup?: string | null; isRedMeat?: boolean }): boolean {
  const name = (item.name || '').toLowerCase().trim();
  if (
    name.includes('chay') ||
    name.includes('thực vật') ||
    name.includes('thuần chay') ||
    name.includes('vegan') ||
    name.includes('plant-based') ||
    name.includes('non-dairy')
  ) {
    return false;
  }
  // Trứng, sữa, nước uống, bánh ngọt KHÔNG PHẢI là đồ ăn mặn / thịt cá
  if (
    name.includes('trứng') || name.includes('hột gà') || name.includes('hột vịt') ||
    name.includes('sữa') || name.includes('kem') || name.includes('phô mai') || name.includes('bơ') ||
    name.includes('nước') || name.includes('trà') || name.includes('bánh')
  ) {
    return false;
  }
  if (item.isRedMeat) return true;
  const fg = (item.foodGroup || '').toUpperCase().trim();
  if (
    fg.includes('RED_MEAT') || fg.includes('THỊT ĐỎ') ||
    fg.includes('MEAT') || fg.includes('THỊT') ||
    fg.includes('POULTRY') || fg.includes('GIA CẦM') ||
    fg.includes('SEAFOOD') || fg.includes('HẢI SẢN') ||
    fg.includes('THỦY HẢI SẢN') || fg.includes('FISH') || fg.includes('CÁ')
  ) {
    return true;
  }
  const meatKeywords = [
    'thịt', 'bò', 'heo', 'lợn', 'gà', 'vịt', 'ngan', 'ngỗng', 'cừu', 'dê', 'bê',
    'ba rọi', 'ba chỉ', 'sườn non', 'sườn heo', 'sườn bò', 'xương heo', 'xương bò',
    'bò bít tết', 'beefsteak', 'beef', 'pork', 'chicken',
    'cá ', 'cá hồi', 'cá thu', 'cá chép', 'cá lóc', 'cá tra', 'cá basa', 'cá ngừ', 'cá đuối', 'cá trích',
    'tôm', 'cua', 'ghẹ', 'mực', 'bạch tuộc', 'hàu', 'sò', 'nghêu', 'ốc', 'sứa', 'hải sản',
    'chả cá', 'chả lụa', 'giò lụa', 'xúc xích heo', 'xúc xích bò', 'lạp xưởng', 'pate gan', 'mỡ heo'
  ];
  return meatKeywords.some((k) => name.includes(k));
}

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

  const queryClient = useQueryClient();

  // Trạng thái kết quả nhận diện AI & Bounding Box
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [deletedInventoryIds, setDeletedInventoryIds] = useState<number[]>([]);
  const [isSavingToFridge, setIsSavingToFridge] = useState(false);
  const [isSavedToFridge, setIsSavedToFridge] = useState(false);
  const [editingDetectedIndex, setEditingDetectedIndex] = useState<number | null>(null);
  const [memberQuota, setMemberQuota] = useState<DetectionQuota | null>(null);
  const [serverError, setServerError] = useState<{ message: string; isTooSmall: boolean } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [mainTab, setMainTab] = useState<'vision' | 'inventory'>('vision');

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

  const totalStoredCount = authed ? (allItemsQuery.data?.length ?? 0) : 0;
  const hasItems = authed && totalStoredCount > 0;
  const suggestionsQuery = useRecipeSuggestions(hasItems);

  // Xóa kho tạm của khách nếu có trước đó
  useEffect(() => {
    storage.remove('vl_guest_fridge_items');
  }, []);

  // Reset ảnh để chụp/quét ảnh mới
  const handleResetImage = () => {
    setSelectedFile(null);
    setDetectionResult(null);
    setDetectedItems([]);
    setDeletedInventoryIds([]);
    setIsSavedToFridge(false);
    setServerError(null);
    setImageError(null);
    setCompressionResult(null);
    setHoveredIndex(null);
  };

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
    setDeletedInventoryIds([]);
    setIsSavedToFridge(false);
    setServerError(null);
    setCompressionResult(null);
    setHoveredIndex(null);

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
    setHoveredIndex(null);

    detectMutation.mutate(selectedFile, {
      onSuccess: async (res) => {
        setDetectionResult(res);
        setIsSavedToFridge(res.saved);
        if (authed && res.quota) {
          setMemberQuota(res.quota);
        }

        // Tự động cắt thumbnail cận cảnh bằng Canvas cho các nguyên liệu có box2d
        if (selectedFile) {
          try {
            const enriched = await cropAllDetectedThumbnails(selectedFile, res.detected);
            setDetectedItems(enriched);
          } catch {
            setDetectedItems(res.detected);
          }
        } else {
          setDetectedItems(res.detected);
        }

        if (authed) {
          if (res.saved) {
            await queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
            const savedCount = res.detected.filter((d) => d.inventoryId != null).length;
            toast.success(`Đã nhận diện ${res.detected.length} món và tự động lưu ${savedCount} nguyên liệu vào tủ lạnh!`);
          } else {
            toast.success(`Đã nhận diện thành công ${res.detected.length} nguyên liệu trong tủ lạnh!`);
          }
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
    setIsSavedToFridge(false);
    toast.success(`Đã cập nhật “${updatedItem.name}” (${updatedItem.freshnessStatus})`);
  };

  // Xóa thủ công một nguyên liệu trong kết quả nhận diện
  const handleRemoveDetected = (idx: number) => {
    const item = detectedItems[idx];
    if (item?.inventoryId) {
      setDeletedInventoryIds((prev) => [...prev, item.inventoryId!]);
    }
    setDetectedItems((prev) => prev.filter((_, i) => i !== idx));
    setIsSavedToFridge(false);
    toast.info(`Đã loại bỏ “${item?.name || 'nguyên liệu'}” khỏi danh sách.`);
  };

  // Lưu và đồng bộ danh sách nguyên liệu đã nhận diện vào tủ lạnh cá nhân
  const handleSaveToPersonalFridge = async () => {
    // Chưa đăng nhập thì KHÔNG ĐƯỢC LƯU
    if (!authed) {
      toast.warning('Bạn chưa đăng nhập. Vui lòng đăng nhập để lưu nguyên liệu vào tủ lạnh cá nhân!');
      openSignupPrompt('quota');
      return;
    }

    if (detectedItems.length === 0 && deletedInventoryIds.length === 0) {
      toast.info('Không có nguyên liệu nào để lưu.');
      return;
    }

    setIsSavingToFridge(true);
    try {
      // 1. Xóa các mục người dùng đã bấm nút X (nếu đã từng lưu trong DB)
      if (deletedInventoryIds.length > 0) {
        await Promise.allSettled(
          deletedInventoryIds.map((id) => deleteFridgeItem(id))
        );
        setDeletedInventoryIds([]);
      }

      // 2. Cập nhật các mục đã có trong kho hoặc thêm mới các mục chưa có
      let savedCount = 0;
      const operations: Promise<unknown>[] = [];
      for (const item of detectedItems) {
        const itemDisplayName = item.quantity ? `${item.name} (${item.quantity})` : item.name;
        if (item.inventoryId) {
          operations.push(
            updateFridgeItem(item.inventoryId, {
              customItemName: itemDisplayName,
              freshnessStatus: item.freshnessStatus,
            })
          );
          savedCount++;
        } else if (!isNonVegetarianMeat(item)) {
          operations.push(
            createFridgeItem({
              ingredientId: item.ingredientId ?? undefined,
              customItemName: itemDisplayName,
              freshnessStatus: item.freshnessStatus,
            })
          );
          savedCount++;
        }
      }

      if (operations.length > 0) {
        await Promise.allSettled(operations);
      }

      // 3. Làm mới cache dữ liệu kho tủ lạnh
      await queryClient.invalidateQueries({ queryKey: fridgeKeys.all });

      setIsSavedToFridge(true);

      if (savedCount === detectedItems.length && savedCount > 0) {
        toast.success(`Đã lưu thành công cả ${savedCount} nguyên liệu vào tủ lạnh!`);
      } else if (savedCount > 0) {
        toast.success(
          `Đã lưu ${savedCount}/${detectedItems.length} nguyên liệu vào tủ lạnh cá nhân.`
        );
      } else {
        toast.warning(
          'Không có nguyên liệu nào khớp với danh mục nguyên liệu thực vật để lưu trữ.'
        );
      }
    } catch {
      toast.error('Có lỗi xảy ra khi lưu vào tủ lạnh cá nhân. Vui lòng thử lại.');
    } finally {
      setIsSavingToFridge(false);
    }
  };

  // Lọc và sắp xếp kho tủ lạnh ảo (ưu tiên mục NON-FRESH xếp trước)
  const visibleItems = useMemo(() => {
    if (!authed) return [];
    const list = itemsQuery.data ?? [];
    const query = searchQuery.trim().toLowerCase();

    const filtered = query ? list.filter((i) => i.name.toLowerCase().includes(query)) : list;

    // Sắp xếp: NON-FRESH đứng trước để người dùng ưu tiên xử lý sớm
    return [...filtered].sort((a, b) => {
      if (a.freshnessStatus === b.freshnessStatus) return a.name.localeCompare(b.name);
      return a.freshnessStatus === 'NON-FRESH' ? -1 : 1;
    });
  }, [authed, itemsQuery.data, searchQuery]);

  // Hạn mức hiển thị
  const imageLimit = vip ? QUOTA.fridgeImagesPerDay.vip : QUOTA.fridgeImagesPerDay.free;

  // Xóa nguyên liệu khỏi tủ lạnh ảo
  const handleConfirmDelete = () => {
    if (!deletingItem || !authed) return;
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
      <header className="mb-6 flex flex-col gap-4 border-b border-outline-variant/40 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Icon name="kitchen" className="text-[24px]" />
            </span>
            <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
              Tủ Lạnh Thông Minh
            </h1>
          </div>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Nhận diện nguyên liệu và theo dõi độ tươi bằng AI.
          </p>
        </div>

        {/* Khối hiển thị hạn mức còn lại & hành động */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-on-surface"
            aria-live="polite"
          >
            <Icon name="speed" className="text-[18px] text-primary" />
            <div className="font-label-md text-label-md">
              {authed ? (
                memberQuota ? (
                  <span>
                    Còn <strong className="text-primary">{memberQuota.remaining}/{memberQuota.limit}</strong> lượt hôm nay
                  </span>
                ) : (
                  <span>
                    Hạn mức: <strong className="text-primary">{imageLimit} lượt/ngày</strong>
                  </span>
                )
              ) : typeof guestAiLeft === 'number' ? (
                <span>
                  Dùng thử: Còn <strong className="text-amber-700 dark:text-amber-400">{guestAiLeft}/{QUOTA.guest.ai}</strong> lượt
                </span>
              ) : (
                <span>
                  Dùng thử: <strong className="text-amber-700 dark:text-amber-400">{QUOTA.guest.ai} lượt</strong>
                </span>
              )}
            </div>
          </div>

          {authed && (
            <Button
              variant="secondary"
              onClick={() => {
                setMainTab('inventory');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="add_circle" className="text-[18px]" />
              Thêm thủ công
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => {
              setMainTab('vision');
            }}
            className="inline-flex items-center gap-2"
          >
            <Icon name="center_focus_strong" className="text-[20px]" />
            Nhận diện tủ lạnh
          </Button>
        </div>
      </header>

      {/* Input ẩn để tải tệp ảnh */}
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

      {/* 2 Tab riêng biệt: Nhận Diện AI Vision & Kho Nguyên Liệu Tủ Lạnh */}
      <nav className="mb-6 flex items-center border-b border-outline-variant/50" aria-label="Phân hệ tủ lạnh">
        <button
          type="button"
          onClick={() => setMainTab('vision')}
          className={`inline-flex items-center gap-2 border-b-2 px-6 py-3.5 font-label-lg text-sm sm:text-base font-semibold transition-all ${
            mainTab === 'vision'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface'
          }`}
        >
          <Icon name="center_focus_strong" className="text-[20px]" />
          <span>Nhận Diện AI Vision</span>
          {detectedItems.length > 0 && (
            <span className="rounded-full bg-[#eaf3ec] px-2.5 py-0.5 text-xs font-bold text-[#2d5a38] border border-[#c4dec8]">
              {detectedItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('inventory')}
          className={`inline-flex items-center gap-2 border-b-2 px-6 py-3.5 font-label-lg text-sm sm:text-base font-semibold transition-all ${
            mainTab === 'inventory'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface'
          }`}
        >
          <Icon name="kitchen" className="text-[20px]" />
          <span>Kho Nguyên Liệu Tủ Lạnh</span>
          <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-bold text-on-surface-variant">
            {totalStoredCount}
          </span>
        </button>
      </nav>

      {/* TAB 1: NHẬN DIỆN AI VISION */}
      {mainTab === 'vision' && (
        <section aria-label="Phân tích AI Vision" className="w-full">
          {!detectionResult ? (
            /* TRẠNG THÁI CHƯA NHẬN DIỆN: SỬ DỤNG BỘ QUÉT TỦ LẠNH THÔNG MINH (CAMERA + TẢI ẢNH) */
            <div className="w-full flex justify-center py-2">
              <FridgeScanner
                onSuccess={async (result, imageInfo) => {
                  const file =
                    imageInfo.file ??
                    new File([imageInfo.blob], imageInfo.name, { type: imageInfo.mimeType });
                  setSelectedFile(file);

                  try {
                    const enriched = await cropAllDetectedThumbnails(
                      imageInfo.blob,
                      result.data.detected as DetectedItem[],
                    );
                    setDetectedItems(enriched);
                  } catch {
                    setDetectedItems(result.data.detected as DetectedItem[]);
                  }

                  setDetectionResult(result.data);
                  const isSaved = authed && (result.data.saved ?? true);
                  setIsSavedToFridge(isSaved);
                  if (isSaved) {
                    void queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
                  }
                  if (result.data.quota) {
                    setMemberQuota(result.data.quota);
                  }
                  if (result.data.detected.length === 0) {
                    toast.error(
                      'Không nhận diện được nguyên liệu! Không có bất kỳ nguyên liệu thực phẩm nào trong ảnh (đồ điện tử, gia dụng... không phải là nguyên liệu, thực phẩm).',
                    );
                  } else {
                    toast.success(
                      `Đã nhận diện thành công ${result.data.detected.length} nguyên liệu trong tủ lạnh!`,
                    );
                  }
                }}
              />
            </div>
          ) : (
            /* TRẠNG THÁI ĐÃ NHẬN DIỆN XONG: TRANG TRÌNH BÀY ẢNH TỦ LẠNH TO BẢN RÕ NÉT CÙNG BOUNDING BOX */
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
              {/* Thanh điều khiển kết quả */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${detectedItems.length > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                    <Icon name={detectedItems.length > 0 ? "center_focus_strong" : "search_off"} className="text-[24px]" />
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
                      {detectedItems.length > 0
                        ? `Kết Quả Nhận Diện Tủ Lạnh (${detectedItems.length} nguyên liệu)`
                        : 'Không Nhận Diện Được Nguyên Liệu'}
                    </h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {detectedItems.length > 0
                        ? 'AI đã phát hiện và đóng khung vị trí các loại nguyên liệu trực tiếp trên ảnh'
                        : 'Không có bất kỳ nguyên liệu thực phẩm nào trong ảnh. Các đồ vật không liên quan (như đồ điện tử, đồ gia dụng...) không phải là nguyên liệu thực phẩm.'}
                    </p>
                  </div>
                  {isSavedToFridge ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-label-sm text-xs font-semibold bg-[#eaf3ec] text-[#2d5a38] border border-[#c4dec8] transition-all duration-300">
                      ✓ Đã lưu vào kho tủ lạnh
                    </span>
                  ) : !authed ? (
                    <span className="rounded-full px-3 py-1 font-label-sm text-xs font-semibold bg-[#fef6ea] text-[#935216] border border-[#f8dfbe]">
                      Kết quả dùng thử
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {detectedItems.some((it) => it.box2d) && (
                    <button
                      type="button"
                      onClick={() => setShowBoundingBoxes((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface transition hover:bg-surface-container"
                      title={showBoundingBoxes ? 'Ẩn khung nhận diện trên ảnh' : 'Hiện khung nhận diện trên ảnh'}
                    >
                      <Icon
                        name={showBoundingBoxes ? 'visibility_off' : 'visibility'}
                        className="text-[16px] text-primary"
                      />
                      <span>{showBoundingBoxes ? 'Ẩn khung ảnh' : 'Hiện khung ảnh'}</span>
                    </button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetImage}
                    type="button"
                    className="inline-flex items-center gap-1.5"
                  >
                    <Icon name="photo_camera" className="text-[16px]" />
                    <span>Quét ảnh khác</span>
                  </Button>
                </div>
              </div>

              {/* KHUNG HIỂN THỊ ẢNH TỦ LẠNH TO BẢN Ở TRUNG TÂM VỚI NỀN BE ẤM */}
              {previewUrl && (
                <div className="relative my-6 flex min-h-[440px] max-h-[640px] sm:max-h-[720px] w-full items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/60 bg-[#f4efe8] dark:bg-surface-container p-3 sm:p-5 shadow-inner">
                  <div className="relative inline-flex max-h-full max-w-full items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Ảnh tủ lạnh nhận diện AI"
                      className="max-h-[600px] sm:max-h-[680px] w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-black/10"
                    />
                    <BoundingBoxOverlay
                      items={detectedItems}
                      hoveredIndex={hoveredIndex}
                      onHoverItem={setHoveredIndex}
                      showBoxes={showBoundingBoxes}
                    />
                  </div>
                </div>
              )}

              {/* Danh sách nguyên liệu đã nhận diện bên dưới */}
              <div className="mt-6 border-t border-outline-variant/40 pt-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                    Danh Sách Nguyên Liệu Phát Hiện ({detectedItems.length})
                  </h3>
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    💡 Rê chuột vào thẻ nguyên liệu để làm sáng khung tương ứng trên ảnh
                  </span>
                </div>

                {detectedItems.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 p-8 text-center text-amber-900 dark:text-amber-200">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 mb-3">
                      <Icon name="search_off" className="text-[28px]" />
                    </div>
                    <div className="font-bold text-base mb-1">Không nhận diện được nguyên liệu nào</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 max-w-md mx-auto">
                      Không có bất kỳ nguyên liệu nào trong ảnh. Hệ thống bắt buộc phải quét đúng là nguyên liệu thực phẩm mới hiển thị. Các đồ vật không liên quan như đồ điện tử, đồ gia dụng không phải là nguyên liệu, thực phẩm.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {detectedItems.map((item, idx) => {
                      const isHovered = hoveredIndex === idx;
                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className={`group relative flex items-center justify-between gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 ${
                            isHovered
                              ? 'border-primary bg-primary-fixed/20 shadow-lg ring-2 ring-primary scale-[1.01]'
                              : 'border-outline-variant/50 bg-surface-container-low hover:border-outline hover:bg-surface-container'
                          }`}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Thumbnail to rõ nét cắt cận cảnh từ Bounding Box hoặc Icon */}
                            {item.thumbnailUrl ? (
                              <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container shadow-xs">
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              </div>
                            ) : (
                              <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl border border-[#c4dec8] bg-[#eaf3ec] text-[#2d5a38] shadow-xs">
                                <Icon
                                  name="eco"
                                  className="text-[32px]"
                                />
                              </div>
                            )}

                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-headline-sm text-base sm:text-lg font-bold text-on-surface truncate">
                                  {item.name}
                                </span>
                                {item.quantity && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 shadow-2xs">
                                    <Icon name="scale" className="text-[13px]" />
                                    <span>{item.quantity}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <FreshnessBadge status={item.freshnessStatus} size="sm" />
                                {isNonVegetarianMeat(item) ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fdeeed] px-2.5 py-0.5 text-xs font-semibold text-[#b42318] border border-[#fecdca]">
                                    <Icon name="block" className="text-[13px]" />
                                    <span>Đồ ăn mặn (Không lưu vào kho)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3ec] px-2.5 py-0.5 text-xs font-semibold text-[#2d5a38] border border-[#c4dec8]">
                                    <Icon name="check" className="text-[13px]" />
                                    <span>Lưu vào tủ lạnh</span>
                                  </span>
                                )}
                                {item.confidence != null && (
                                  <span className="text-[11px] font-medium text-on-surface-variant/80">
                                    Độ tin cậy: {Math.round(item.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Các nút chỉnh sửa tay */}
                          <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => setEditingDetectedIndex(idx)}
                              title="Sửa tay tên hoặc độ tươi"
                            >
                              <Icon name="edit" className="text-[15px]" />
                              <span className="hidden sm:inline">Sửa tay</span>
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
                      );
                    })}
                  </div>
                )}

                {/* Cảnh báo từ AI nếu có */}
                {detectionResult.warnings && detectionResult.warnings.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#f8dfbe] bg-[#fefbf6] p-4 text-[#8a4e0a] shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-[#8a4e0a]">
                      <Icon name="notification_important" className="text-[20px] text-[#b76e1a]" />
                      <span>Lưu ý cảnh báo từ AI:</span>
                    </div>
                    <ul className="mt-1.5 list-disc pl-5 font-body-sm text-sm text-[#734008] space-y-1">
                      {detectionResult.warnings.map((w, i) => (
                        <li key={i}>{cleanTechnicalCodes(w)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* KHU VỰC HÀNH ĐỘNG: LƯU VÀO TỦ LẠNH CÁ NHÂN & XEM KHO */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-5 rounded-2xl border border-primary/25 bg-gradient-to-r from-emerald-500/10 via-primary-fixed/20 to-primary/10 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md">
                      <Icon name="kitchen" className="text-[28px]" />
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                        Lưu Trữ Tủ Lạnh Cá Nhân
                      </h4>
                      <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
                        {isSavedToFridge
                          ? `Đã lưu thành công ${detectedItems.length} nguyên liệu vào kho tủ lạnh của bạn.`
                          : authed
                          ? `Đã nhận diện ${detectedItems.length} nguyên liệu. Bấm "Lưu vào tủ lạnh cá nhân" để đồng bộ lưu trữ và nhận gợi ý món ăn.`
                          : 'Bạn chưa đăng nhập. Vui lòng đăng nhập hoặc tạo tài khoản để lưu nguyên liệu vào kho tủ lạnh.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleResetImage}
                      type="button"
                      className="inline-flex items-center gap-2"
                    >
                      <Icon name="photo_camera" className="text-[18px]" />
                      <span>Quét ảnh khác</span>
                    </Button>

                    <Button
                      variant={isSavedToFridge ? 'secondary' : 'primary'}
                      size="md"
                      onClick={handleSaveToPersonalFridge}
                      type="button"
                      loading={isSavingToFridge}
                      disabled={isSavedToFridge}
                      className={
                        isSavedToFridge
                          ? 'inline-flex items-center gap-2 border-[#c4dec8] bg-[#eaf3ec] text-[#2d5a38] font-semibold cursor-default'
                          : 'inline-flex items-center gap-2 shadow-md shadow-primary/25 font-semibold'
                      }
                    >
                      <Icon name={isSavedToFridge ? 'check_circle' : !authed ? 'lock' : 'bookmark_added'} className="text-[20px]" />
                      <span>
                        {isSavedToFridge
                          ? 'Đã lưu vào tủ lạnh'
                          : !authed
                          ? 'Đăng nhập để lưu vào kho'
                          : 'Lưu vào tủ lạnh cá nhân'}
                      </span>
                    </Button>

                    {hasItems && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          document.getElementById('recipe-suggestions-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        type="button"
                        className="inline-flex items-center gap-2 shadow-md shadow-primary/25 font-semibold"
                      >
                        <Icon name="soup_kitchen" className="text-[18px]" />
                        <span>Xem gợi ý món ăn ({suggestionsQuery.data?.length ?? 0})</span>
                      </Button>
                    )}

                    {authed && (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => setMainTab('inventory')}
                        type="button"
                        className="inline-flex items-center gap-2 font-semibold"
                      >
                        <Icon name="kitchen" className="text-[18px]" />
                        <span>Xem kho tủ lạnh</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Hướng dẫn cho Khách */}
                {!authed && (
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-primary-fixed/30 p-4 text-on-surface">
                    <p className="font-body-sm text-body-sm">
                      Kết quả của Khách chỉ để xem thử. Đăng ký tài khoản để tự động lưu nguyên liệu vào tủ lạnh thông minh!
                    </p>
                    <Link
                      to={PATHS.AUTH.REGISTER}
                      className="ml-3 shrink-0 rounded-lg bg-primary px-3.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary no-underline hover:bg-primary/90"
                    >
                      Đăng ký ngay
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: KHO NGUYÊN LIỆU TỦ LẠNH CỦA BẠN */}
      {mainTab === 'inventory' && (
        <section aria-label="Kho nguyên liệu tủ lạnh" className="w-full">
          <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Kho Tủ Lạnh Của Bạn</h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  {authed ? `${totalStoredCount} nguyên liệu đang được lưu trữ` : 'Yêu cầu đăng nhập tài khoản'}
                </p>
              </div>

              {authed && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-52">
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

                  {hasItems && (
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('recipe-suggestions-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 font-label-sm text-xs font-semibold text-primary transition hover:bg-primary/20"
                      title="Cuộn tới danh sách gợi ý món ăn"
                    >
                      <Icon name="soup_kitchen" className="text-[16px]" />
                      <span>Gợi ý món ({suggestionsQuery.data?.length ?? 0})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Các tab lọc độ tươi (chỉ hiển thị khi đã đăng nhập) */}
            {authed && (
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
            )}

            {/* Trạng thái xem kho tủ lạnh: Chưa đăng nhập */}
            {!authed ? (
              <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-8 sm:p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon name="lock" className="text-[36px]" />
                </div>
                <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
                  Kho Tủ Lạnh Dành Cho Thành Viên
                </h3>
                <p className="max-w-md font-body-sm text-sm text-on-surface-variant">
                  Chưa đăng nhập thì không thể lưu trữ và quản lý kho tủ lạnh. Vui lòng đăng nhập hoặc đăng ký tài khoản để bắt đầu lưu trữ nguyên liệu và nhận gợi ý món ăn thông minh!
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to={PATHS.AUTH.LOGIN}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-sm font-semibold text-on-primary no-underline shadow-md shadow-primary/25 transition hover:bg-primary/90"
                  >
                    <Icon name="login" className="text-[18px]" />
                    <span>Đăng nhập ngay</span>
                  </Link>
                  <Link
                    to={PATHS.AUTH.REGISTER}
                    className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface px-5 py-2.5 font-label-md text-sm font-semibold text-on-surface no-underline hover:bg-surface-container"
                  >
                    <Icon name="person_add" className="text-[18px]" />
                    <span>Đăng ký tài khoản</span>
                  </Link>
                </div>
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
                  Hãy chụp ảnh tủ lạnh bằng AI hoặc thêm thủ công nguyên liệu để bắt đầu theo dõi độ tươi!
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMainTab('vision');
                    }}
                  >
                    <Icon name="center_focus_strong" className="text-[18px]" />
                    Nhận diện tủ lạnh
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Icon name="add" className="text-[18px]" />
                    Thêm thủ công
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => {
                  const matchingDetected = detectedItems.find(
                    (d) =>
                      (item.ingredientId && d.ingredientId === item.ingredientId) ||
                      d.name.toLowerCase() === item.name.toLowerCase()
                  );
                  const itemThumbnail = matchingDetected?.thumbnailUrl;
                  const visual = getIngredientVisual(item.name);

                  return (
                    <div
                      key={item.inventoryId}
                      className="group relative flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3.5 sm:p-4 transition-all duration-200 hover:border-primary/50 hover:bg-surface-container-low hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Thumbnail thực tế từ scan hoặc Icon danh mục */}
                          {itemThumbnail ? (
                            <div className="relative h-13 w-13 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container shadow-xs">
                              <img
                                src={itemThumbnail}
                                alt={item.name}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div
                              className={`flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl ${visual.bg} shadow-xs`}
                            >
                              <Icon name={visual.icon} className="text-[26px]" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4
                              className="font-body-md text-sm sm:text-base font-bold text-on-surface leading-snug break-words"
                              title={item.name}
                            >
                              {item.name}
                            </h4>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <FreshnessBadge status={item.freshnessStatus} size="sm" />
                            </div>
                          </div>
                        </div>

                        {/* Các nút chỉnh sửa / xoá */}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            title="Chỉnh sửa tên hoặc độ tươi"
                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary"
                            aria-label={`Chỉnh sửa ${item.name}`}
                          >
                            <Icon name="edit" className="text-[17px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            title="Xóa khỏi tủ lạnh"
                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-red-600"
                            aria-label={`Xóa ${item.name}`}
                          >
                            <Icon name="delete" className="text-[17px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
        </section>
      )}

      {/* SECTION GỢI Ý MÓN ĂN NẤU NGAY (EMPTY THE FRIDGE - FN-VIS-03) */}
      {/* Hiển thị cho cả 2 tab (AI Vision & Kho tủ lạnh) để người dùng thấy gợi ý món ngay sau khi chụp ảnh */}
      <div
        id="recipe-suggestions-section"
        className="mt-8 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm"
      >
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/40">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ec] text-[#2d5a38] border border-[#c4dec8]">
              <Icon name="soup_kitchen" className="text-[24px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  Món Chay Gợi Ý Nấu Ngay
                </h3>
                <span className="rounded-full bg-[#eaf3ec] px-2.5 py-0.5 text-xs font-semibold text-[#2d5a38] border border-[#c4dec8]">
                  Empty the Fridge
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Gợi ý công thức đạt độ tương đồng nguyên liệu ≥ 70%, tự động ưu tiên giải cứu các món cần dùng sớm
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void suggestionsQuery.refetch()}
              disabled={suggestionsQuery.isFetching}
              title="Tải lại danh sách gợi ý"
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Icon
                name="refresh"
                className={`text-[16px] ${suggestionsQuery.isFetching ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </Button>

            <Link
              to={`${PATHS.MEAL_PLANS.NEW}?useFridge=true`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 no-underline"
              title="AI tự động sắp xếp 7 ngày thực đơn từ toàn bộ nguyên liệu trong tủ"
            >
              <Icon name="calendar_month" className="text-[16px]" />
              <span>Lên thực đơn tuần</span>
            </Link>
          </div>
        </div>

        {/* Content area */}
        <div className="mt-5">
          {!authed ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-6 text-center">
              <Icon name="lock" className="mx-auto text-[32px] text-on-surface-variant" />
              <p className="mt-2 font-headline-sm text-sm font-bold text-on-surface">
                Yêu cầu đăng nhập
              </p>
              <p className="mt-1 font-body-sm text-xs text-on-surface-variant">
                Đăng nhập hoặc đăng ký tài khoản để hệ thống đối chiếu nguyên liệu trong tủ lạnh với kho công thức chay chuẩn.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => openSignupPrompt('quota')}
              >
                Đăng ký / Đăng nhập
              </Button>
            </div>
          ) : !hasItems ? (
            <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-6 text-center">
              <Icon name="kitchen" className="mx-auto text-[32px] text-on-surface-variant" />
              <p className="mt-2 font-headline-sm text-sm font-bold text-on-surface">
                Tủ lạnh hiện chưa có nguyên liệu nào
              </p>
              <p className="mt-1 font-body-sm text-xs text-on-surface-variant">
                Hãy quét ảnh tủ lạnh hoặc thêm nguyên liệu thủ công để hệ thống tính toán độ tương đồng và gợi ý món ngon cho bạn!
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setMainTab('vision')}
              >
                <Icon name="center_focus_strong" className="text-[16px]" />
                Nhận diện tủ lạnh
              </Button>
            </div>
          ) : suggestionsQuery.isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 animate-pulse"
                >
                  <div className="h-5 w-3/4 rounded bg-surface-container-high" />
                  <div className="h-4 w-1/2 rounded bg-surface-container-high" />
                  <div className="mt-2 h-9 w-full rounded-xl bg-surface-container-high" />
                </div>
              ))}
            </div>
          ) : suggestionsQuery.isError ? (
            <div className="rounded-xl border border-[#fecdca] bg-[#fdeeed] p-4 text-[#b42318]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Icon name="error" className="text-[18px]" />
                <span>Không thể tải gợi ý món ăn lúc này</span>
              </div>
              <p className="mt-1 font-body-sm text-xs opacity-90">
                {cleanTechnicalCodes(apiErrorMessage(suggestionsQuery.error))}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => void suggestionsQuery.refetch()}
              >
                Thử lại
              </Button>
            </div>
          ) : (suggestionsQuery.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-outline-variant/50 bg-[#fbf9f6] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5efe6] text-[#8a532a]">
                <Icon name="search_off" className="text-[28px]" />
              </div>
              <h4 className="mt-3 font-headline-sm text-base font-bold text-on-surface">
                Chưa có công thức nào đạt độ tương đồng ≥ 70%
              </h4>
              <p className="mx-auto mt-1 max-w-md font-body-sm text-xs sm:text-sm text-on-surface-variant">
                Kho tủ lạnh của bạn hiện có {allItemsQuery.data?.length ?? 0} nguyên liệu. Hãy thử bổ sung thêm một số nguyên liệu cơ bản (như đậu phụ, nấm rơm, mì sợi...) để mở khóa các công thức nấu ngay nhé!
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5"
                >
                  <Icon name="add" className="text-[16px]" />
                  Thêm nguyên liệu thủ công
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMainTab('vision')}
                  className="inline-flex items-center gap-1.5"
                >
                  <Icon name="photo_camera" className="text-[16px]" />
                  Quét thêm ảnh rau củ
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(suggestionsQuery.data ?? []).map((suggestion) => {
                const matchPercent = Math.round(suggestion.similarity * 100);
                const isPerfectMatch = matchPercent >= 100;

                return (
                  <div
                    key={suggestion.recipeId}
                    className="group flex flex-col justify-between rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-3.5 sm:p-4 transition-all duration-200 hover:border-primary/50 hover:bg-surface-container-low hover:shadow-md"
                  >
                    <div className="flex flex-col gap-2.5">
                      {/* Thumbnail món ăn với huy hiệu nổi */}
                      <div className="relative h-40 sm:h-44 w-full overflow-hidden rounded-xl bg-surface-container-high border border-outline-variant/30">
                        {suggestion.imageUrl ? (
                          <img
                            src={suggestion.imageUrl}
                            alt={suggestion.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#f5efe6] text-[#8a532a]">
                            <Icon name="soup_kitchen" className="text-[36px] opacity-70" />
                          </div>
                        )}

                        {/* Huy hiệu độ tương đồng nổi ở góc phải trên ảnh */}
                        <div className="absolute top-2.5 right-2.5 shadow-xs">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md ${
                              isPerfectMatch
                                ? 'bg-[#eaf3ec]/95 text-[#2d5a38] border border-[#c4dec8]'
                                : 'bg-[#f4efe8]/95 text-[#734008] border border-[#e5d5ca]'
                            }`}
                          >
                            {isPerfectMatch ? '✓ Đủ nguyên liệu' : `${matchPercent}% khớp`}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h4
                          className="font-headline-sm text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1"
                          title={suggestion.title}
                        >
                          {suggestion.title}
                        </h4>
                      </div>

                      {/* Priority badge for non-fresh items */}
                      {suggestion.usesNonFreshItems && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#fef6ea] px-2.5 py-1 text-xs font-semibold text-[#935216] border border-[#f8dfbe]">
                          <Icon name="bolt" className="text-[15px] text-[#b76e1a]" />
                          <span>Ưu tiên giải cứu: Tận dụng đồ cần dùng sớm</span>
                        </div>
                      )}

                      {/* Missing ingredients */}
                      {suggestion.missingIngredients && suggestion.missingIngredients.length > 0 ? (
                        <div className="rounded-xl bg-surface-container-low p-2.5 text-xs text-on-surface-variant">
                          <span className="font-semibold text-on-surface">Còn thiếu: </span>
                          <span>
                            {suggestion.missingIngredients.map((m) => m.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#eaf3ec]/60 p-2.5 text-xs font-medium text-[#2d5a38]">
                          ✨ Bạn đã có đầy đủ nguyên liệu trong tủ để nấu món này!
                        </div>
                      )}
                    </div>

                    {/* CTA button */}
                    <div className="mt-4 pt-3 border-t border-outline-variant/30">
                      <Link
                        to={PATHS.RECIPES.DETAIL(suggestion.recipeId)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-center font-label-md text-xs sm:text-sm font-semibold text-on-primary no-underline shadow-xs transition hover:bg-primary/90"
                      >
                        <span>Xem công thức & Nấu ngay</span>
                        <Icon name="arrow_forward" className="text-[16px]" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
            ? `Nguyên liệu “${deletingItem.name}” sẽ bị xóa khỏi tủ lạnh thông minh và không còn được dùng khi gợi ý món giải cứu.`
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
