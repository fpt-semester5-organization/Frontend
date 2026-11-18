import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraScanner } from './CameraScanner';

const noop = vi.fn();

describe('CameraScanner', () => {
  it('quét xong có ảnh sản phẩm: hiện ảnh ngay trong khung camera', () => {
    render(
      <CameraScanner
        paused
        onDetected={noop}
        onUnavailable={noop}
        productImage={{ src: 'https://images.openfoodfacts.org/p.jpg', alt: 'Pinattsu' }}
      />
    );

    expect(screen.getByTestId('product-image-frame')).toBeInTheDocument();
    expect(screen.getByAltText('Pinattsu')).toHaveAttribute('src', 'https://images.openfoodfacts.org/p.jpg');
    expect(screen.queryByText('Đã quét xong')).not.toBeInTheDocument();
  });

  it('ảnh tải lỗi: quay về màn "Đã quét xong"', () => {
    render(
      <CameraScanner
        paused
        onDetected={noop}
        onUnavailable={noop}
        productImage={{ src: 'https://images.openfoodfacts.org/broken.jpg', alt: 'Pinattsu' }}
      />
    );

    fireEvent.error(screen.getByAltText('Pinattsu'));

    expect(screen.queryByTestId('product-image-frame')).not.toBeInTheDocument();
    expect(screen.getByText('Đã quét xong')).toBeInTheDocument();
  });
});
