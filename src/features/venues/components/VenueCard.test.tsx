import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { VenueCard } from './VenueCard';
import type { NearbyVenue } from '../types/venues.types';

const sampleVenue: NearbyVenue = {
  venueId: 1,
  name: 'Nhà Hàng Chay Mandala',
  address: '110 Sương Nguyệt Ánh, Quận 1, TP. HCM',
  distanceKm: 1.2,
  rating: 4.8,
  isFullyVegan: true,
  thumbnailUrl: 'https://images.unsplash.com/sample.jpg',
  categories: ['Món Lẩu Chay Gia Đình'],
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=10.77253,106.69124',
};

describe('VenueCard', () => {
  it('hiển thị đầy đủ tên quán, địa chỉ, khoảng cách và badge Thuần chay', () => {
    render(
      <MemoryRouter>
        <VenueCard venue={sampleVenue} />
      </MemoryRouter>
    );

    expect(screen.getByText('Nhà Hàng Chay Mandala')).toBeInTheDocument();
    expect(screen.getByText('110 Sương Nguyệt Ánh, Quận 1, TP. HCM')).toBeInTheDocument();
    expect(screen.getByText('1,2 km')).toBeInTheDocument();
    expect(screen.getByText('Thuần chay')).toBeInTheDocument();
    expect(screen.getByText('4,8')).toBeInTheDocument();
  });

  it('không hiển thị NaN khi rating là null hoặc undefined', () => {
    const venueWithoutRating: NearbyVenue = {
      ...sampleVenue,
      rating: null,
      isFullyVegan: false,
    };

    render(
      <MemoryRouter>
        <VenueCard venue={venueWithoutRating} />
      </MemoryRouter>
    );

    // Không được xuất hiện chữ NaN
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
    // Badge đổi sang Có món chay
    expect(screen.getByText('Có món chay')).toBeInTheDocument();
  });

  it('gọi callback onSelect khi người dùng click vào thẻ quán', async () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <VenueCard venue={sampleVenue} isSelected={false} onSelect={onSelect} />
      </MemoryRouter>
    );

    const card = screen.getByRole('article');
    await userEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sampleVenue);
  });
});
