import type {
  FridgeScanResponse,
  UploadProgressInfo,
  DetectedIngredient,
  FreshnessStatus,
} from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { bootstrapGuestSession, refreshAccessToken } from '@/api/session';
import { storage } from '@/lib/storage';

export interface UploadOptions {
  onProgress?: (progress: UploadProgressInfo) => void;
  signal?: AbortSignal;
  _isRetry?: boolean;
}

/**
 * Kiểm tra xem có đang kích hoạt chế độ API Mock hay không
 * Ưu tiên: biến môi trường VITE_USE_MOCK hoặc VITE_ENABLE_MOCKS
 */
export function isMockEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('VITE_USE_MOCK');
    if (override !== null) return override === 'true';
  }
  return (
    import.meta.env.VITE_USE_MOCK === 'true' ||
    import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
    false
  );
}

/**
 * Bật/tắt chế độ Mock giả lập thủ công ở client (dễ test trên UI)
 */
export function setMockOverride(enabled: boolean | null): void {
  if (typeof window === 'undefined') return;
  if (enabled === null) {
    localStorage.removeItem('VITE_USE_MOCK');
  } else {
    localStorage.setItem('VITE_USE_MOCK', enabled ? 'true' : 'false');
  }
}

/** Dữ liệu mock nguyên liệu nhận diện phong phú, chân thực */
const MOCK_SCAN_RESPONSE: FridgeScanResponse = {
  statusCode: 200,
  message: 'Đã nhận diện thành công các nguyên liệu trong tủ lạnh qua Gemini Vision.',
  data: {
    saved: true,
    scanId: 'scan_' + Date.now(),
    detected: [
      {
        inventoryId: 101,
        ingredientId: 12,
        name: 'Cà chua Đà Lạt',
        quantity: '4 quả (~400g)',
        amount: 4,
        unit: 'quả',
        freshnessStatus: 'FRESH',
        confidence: 0.96,
        box2d: [120, 150, 420, 480],
        foodGroup: 'Rau củ',
      },
      {
        inventoryId: 102,
        ingredientId: 15,
        name: 'Bí đỏ',
        quantity: 'nửa trái',
        amount: 0.5,
        unit: 'trái',
        freshnessStatus: 'FRESH',
        confidence: 0.95,
        box2d: [150, 520, 580, 890],
        foodGroup: 'Rau củ',
      },
      {
        inventoryId: 103,
        ingredientId: 28,
        name: 'Nấm đùi gà',
        quantity: '3 cây (~300g)',
        amount: 3,
        unit: 'cây',
        freshnessStatus: 'FRESH',
        confidence: 0.89,
        box2d: [520, 110, 830, 450],
        foodGroup: 'Nấm',
      },
      {
        inventoryId: 104,
        ingredientId: 34,
        name: 'Cà rốt tươi',
        quantity: '3 củ (~350g)',
        amount: 3,
        unit: 'củ',
        freshnessStatus: 'FRESH',
        confidence: 0.95,
        box2d: [480, 490, 780, 720],
        foodGroup: 'Củ quả',
      },
      {
        inventoryId: 105,
        ingredientId: 41,
        name: 'Rau muống',
        quantity: '1 bó (~500g)',
        amount: 1,
        unit: 'bó',
        freshnessStatus: 'NON-FRESH',
        confidence: 0.84,
        box2d: [620, 700, 920, 950],
        foodGroup: 'Rau xanh',
      },
      {
        inventoryId: 106,
        ingredientId: 56,
        name: 'Đậu hũ non',
        quantity: '2 miếng (~400g)',
        amount: 2,
        unit: 'miếng',
        freshnessStatus: 'FRESH',
        confidence: 0.91,
        box2d: [200, 320, 460, 580],
        foodGroup: 'Đậu hạt',
      },
      {
        inventoryId: 107,
        ingredientId: 78,
        name: 'Thịt heo',
        quantity: '3 ký',
        amount: 3,
        unit: 'kg',
        freshnessStatus: 'FRESH',
        confidence: 0.92,
        box2d: [350, 210, 620, 440],
        foodGroup: 'Thịt đỏ',
        isAnimalProduct: true,
        isRedMeat: true,
      },
    ],
    warnings: [
      'Phát hiện Rau muống có dấu hiệu giảm độ tươi (NON-FRESH). Đề xuất ưu tiên chế biến trong vòng 24 giờ.',
    ],
    quota: {
      used: 3,
      limit: 10,
      remaining: 7,
    },
  },
};

