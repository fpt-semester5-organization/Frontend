import { setupWorker } from 'msw/browser';
import type { RequestHandler } from 'msw';

/**
 * Tự gom mọi mảng `*Handlers` trong handlers/*.handlers.ts (thứ tự theo tên file).
 * Thêm dữ liệu giả cho phân hệ mới chỉ cần tạo file handler, không sửa file này,
 * nên các nhánh feature không còn xung đột ở đây khi gộp vào dev.
 */
const modules = import.meta.glob<Record<string, unknown>>('./handlers/*.handlers.ts', { eager: true });
const handlers = Object.values(modules).flatMap((mod) =>
  Object.entries(mod)
    .filter(([name, value]) => name.endsWith('Handlers') && Array.isArray(value))
    .flatMap(([, value]) => value as RequestHandler[]),
);

/** MSW chỉ chạy khi npm run dev và VITE_ENABLE_MOCKS=true (xem src/main.tsx). */
export const worker = setupWorker(...handlers);
