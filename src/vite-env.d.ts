/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Maptiles key của Goong để hiển thị bản đồ quán chay (SCR-18). Thiếu thì trang chỉ hiện danh sách. */
  readonly VITE_GOONG_MAPTILES_KEY?: string;
  /** 'true' để bật dữ liệu giả MSW khi chạy npm run dev (không ảnh hưởng bản build). */
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
