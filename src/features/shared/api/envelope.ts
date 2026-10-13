import type { AxiosResponse } from 'axios';
import type { ApiEnvelope } from '@/api/types';

/** Kết quả đầy đủ của một envelope thành công: `data` + `meta` (khác `unwrap` của http.ts, vốn bỏ `meta`). */
export interface EnvelopeResult<T, M = Record<string, unknown>> {
  data: T;
  meta: M | undefined;
  message: string;
}

export async function unwrapEnvelope<T, M = Record<string, unknown>>(
  req: Promise<AxiosResponse<ApiEnvelope<T>>>,
): Promise<EnvelopeResult<T, M>> {
  const res = (await req).data;
  return { data: res.data, meta: res.meta as unknown as M | undefined, message: res.message };
}

/** Timeout riêng cho các lệnh gọi AI (axios mặc định 15 s là quá ngắn cho Gemini/RAG). */
export const AI_TIMEOUT_MS = 60_000;

export interface PageMeta {
  page: number;
  size: number;
  total: number;
}
