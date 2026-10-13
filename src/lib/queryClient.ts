import { QueryClient } from '@tanstack/react-query';

/** Không thử lại lỗi 4xx (403 hết hạn mức, 404…): thử lại vừa vô ích vừa có thể trừ thêm lượt dùng thử. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: shouldRetryQuery, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
