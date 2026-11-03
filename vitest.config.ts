import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Unit test dùng chung cấu hình Vite (alias @, plugin React). Chạy: npm test
export default mergeConfig(
  viteConfig as any,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      // Luôn gọi API thật qua axios (đã giả lập bằng mockApi), không dùng dữ liệu giả của .env.local.
      // Bỏ Google Client ID của .env máy cá nhân: có ID thì GoogleButton render nút Google thật, cần GoogleOAuthProvider
      // nên test trang đăng nhập/đăng ký lỗi tùy máy.
      env: { VITE_MOCK_AUTH: 'false', VITE_ENABLE_MOCKS: 'false', VITE_GOOGLE_CLIENT_ID: '' },
    },
  }),
);
