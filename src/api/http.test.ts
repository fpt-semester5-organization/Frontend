import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { useUiStore } from '@/stores/ui.store';
import { http, unwrapPaged } from './http';
import { rawHttp } from './session';

const user = { userId: 1, fullName: 'An', email: 'an@x.vn', role: 'MEMBER' as const, isVip: false };
const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config });
const fail = (config: InternalAxiosRequestConfig, status: number, errorCode: string) =>
  new AxiosError('fail', String(status), config, null, { data: { statusCode: status, errorCode, message: errorCode }, status, statusText: '', headers: {}, config });

let apiCalls: { url?: string; auth?: string }[];
let refreshCalls: number;
const assign = vi.fn();

/** API giả: token `new` hợp lệ, mọi token khác → 401 ERR_AUTH_INVALID_TOKEN. */
function installApi(opts: { failRefresh?: number; alwaysInvalid?: boolean; code?: string } = {}) {
  const api: AxiosAdapter = async (config) => {
    const auth = String(config.headers.Authorization ?? '');
    apiCalls.push({ url: config.url, auth });
    if (opts.alwaysInvalid || auth !== 'Bearer new') throw fail(config, 401, opts.code ?? 'ERR_AUTH_INVALID_TOKEN');
    return ok(config, { statusCode: 200, message: 'OK', data: { url: config.url } });
  };
  const refresh: AxiosAdapter = async (config) => {
    if (config.url !== '/auth/refresh-token') return ok(config, { statusCode: 200, message: 'OK', data: null }); // /auth/anonymous… (endSession mở lại phiên Khách)
    refreshCalls++;
    await new Promise((r) => setTimeout(r, 10));
    if (opts.failRefresh) throw fail(config, opts.failRefresh, 'ERR_AUTH_REFRESH_TOKEN_INVALID');
    return ok(config, { statusCode: 200, message: 'OK', data: { tokenType: 'Bearer', accessToken: 'new', expiresIn: 900 } });
  };
  http.defaults.adapter = api;
  rawHttp.defaults.adapter = refresh;
}

