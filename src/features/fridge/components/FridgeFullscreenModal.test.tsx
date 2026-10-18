import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FridgeFullscreenModal } from './FridgeFullscreenModal';
import type { DetectedItem } from '../types/fridge.types';

describe('FridgeFullscreenModal Component', () => {
  const mockItems: DetectedItem[] = [
    {
      name: 'Bí ngô',
      freshnessStatus: 'FRESH',
      box2d: [18, 83, 107, 204],
      confidence: 0.95,
      thumbnailUrl: 'data:image/jpeg;base64,mockthumb1',
    },
    {
      name: 'Thịt bò',
      freshnessStatus: 'FRESH',
      box2d: [238, 98, 350, 224],
      isAnimalProduct: true,
      isRedMeat: true,
    },
  ];

  it('không hiển thị khi isOpen = false', () => {
    const { container } = render(
      <FridgeFullscreenModal
        isOpen={false}
        onClose={vi.fn()}
        imageUrl="blob:fake-url"
        items={mockItems}
        hoveredIndex={null}
        onHoverItem={vi.fn()}
        showBoxes={true}
        onToggleShowBoxes={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị đầy đủ tiêu đề, ảnh và danh sách khi isOpen = true', () => {
    render(
      <FridgeFullscreenModal
        isOpen={true}
        onClose={vi.fn()}
        imageUrl="blob:fake-url"
        items={mockItems}
        hoveredIndex={null}
        onHoverItem={vi.fn()}
        showBoxes={true}
        onToggleShowBoxes={vi.fn()}
      />
    );

    expect(screen.getByText(/Chi Tiết Khung Nhận Diện AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Phát hiện 2 nguyên liệu/i)).toBeInTheDocument();
    expect(screen.getByAltText('Ảnh tủ lạnh toàn màn hình')).toBeInTheDocument();
  });

  it('kích hoạt onClose khi người dùng bấm nút Đóng hoặc phím Escape', () => {
    const onCloseMock = vi.fn();
    render(
      <FridgeFullscreenModal
        isOpen={true}
        onClose={onCloseMock}
        imageUrl="blob:fake-url"
        items={mockItems}
        hoveredIndex={null}
        onHoverItem={vi.fn()}
        showBoxes={true}
        onToggleShowBoxes={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it('kích hoạt onToggleShowBoxes khi bấm nút Ẩn/Hiện khung', () => {
    const onToggleMock = vi.fn();
    render(
      <FridgeFullscreenModal
        isOpen={true}
        onClose={vi.fn()}
        imageUrl="blob:fake-url"
        items={mockItems}
        hoveredIndex={null}
        onHoverItem={vi.fn()}
        showBoxes={true}
        onToggleShowBoxes={onToggleMock}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Ẩn khung/i });
    fireEvent.click(toggleBtn);
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it('kích hoạt onHoverItem khi chọn nguyên liệu ở thanh trượt phía dưới', () => {
    const onHoverMock = vi.fn();
    render(
      <FridgeFullscreenModal
        isOpen={true}
        onClose={vi.fn()}
        imageUrl="blob:fake-url"
        items={mockItems}
        hoveredIndex={null}
        onHoverItem={onHoverMock}
        showBoxes={true}
        onToggleShowBoxes={vi.fn()}
      />
    );

    const biNgoBtn = screen.getByRole('button', { name: /Chọn Bí ngô/i });
    fireEvent.click(biNgoBtn);
    expect(onHoverMock).toHaveBeenCalledWith(0);
  });
});
