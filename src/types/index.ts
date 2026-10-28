/**
 * Hợp đồng dữ liệu & kiểu cho tính năng "Quét tủ lạnh bằng ảnh"
 */

/** Trạng thái của State Machine trong luồng quét tủ lạnh */
export type ScannerState = 'idle' | 'camera' | 'preview' | 'uploading' | 'success' | 'error';

/** Nguồn ảnh được cung cấp */
export type ImageSourceType = 'camera' | 'upload';

/** Thông tin ảnh đã được chụp hoặc chọn tải lên */
export interface SelectedImageInfo {
  file?: File;
  blob: Blob;
  previewUrl: string;
  name: string;
  size: number; // Kích thước theo bytes
  width?: number;
  height?: number;
  source: ImageSourceType;
  mimeType: string;
}

/** Mã lỗi máy ảnh theo chuẩn Web API */
export type CameraErrorCode =
  | 'NOT_ALLOWED'        // Người dùng từ chối quyền truy cập (NotAllowedError)
  | 'NOT_FOUND'          // Không tìm thấy thiết bị camera (NotFoundError)
  | 'NOT_READABLE'       // Camera đang bị ứng dụng khác chiếm giữ (NotReadableError)
  | 'NOT_SUPPORTED'      // Trình duyệt không hỗ trợ getUserMedia
  | 'INSECURE_CONTEXT'   // Không chạy trên HTTPS hoặc localhost
  | 'OVERCONSTRAINED'    // Thiết bị không đáp ứng độ phân giải/yêu cầu
  | 'UNKNOWN';           // Lỗi chưa phân loại

/** Cấu trúc mô tả lỗi máy ảnh kèm thông điệp tiếng Việt thân thiện */
export interface CameraError {
  code: CameraErrorCode;
  message: string;
  suggestion?: string;
  rawError?: unknown;
}

/** Tiến trình tải ảnh và phân tích AI */
export type UploadPhase = 'compressing' | 'uploading' | 'analyzing' | 'done';

export interface UploadProgressInfo {
  percentage: number;
  phase: UploadPhase;
  phaseLabel: string;
  loadedBytes?: number;
  totalBytes?: number;
}

/** Trạng thái độ tươi của thực phẩm theo đặc tả FN-VIS-01 */
export type FreshnessStatus = 'FRESH' | 'NON-FRESH';

/** Nguyên liệu nhận diện từ ảnh */
export interface DetectedIngredient {
  inventoryId?: number | null;
  ingredientId?: number | null;
  name: string;
  quantity?: string | null;
  amount?: number | null;
  unit?: string | null;
  freshnessStatus: FreshnessStatus;
  confidence?: number; // 0.0 - 1.0
  box2d?: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax] tỷ lệ 0-1000
  foodGroup?: string | null;
  isAnimalProduct?: boolean;
  isRedMeat?: boolean;
}

/** Hạn mức sử dụng AI trong ngày */
export interface DetectionQuota {
  used: number;
  limit: number;
  remaining: number;
}

/** Kết quả trả về từ API quét tủ lạnh */
export interface FridgeScanResponse {
  statusCode: number;
  message: string;
  data: {
    saved: boolean;
    isValidFridge?: boolean;
    rejectionReason?: string | null;
    detected: DetectedIngredient[];
    warnings?: string[];
    quota?: DetectionQuota | null;
    scanId?: string;
  };
}

/** Thuộc tính truyền vào component chính FridgeScanner */
export interface FridgeScannerProps {
  /** Callback được gọi khi quét và nhận diện ảnh thành công kèm thông tin ảnh tủ lạnh */
  onSuccess?: (result: FridgeScanResponse, imageInfo: SelectedImageInfo) => void;
  /** Callback được gọi khi phát sinh lỗi không thể tự phục hồi */
  onError?: (error: Error) => void;
  /** Callback khi người dùng muốn đóng scanner */
  onClose?: () => void;
  /** Class CSS tùy biến thêm cho container */
  className?: string;
}
