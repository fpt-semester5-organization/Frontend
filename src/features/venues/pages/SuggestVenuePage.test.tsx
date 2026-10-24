import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import SuggestVenuePage from './SuggestVenuePage';

const VENUE = {
  venueId: 301,
  name: 'Cơm chay Tâm An',
  address: '12 Lê Lợi, Quận 1, TP.HCM',
  distanceKm: 0.8,
  rating: 4.6,
  isFullyVegan: true,
  thumbnailUrl: null,
  categories: ['Cơm chay'],
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=10.7729,106.6983',
};

// Vị trí ở TP.HCM; trình duyệt cho phép định vị.
beforeEach(() => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 10.77291, longitude: 106.69831 } } as GeolocationPosition) },
  });
  useAuthStore.setState({ user: { userId: 7, fullName: 'An', email: 'an@x.vn', role: 'MEMBER', isVip: false }, isAuthenticated: true, accessToken: 't', guestToken: null });
});
afterEach(() => vi.restoreAllMocks());

const recipe = { recipeId: 12, title: 'Cơm chiên chay', imageUrl: null };

describe('SCR-20 Gợi ý quán theo món', () => {
  it('không có recipeId: mời chọn công thức', () => {
    mockApi(() => undefined);
    renderWithProviders(<SuggestVenuePage />, '/venues/suggest');
    expect(screen.getByText('Chọn một món để gợi ý quán')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem công thức' })).toHaveAttribute('href', '/recipes');
  });

  it('bấm dùng vị trí: gọi GET /recipes/{id}/venues với tọa độ đã làm tròn, hiện danh sách quán', async () => {
    const calls = mockApi((req) => {
      if (req.url === '/recipes/12') return { data: recipe };
      if (req.url === '/recipes/12/venues') return { data: [VENUE] };
      return undefined;
    });
    renderWithProviders(<SuggestVenuePage />, '/venues/suggest?recipeId=12');
    expect(await screen.findByRole('heading', { name: 'Cơm chiên chay' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Dùng vị trí của tôi/ }));
    expect(await screen.findByText('Cơm chay Tâm An')).toBeInTheDocument();
    expect(screen.getByText(/1 quán trong bán kính 10 km/)).toBeInTheDocument();
    expect(calls.find((c) => c.url === '/recipes/12/venues')?.params).toEqual({ lat: 10.7729, lng: 106.6983, limit: 5 });
  });

  it('không có quán phù hợp: trạng thái rỗng kèm lối sang bản đồ', async () => {
    mockApi((req) => (req.url === '/recipes/12' ? { data: recipe } : req.url === '/recipes/12/venues' ? { data: [] } : undefined));
    renderWithProviders(<SuggestVenuePage />, '/venues/suggest?recipeId=12');
    await userEvent.click(await screen.findByRole('button', { name: /Dùng vị trí của tôi/ }));
    expect(await screen.findByText('Chưa có quán phù hợp gần bạn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở bản đồ quán chay' })).toHaveAttribute('href', '/venues');
  });

  it('công thức không tồn tại (404 ERR_CONTENT_NOT_FOUND): báo không tìm thấy', async () => {
    mockApi(() => ({ status: 404, errorCode: 'ERR_CONTENT_NOT_FOUND', message: 'Công thức không tồn tại.' }));
    renderWithProviders(<SuggestVenuePage />, '/venues/suggest?recipeId=999');
    await waitFor(() => expect(screen.getByText('Không tìm thấy công thức')).toBeInTheDocument());
  });
});
