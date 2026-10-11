import { HttpResponse, delay } from 'msw';
import { users, type MockUser } from './db';

/** Khớp cả baseURL tương đối (/api/v1) lẫn tuyệt đối (http://localhost:5000/api/v1). */
export const api = (path: string) => `*/api/v1${path}`;

const SESSION_KEY = 'vl_mock_session_user';

/** Mô phỏng cookie refresh token HttpOnly: lưu userId trong sessionStorage của tab. */
export const mockSession = {
  get: (): number | null => {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? Number(value) : null;
  },
  set: (userId: number) => sessionStorage.setItem(SESSION_KEY, String(userId)),
  clear: () => sessionStorage.removeItem(SESSION_KEY),
};

export const tokenFor = (userId: number) => `mock-token-${userId}`;

/** Người gọi từ header Authorization: Bearer mock-token-<userId>; null là Khách. */
export function currentUser(request: Request): MockUser | null {
  const match = request.headers.get('Authorization')?.match(/^Bearer mock-token-(\d+)$/);
  return match ? (users.find((user) => user.userId === Number(match[1])) ?? null) : null;
}

export const latency = () => delay(250 + Math.random() * 300);

export function ok<T>(data: T, message = 'OK', status = 200, meta?: { page: number; size: number; total: number }) {
  return HttpResponse.json({ statusCode: status, message, data, ...(meta ? { meta } : {}) }, { status });
}

export function fail(
  status: number,
  errorCode: string,
  message: string,
  details?: { field: string; message: string }[]
) {
  return HttpResponse.json(
    { statusCode: status, errorCode, message, ...(details ? { details } : {}) },
    { status, headers: { 'X-Correlation-Id': `mock-${Date.now()}` } }
  );
}

export const unauthorized = () =>
  fail(401, 'ERR_AUTH_INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

export const validationError = (details: { field: string; message: string }[]) =>
  fail(400, 'ERR_VALIDATION', 'Dữ liệu đầu vào không hợp lệ.', details);

/** Mô phỏng AI kiểm duyệt (BR-USR-03): nội dung có từ bị cấm ⇒ điểm vi phạm ≥ 85%. */
const FLAGGED_WORDS = ['thịt bò', 'thịt heo', 'thịt gà', 'nước mắm', 'spam', 'quảng cáo'];
export const isFlaggedByAi = (text: string) => {
  const lower = text.toLowerCase();
  return FLAGGED_WORDS.some((word) => lower.includes(word));
};

export const isPositiveInt = (value: unknown) => Number.isInteger(value) && (value as number) > 0;
