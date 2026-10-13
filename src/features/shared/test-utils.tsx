import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/** Render trang với QueryClient mới (không retry) + router bộ nhớ; `path` để dùng tham số route (vd. /chat/:sessionId). */
export function renderPage(ui: ReactElement, opts: { route?: string; path?: string; extraPaths?: string[] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } } });
  const body = opts.path ? <Routes>{[opts.path, ...(opts.extraPaths ?? [])].map((p) => <Route key={p} path={p} element={ui} />)}</Routes> : ui;
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[opts.route ?? '/']}>{body}</MemoryRouter></QueryClientProvider>) };
}

/** Lỗi API giả đúng envelope `{statusCode, errorCode, message}`. */
export function apiError(status: number, errorCode: string, message = errorCode, data?: Record<string, unknown>) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('x', String(status), config, null, { status, statusText: '', headers: {}, config, data: { statusCode: status, errorCode, message, data } });
}
