import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { http } from '@/api/http';
import { rawHttp } from '@/api/session';
import { API_BASE_URL } from '@/lib/env';

/** Một request mà trang đã gửi; `url` bỏ tiền tố `/api/v1` (ví dụ `/auth/login`). */
export interface MockRequest {
  method: string;
  url: string;
  body: unknown;
  params: unknown;
}

/** Phản hồi giả: status < 400 trả envelope thành công, ngược lại trả envelope lỗi {statusCode, errorCode, message, data, details}. */
export interface MockResponse {
  status?: number;
  data?: unknown;
  meta?: unknown;
  message?: string;
  errorCode?: string;
  details?: { field: string; message: string }[];
}

/** Trả `undefined` khi không xử lý URL đó: request nhận 200 với `data: null`. */
export type MockHandler = (req: MockRequest) => MockResponse | undefined;

const originals = { http: http.defaults.adapter, raw: rawHttp.defaults.adapter };

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function toUrl(config: InternalAxiosRequestConfig): string {
  let url = config.url ?? '';
  if (/^https?:\/\//.test(url)) url = new URL(url).pathname;
  return url.startsWith(API_BASE_URL) ? url.slice(API_BASE_URL.length) : url;
}

/**
 * Thay adapter của axios (`http` và `rawHttp`) bằng `handler` cho test hiện tại; tự gỡ sau mỗi test (src/test/setup.ts).
 * Trả về mảng các request đã gửi để kiểm tra.
 */
export function mockApi(handler: MockHandler): MockRequest[] {
  const calls: MockRequest[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const req: MockRequest = {
      method: (config.method ?? 'get').toUpperCase(),
      url: toUrl(config),
      body: parseBody(config.data),
      params: config.params,
    };
    calls.push(req);
    const res = handler(req) ?? {};
    const status = res.status ?? 200;
    const ok = status < 400;
    const response: AxiosResponse = {
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: new AxiosHeaders(),
      config,
      data: ok
        ? { statusCode: status, message: res.message ?? 'OK', data: res.data ?? null, ...(res.meta ? { meta: res.meta } : {}) }
        : { statusCode: status, errorCode: res.errorCode, message: res.message ?? '', data: res.data, details: res.details },
    };
    if (ok) return response;
    throw new AxiosError(res.message ?? 'Request failed', AxiosError.ERR_BAD_REQUEST, config, null, response);
  };
  http.defaults.adapter = adapter;
  rawHttp.defaults.adapter = adapter;
  return calls;
}

export function resetMockApi(): void {
  http.defaults.adapter = originals.http;
  rawHttp.defaults.adapter = originals.raw;
}