/**
 * Giả lập gọi API với tiến trình Upload mượt mà (Mock Service)
 */
async function mockUploadFridgeImage(
  blob: Blob | File,
  options: UploadOptions = {},
): Promise<FridgeScanResponse> {
  const { onProgress, signal } = options;

  return new Promise<FridgeScanResponse>((resolve, reject) => {
    const checkAborted = (): boolean => {
      if (signal?.aborted) {
        reject(new DOMException('Thao tác tải ảnh đã bị người dùng hủy.', 'AbortError'));
        return true;
      }
      return false;
    };

    if (checkAborted()) return;

    // Giai đoạn 1: Chuẩn bị & nén ảnh
    onProgress?.({
      percentage: 15,
      phase: 'compressing',
      phaseLabel: 'Đang chuẩn bị và tối ưu ảnh...',
    });

    const timer1 = setTimeout(() => {
      if (checkAborted()) return;

      // Giai đoạn 2: Tải dữ liệu lên máy chủ
      let uploadStep = 20;
      const interval = setInterval(() => {
        if (checkAborted()) {
          clearInterval(interval);
          return;
        }

        uploadStep += 15;
        if (uploadStep < 85) {
          onProgress?.({
            percentage: uploadStep,
            phase: 'uploading',
            phaseLabel: `Đang tải ảnh lên máy chủ (${uploadStep}%)...`,
            loadedBytes: Math.round((blob.size * uploadStep) / 100),
            totalBytes: blob.size,
          });
        } else {
          clearInterval(interval);

          // Giai đoạn 3: AI Phân tích hình ảnh
          onProgress?.({
            percentage: 90,
            phase: 'analyzing',
            phaseLabel: 'Gemini Vision AI đang nhận diện nguyên liệu...',
          });

          const timer2 = setTimeout(() => {
            if (checkAborted()) return;

            // Giai đoạn 4: Hoàn thành
            onProgress?.({
              percentage: 100,
              phase: 'done',
              phaseLabel: 'Hoàn tất phân tích!',
            });

            resolve(MOCK_SCAN_RESPONSE);
          }, 800);

          signal?.addEventListener('abort', () => clearTimeout(timer2), { once: true });
        }
      }, 150);

      signal?.addEventListener('abort', () => clearInterval(interval), { once: true });
    }, 300);

    signal?.addEventListener('abort', () => clearTimeout(timer1), { once: true });
  });
}

/**
 * Kiểm tra xem JWT Token có hết hạn hay chưa (kèm 30s buffer)
 */
function isJwtExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 30000;
  } catch {
    return true;
  }
}

/**
 * Lấy Access Token hợp lệ (Thành viên hoặc Khách vãng lai), tự động gia hạn nếu hết hạn
 */
