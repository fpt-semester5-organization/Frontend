import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('hiển thị chữ cái đầu (initials) của hai từ cuối khi không truyền src', () => {
    render(<Avatar name="Nguyễn Văn An" />);
    expect(screen.getByText('VA')).toBeInTheDocument();
  });

  it('hiển thị thẻ img với src hợp lệ', () => {
    render(<Avatar name="Nguyễn Văn An" src="https://example.com/avatar.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'Ảnh đại diện của Nguyễn Văn An');
  });

  it('fallback về initials khi ảnh gặp sự cố (onError)', () => {
    render(<Avatar name="Nguyễn Văn An" src="https://example.com/invalid.jpg" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('VA')).toBeInTheDocument();
  });

  it('hỗ trợ kích thước khác nhau', () => {
    const { container } = render(<Avatar name="Trần Bình" size="lg" />);
    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });
});
