/** Dữ liệu giả cho auth + thanh chuyển vai trò. Chỉ bật khi dev và khi tự đặt VITE_MOCK_AUTH=true (mặc định false = API thật). */
export const IS_MOCK = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';

/** Gốc đường dẫn API (`/api/v1`), dùng chung cho axios và các lời gọi không qua interceptor. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api/v1';
