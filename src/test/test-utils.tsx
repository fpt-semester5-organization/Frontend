/* eslint-disable react-refresh/only-export-components */
import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: React.ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routerInitialEntries?: MemoryRouterProps['initialEntries'];
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: string | CustomRenderOptions = {}
) {
  const opts = typeof options === 'string' ? { route: options } : options;
  const {
    route = '/',
    routerInitialEntries = [route],
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = opts;
  function AllTheProviders({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={routerInitialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
