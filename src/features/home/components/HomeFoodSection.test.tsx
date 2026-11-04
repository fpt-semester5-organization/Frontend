import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { HomeFoodSection } from './HomeFoodSection';

describe('HomeFoodSection (Món ăn & các biến thể công thức)', () => {
  it('hiển thị tiêu đề, thanh tìm kiếm, bộ lọc danh mục và danh sách món ăn ban đầu', () => {
    renderPage(<HomeFoodSection />);

    expect(screen.getByRole('heading', { name: 'Món ăn nổi bật' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm món chay, nguyên liệu, bài viết…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tất cả món' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dành cho người gầy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Không ăn cay/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kiêng ngũ vị tân/ })).toBeInTheDocument();
    // Chỉ giữ bộ lọc nhu cầu, không còn chip danh mục món
    expect(screen.queryByRole('button', { name: 'Món Cuốn' })).not.toBeInTheDocument();
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

  it('lọc theo nhu cầu đặc biệt: công thức cho người gầy và không ăn cay', async () => {
    renderPage(<HomeFoodSection />);

    const skinnyBtn = screen.getByRole('button', { name: /Dành cho người gầy \(Giàu calo\)/ });
    await userEvent.click(skinnyBtn);

    expect(screen.getByText('Bún bò Huế chay')).toBeInTheDocument();
    expect(screen.getByText('Cơm tấm sườn bì chả chay')).toBeInTheDocument();

    // Bấm đặt lại bộ lọc
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại lọc' }));
    expect(screen.getByText('Bún bò Huế chay')).toBeInTheDocument();
  });

  it('thẻ món ăn cung cấp liên kết xem toàn bộ công thức trên giao diện to đầy đủ (/recipes?food=)', () => {
    renderPage(<HomeFoodSection />);

    const viewRecipesLinks = screen.getAllByRole('link', { name: /Xem các công thức/ });
    expect(viewRecipesLinks.length).toBeGreaterThan(0);
    expect(viewRecipesLinks[0]).toHaveAttribute('href', expect.stringContaining('/recipes?food='));
  });
});