beforeEach(() => {
  apiCalls = [];
  refreshCalls = 0;
  assign.mockReset();
  vi.stubGlobal('location', { assign, pathname: '/recipes', search: '' });
  useAuthStore.setState({ user, accessToken: 'old', guestToken: null });
  useGuestStore.getState().reset();
  useUiStore.setState({ toasts: [], serviceBanner: null, signupPrompt: { open: false, reason: 'guest', returnUrl: '/' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});

describe('http interceptor — refresh token', () => {
  it('3 request 401 đồng thời chỉ gọi refresh 1 lần và thử lại cả 3 với token mới', async () => {
    installApi();
    const results = await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    expect(apiCalls.filter((c) => c.auth === 'Bearer old')).toHaveLength(3);
    expect(apiCalls.filter((c) => c.auth === 'Bearer new')).toHaveLength(3);
    expect(useAuthStore.getState().accessToken).toBe('new');
    expect(assign).not.toHaveBeenCalled();
  });

  it('refresh hỏng (401): kết thúc phiên đúng 1 lần, về /auth/login, không lặp', async () => {
    installApi({ failRefresh: 401 });
    const results = await Promise.allSettled([http.get('/a'), http.get('/b')]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/auth/login');
  });

  it('request đã thử lại mà vẫn 401: không refresh lần 2 (tổng 2 lần gọi API, 1 lần refresh)', async () => {
    installApi({ alwaysInvalid: true });
    await expect(http.get('/a')).rejects.toBeTruthy();
    expect(refreshCalls).toBe(1);
    expect(apiCalls).toHaveLength(2);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('401 ERR_AUTH_INVALID_CREDENTIALS (sai mật khẩu xác nhận) không refresh và không đăng xuất', async () => {
    installApi({ alwaysInvalid: true, code: 'ERR_AUTH_INVALID_CREDENTIALS' });
    await expect(http.delete('/users/me', { data: { confirmPassword: 'x' } })).rejects.toBeTruthy();
    expect(refreshCalls).toBe(0);
    expect(useAuthStore.getState().user).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('endpoint /auth/login trả 401 không kích hoạt refresh', async () => {
    installApi({ alwaysInvalid: true, code: '' });
    await expect(http.post('/auth/login', {})).rejects.toBeTruthy();
    expect(refreshCalls).toBe(0);
  });

  it('refresh lỗi mạng/5xx: giữ phiên, báo lỗi gốc', async () => {
    installApi({ failRefresh: 503 });
    await expect(http.get('/a')).rejects.toBeTruthy();
    expect(useAuthStore.getState().user).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('http interceptor — Khách & mã lỗi khác', () => {
  it('Anonymous JWT hết hạn: xin phiên Khách mới 1 lần rồi thử lại', async () => {
    useAuthStore.setState({ user: null, accessToken: null, guestToken: 'stale' });
    http.defaults.adapter = (async (config) => {
      if (config.headers.Authorization !== 'Bearer fresh') throw fail(config, 401, 'ERR_AUTH_INVALID_TOKEN');
      return ok(config, { statusCode: 200, message: 'OK', data: [] });
    }) as AxiosAdapter;
    let anonCalls = 0;
    rawHttp.defaults.adapter = (async (config) => {
      if (config.url === '/auth/anonymous') {
        anonCalls++;
        return ok(config, { statusCode: 200, message: 'OK', data: { accessToken: 'fresh', guestId: 'g1', role: 'GUEST' } });
      }
      return ok(config, { statusCode: 200, message: 'OK', data: { ai: { used: 0, limit: 3, remaining: 3 } } });
    }) as AxiosAdapter;
    const r = await http.get('/recipes');
    expect(r.status).toBe(200);
    expect(anonCalls).toBe(1);
    expect(useAuthStore.getState().guestToken).toBe('fresh');
  });

  it('403 ERR_GUEST_COMMUNITY_ACTION_DENIED mở SignupPromptModal', async () => {
    http.defaults.adapter = (async (config) => {
      throw fail(config, 403, 'ERR_GUEST_COMMUNITY_ACTION_DENIED');
    }) as AxiosAdapter;
    await expect(http.post('/posts', {})).rejects.toBeTruthy();
    expect(useUiStore.getState().signupPrompt.open).toBe(true);
  });

  it('403 ERR_GUEST_REGION_UNSUPPORTED không mời đăng ký', async () => {
    http.defaults.adapter = (async (config) => {
      throw fail(config, 403, 'ERR_GUEST_REGION_UNSUPPORTED');
    }) as AxiosAdapter;
    await expect(http.get('/venues/nearby')).rejects.toBeTruthy();
    expect(useUiStore.getState().signupPrompt.open).toBe(false);
  });

  it('503 hiện banner dịch vụ gián đoạn', async () => {
    http.defaults.adapter = (async (config) => {
      throw fail(config, 503, 'ERR_SYS_REDIS_UNAVAILABLE');
    }) as AxiosAdapter;
    await expect(http.get('/recipes')).rejects.toBeTruthy();
    expect(useUiStore.getState().serviceBanner).toBeTruthy();
  });

  it('FormData không bị ép sang JSON (không có Content-Type JSON mặc định)', async () => {
    let contentType: unknown = 'unset';
    http.defaults.adapter = (async (config) => {
      contentType = config.headers.getContentType?.() ?? config.headers['Content-Type'];
      return ok(config, { statusCode: 200, message: 'OK', data: {} });
    }) as AxiosAdapter;
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.png');
    await http.post('/users/me/avatar', fd);
    expect(String(contentType ?? '')).not.toContain('application/json');
  });
});

describe('unwrapPaged', () => {
  it('trả items + meta của envelope', async () => {
    const res = await unwrapPaged<number>(
      Promise.resolve({ data: { statusCode: 200, message: 'OK', data: [1, 2], meta: { page: 2, size: 2, total: 9 } }, status: 200, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig }),
    );
    expect(res).toEqual({ items: [1, 2], meta: { page: 2, size: 2, total: 9 } });
  });
});
