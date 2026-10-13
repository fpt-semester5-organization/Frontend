import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_RECIPE_IMAGES,
  FALLBACK_VENUE_IMAGE,
  getFallbackImage,
} from '../image.fallback';
import { ImageWithFallback } from '../ImageWithFallback';

describe('ImageWithFallback', () => {
  it('sử dụng src gốc khi được truyền hợp lệ', () => {
    render(<ImageWithFallback src="https://example.com/soup.jpg" alt="Súp nấm" />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/soup.jpg');
    expect(img.alt).toBe('Súp nấm');
  });

  it('tự động dùng ảnh fallback khi src rỗng hoặc null', () => {
    render(<ImageWithFallback src="" fallbackKey={1} alt="Canh chay" />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain(FALLBACK_RECIPE_IMAGES[1]);
  });

  it('chuyển sang ảnh fallback khi thẻ img kích hoạt sự kiện onError', () => {
    render(
      <ImageWithFallback
        src="https://res.cloudinary.com/veggielife/r/404.webp"
        fallbackKey={2}
        alt="Nấm kho"
      />
    );
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('https://res.cloudinary.com/veggielife/r/404.webp');

    // Giả lập lỗi tải ảnh 404
    fireEvent.error(img);

    expect(img.src).toContain(FALLBACK_RECIPE_IMAGES[2]);
  });

  it('hiển thị icon placeholder nếu fallback cũng gặp lỗi', () => {
    render(
      <ImageWithFallback
        src="https://invalid.com/broken.jpg"
        fallbackSrc="https://invalid.com/fallback-broken.jpg"
        alt="Ảnh hỏng hoàn toàn"
      />
    );
    const img = screen.getByRole('img') as HTMLImageElement;

    // Lần lỗi 1: chuyển sang fallbackSrc
    fireEvent.error(img);
    expect(img.src).toBe('https://invalid.com/fallback-broken.jpg');

    // Lần lỗi 2: fallback cũng hỏng -> chuyển sang container icon
    fireEvent.error(img);

    const placeholder = screen.getByRole('img', { name: 'Ảnh hỏng hoàn toàn' });
    expect(placeholder.tagName).toBe('DIV');
    expect(screen.getByText('restaurant')).toBeInTheDocument();
  });

  it('getFallbackImage trả về ảnh quán ăn cho type venue', () => {
    const venueImg = getFallbackImage('venue');
    expect(venueImg).toBe(FALLBACK_VENUE_IMAGE);
  });
});