export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const authState = useAuthStore.getState();

  // 1. Nếu là Thành viên đã đăng nhập
  if (authState.user) {
    let token = authState.accessToken || authState.token || storage.get('vl_access_token');
    if (token && typeof token === 'string' && token.startsWith('"') && token.endsWith('"')) {
      try {
        token = JSON.parse(token);
      } catch {
        /* ignore parse error */
      }
    }
    if (!token || isJwtExpired(token) || forceRefresh) {
      try {
        token = await refreshAccessToken();
      } catch (e) {
        console.warn('[FridgeAPI] Không thể làm mới token thành viên:', e);
        token = null;
      }
    }
    if (token && !isJwtExpired(token)) {
      return token;
    }
  }

  // 2. Nếu là Khách vãng lai (hoặc chưa đăng nhập)
  let guestToken = authState.guestToken || storage.get('vl_guest_token');
  if (guestToken && typeof guestToken === 'string' && guestToken.startsWith('"') && guestToken.endsWith('"')) {
    try {
      guestToken = JSON.parse(guestToken);
    } catch {
      /* ignore parse error */
    }
  }
  if (!guestToken || isJwtExpired(guestToken) || forceRefresh) {
    try {
      guestToken = await bootstrapGuestSession(true);
    } catch (e) {
      console.warn('[FridgeAPI] Không thể khởi tạo phiên khách qua session:', e);
      guestToken = null;
    }
  }

  if (guestToken && !isJwtExpired(guestToken)) {
    return guestToken;
  }

  // 3. Fallback trực tiếp gọi POST /api/v1/auth/anonymous nếu session chưa có
  try {
    const res = await fetch('/api/v1/auth/anonymous', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      const token = json?.data?.accessToken;
      if (token && typeof token === 'string') {
        storage.set('vl_guest_token', token);
        useAuthStore.getState().setGuestToken(token);
        return token;
      }
    }
  } catch (e) {
    console.warn('[FridgeAPI] Tự tạo phiên khách ẩn danh thất bại:', e);
  }

  return null;
}

/**
 * Gửi ảnh tủ lạnh thật tới máy chủ qua POST multipart/form-data
 * Dùng XMLHttpRequest để theo dõi chính xác tiến trình tải lên (onprogress) và hỗ trợ AbortController
 */
