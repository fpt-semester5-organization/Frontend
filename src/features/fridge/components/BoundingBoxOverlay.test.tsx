import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import type { DetectedItem } from '../types/fridge.types';

describe('BoundingBoxOverlay Component', () => {
  const sampleItems: DetectedItem[] = [
    {
      name: 'Nấm rơm',
      freshnessStatus: 'FRESH',
      box2d: [100, 200, 300, 400], // top: 10%, left: 20%, width: 20%, height: 20%
      confidence: 0.95,
    },
    {
      name: 'Cà chua héo',
      freshnessStatus: 'NON-FRESH',
      box2d: [500, 600, 800, 900], // top: 50%, left: 60%, width: 30%, height: 30%
      confidence: 0.88,
    },
    {
      name: 'Thịt bò',
      freshnessStatus: 'FRESH',
      box2d: [200, 100, 400, 300],
      isAnimalProduct: true,
      isRedMeat: true,
    },
    {
      name: 'Món không có tọa độ',
      freshnessStatus: 'FRESH',
      box2d: null,
    },
  ];

  it('không render gì khi showBoxes = false hoặc items rỗng', () => {
    const { container: c1 } = render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={false} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <BoundingBoxOverlay items={[]} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={true} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('render đúng số lượng khung hộp tương ứng các mục có box2d hợp lệ', () => {
    render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={true} />
    );

    // Có 3 mục có box2d hợp lệ (mục thứ 4 là null)
    expect(screen.getByText('Nấm rơm')).toBeInTheDocument();
    expect(screen.getByText('Cà chua héo')).toBeInTheDocument();
    expect(screen.getByText('Thịt bò')).toBeInTheDocument();
    expect(screen.queryByText('Món không có tọa độ')).not.toBeInTheDocument();
  });

  it('tính toán toạ độ tỷ lệ phần trăm chính xác theo thang đo 0..1000', () => {
    render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={true} />
    );

    const mushroomBox = screen.getByRole('button', { name: /Nấm rơm/i });
    expect(mushroomBox).toHaveStyle({
      top: '10%',
      left: '20%',
      width: '20%',
      height: '20%',
    });
  });

  it('kích hoạt onHoverItem khi người dùng di chuột hoặc rời chuột khỏi khung', () => {
    const onHoverMock = vi.fn();
    render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={onHoverMock} showBoxes={true} />
    );

    const mushroomBox = screen.getByRole('button', { name: /Nấm rơm/i });
    fireEvent.mouseEnter(mushroomBox);
    expect(onHoverMock).toHaveBeenCalledWith(0);

    fireEvent.mouseLeave(mushroomBox);
    expect(onHoverMock).toHaveBeenCalledWith(null);
  });

  it('áp dụng kiểu viền đỏ cảnh báo khi là thịt động vật (isRedMeat/isAnimalProduct)', () => {
    render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={true} />
    );

    const meatBox = screen.getByRole('button', { name: /Thịt bò/i });
    expect(meatBox.className).toContain('border-[#b42318]');
  });

  it('áp dụng kiểu viền cam/đất nung cảnh báo khi là rau củ NON-FRESH', () => {
    render(
      <BoundingBoxOverlay items={sampleItems} hoveredIndex={null} onHoverItem={vi.fn()} showBoxes={true} />
    );

    const tomatoBox = screen.getByRole('button', { name: /Cà chua héo/i });
    expect(tomatoBox.className).toContain('border-[#94532f]');
  });
});
