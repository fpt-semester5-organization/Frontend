import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** Bọc trang bằng QueryClient mới (không retry) + router bộ nhớ để test hook/trang quản trị. */
export function renderWithProviders(ui: ReactElement, route = '/') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: 0 },
    },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

export const paged = <T,>(items: T[], total = items.length, page = 1, size = 20) => ({
  items,
  meta: { page, size, total },
});