async function realUploadFridgeImage(
  blob: Blob | File,
  options: UploadOptions = {},
): Promise<FridgeScanResponse> {
  const { onProgress, signal, _isRetry } = options;

  // Endpoint mục tiêu chuẩn RESTful backend (/api/v1/fridge/detections)
  const endpoint =
    import.meta.env.VITE_FRIDGE_SCAN_API_URL || '/api/v1/fridge/detections';

  const token = await getAuthToken();

  return new Promise<FridgeScanResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Hỗ trợ hủy request qua AbortSignal
    if (signal) {
      if (signal.aborted) {
        return reject(new DOMException('Thao tác tải ảnh đã bị hủy.', 'AbortError'));
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Thao tác tải ảnh đã bị người dùng hủy.', 'AbortError'));
      });
    }

    // Theo dõi tiến trình tải lên
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 85); // 0% - 85% cho upload
        onProgress?.({
          percentage: percent,
          phase: 'uploading',
          phaseLabel: `Đang tải ảnh lên (${percent}%)...`,
          loadedBytes: event.loaded,
          totalBytes: event.total,
        });
      }
    };

    xhr.onload = () => {
      // Nếu gặp mã 401 (token hết hạn) và chưa từng thử lại:
      // Tự động xóa token cũ, làm mới phiên (hoặc cấp Anonymous JWT mới) và thử lại 1 lần duy nhất
      if (xhr.status === 401 && !_isRetry) {
        console.warn('[FridgeAPI] Nhận mã 401 Unauthorized từ server, đang tự động làm mới token và gửi lại...');
        storage.remove('vl_access_token');
        storage.remove('vl_guest_token');
        void getAuthToken(true)
          .then((freshToken) => {
            if (freshToken) {
              return realUploadFridgeImage(blob, { ...options, _isRetry: true });
            }
            throw new Error('Phiên làm việc đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.');
          })
          .then(resolve)
          .catch(reject);
        return;
      }

      // Đã gửi xong byte lên server, đang đợi AI xử lý
      onProgress?.({
        percentage: 95,
        phase: 'analyzing',
        phaseLabel: 'Gemini AI đang phân tích dữ liệu...',
      });

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const raw = JSON.parse(xhr.responseText);
          const backendData = raw.data || raw;
          const detectedList = backendData.detectedIngredients || backendData.detected || [];

          const mappedDetected: DetectedIngredient[] = detectedList.map((item: any, idx: number) => ({
            inventoryId: item.inventoryId ?? null,
            ingredientId: item.ingredientId ?? null,
            name: item.name,
            freshnessStatus: (item.freshness || item.freshnessStatus || 'FRESH') as FreshnessStatus,
            confidence: item.confidence ?? 0.95,
            box2d: item.boundingBox || item.box2d || null,
            quantity: item.quantity ?? null,
            amount: item.amount ?? null,
            unit: item.unit ?? null,
          }));

          const response: FridgeScanResponse = {
            statusCode: raw.statusCode ?? xhr.status,
            message: raw.message ?? 'Đã nhận diện nguyên liệu thành công.',
            data: {
              saved: !!backendData.savedToFridge || !!backendData.saved,
              isValidFridge: backendData.isValidFridge ?? true,
              rejectionReason: backendData.rejectionReason ?? null,
              detected: mappedDetected,
              quota: backendData.quotaRemaining !== undefined ? {
                used: 1,
                limit: 10,
                remaining: backendData.quotaRemaining,
              } : (backendData.quota ?? null),
              scanId: String(backendData.detectionId ?? backendData.scanId ?? 'scan-' + Date.now()),
            },
          };

          onProgress?.({
            percentage: 100,
            phase: 'done',
            phaseLabel: 'Hoàn tất phân tích!',
          });
          resolve(response);
        } catch {
          reject(new Error('Dữ liệu máy chủ trả về không đúng định dạng JSON.'));
        }
      } else {
        // Dịch mã lỗi HTTP sang thông báo tiếng Việt theo chuẩn OpenAPI
        let errorMsg = `Lỗi máy chủ (${xhr.status}): Không thể xử lý ảnh.`;
        try {
          const errBody = JSON.parse(xhr.responseText);
          if (errBody?.message) {
            errorMsg = errBody.message;
          }
        } catch {
          // Dùng bảng mã lỗi
          switch (xhr.status) {
            case 400:
              errorMsg = 'Ảnh không hợp lệ hoặc thiếu trường dữ liệu.';
              break;
            case 401:
              errorMsg = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập hoặc tải lại trang.';
              break;
            case 403:
              errorMsg = 'Bạn đã sử dụng hết hạn mức quét ảnh tủ lạnh trong ngày.';
              break;
            case 413:
              errorMsg = 'Ảnh quá lớn (> 10MB). Máy chủ từ chối tiếp nhận.';
              break;
            case 422:
              errorMsg = 'Độ phân giải ảnh quá nhỏ (< 640×480 px). Vui lòng chọn ảnh rõ hơn.';
              break;
            case 503:
              errorMsg = 'Hệ thống AI tạm thời gián đoạn (AI Circuit Open). Vui lòng thử lại sau giây lát.';
              break;
          }
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Hết thời gian chờ phản hồi từ máy chủ (Timeout). Vui lòng thử lại.'));
    };

    xhr.open('POST', endpoint, true);
    xhr.withCredentials = true; // Bắt buộc để gửi cookie HttpOnly (guest_uuid, refresh_token)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.timeout = 40000; // 40 giây cho AI vision

    const formData = new FormData();
    const fileName = blob instanceof File ? blob.name : 'fridge_scan.jpg';
    formData.append('image', blob, fileName);

    xhr.send(formData);
  });
}

/**
 * Hàm gọi API chính: Dùng Real API để kết nối trực tiếp Backend & AI-Service (hoặc chỉ dùng Mock nếu bật VITE_USE_MOCK=true)
 */
export async function uploadFridgeImage(
  blob: Blob | File,
  options: UploadOptions = {},
): Promise<FridgeScanResponse> {
  if (isMockEnabled()) {
    console.info('[FridgeAPI] Đang sử dụng Mock API giả lập (VITE_USE_MOCK=true).');
    return mockUploadFridgeImage(blob, options);
  }

  return await realUploadFridgeImage(blob, options);
}
