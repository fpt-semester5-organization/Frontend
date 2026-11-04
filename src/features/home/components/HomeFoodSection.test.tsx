import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { HomeFoodSection } from './HomeFoodSection';

describe('HomeFoodSection (Món ăn & các biến thể công thức)', () => {
  it('hiển thị tiêu đề, thanh tìm kiếm, nút lọc danh mục và danh sách món ăn ban đầu', async () => {
    renderPage(<HomeFoodSection />);

    expect(screen.getByRole('heading', { name: 'Món ăn nổi bật' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm món chay, nguyên liệu, bài viết…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lọc theo danh mục món ăn' })).toBeInTheDocument();
    expect(screen.getByText('Bún bò Huế chay')).toBeInTheDocument();
    expect(screen.getByText('Phở chay Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('Cơm tấm sườn bì chả chay')).toBeInTheDocument();
    expect(screen.getByText('Đậu hũ kho nấm rơm')).toBeInTheDocument();
  });

  it('tìm kiếm món ăn theo từ khóa thời gian thực', async () => {
    renderPage(<HomeFoodSection />);

    const searchInput = screen.getByPlaceholderText('Tìm món chay, nguyên liệu, bài viết…');
    await userEvent.type(searchInput, 'Phở');

    expect(screen.getByText('Phở chay Hà Nội')).toBeInTheDocument();
    expect(screen.queryByText('Đậu hũ kho nấm rơm')).not.toBeInTheDocument();
    expect(screen.queryByText('Canh chua Nam Bộ chay')).not.toBeInTheDocument();

    // Xóa từ khóa
    await userEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa tìm kiếm' }));
    expect(screen.getByText('Đậu hũ kho nấm rơm')).toBeInTheDocument();
  });

  it('lọc món ăn theo danh mục phân loại khi bấm nút bộ lọc', async () => {
    renderPage(<HomeFoodSection />);

    // Mở dropdown danh mục
    await userEvent.click(screen.getByRole('button', { name: 'Lọc theo danh mục món ăn' }));
    await userEvent.click(screen.getByRole('button', { name: /Món Cuốn/ }));
    expect(screen.getByText('Gỏi cuốn chay ngũ sắc')).toBeInTheDocument();
    expect(screen.queryByText('Bún bò Huế chay')).not.toBeInTheDocument();

    // Xóa bộ lọc danh mục
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc danh mục' }));
    expect(screen.getByText('Bún bò Huế chay')).toBeInTheDocument();
    expect(screen.getByText('Gỏi cuốn chay ngũ sắc')).toBeInTheDocument();
  });

  it('thẻ món ăn cung cấp liên kết xem toàn bộ công thức trên giao diện to đầy đủ (/recipes?food=)', () => {
    renderPage(<HomeFoodSection />);

    const viewRecipesLinks = screen.getAllByRole('link', { name: /Xem các công thức/ });
    expect(viewRecipesLinks.length).toBeGreaterThan(0);
    expect(viewRecipesLinks[0]).toHaveAttribute('href', expect.stringContaining('/recipes?food='));
  });
});
