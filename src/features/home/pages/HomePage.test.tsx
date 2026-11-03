import { screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import HomePage from './HomePage';

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, guestToken: 'guest-jwt' });
});

describe('HomePage (SCR-10)', () => {
  it('hiển thị đầy đủ Hero banner, Món ăn nổi bật và Tiện ích AI (TrialCards)', async () => {
    renderPage(<HomePage />);

    // Hero banner
    expect(screen.getByRole('heading', { name: 'Sống xanh, ăn lành, trọn yêu thương' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Khám phá công thức/ })).toBeInTheDocument();

    // Món ăn nổi bật
    expect(screen.getByRole('heading', { name: 'Món ăn nổi bật' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm món chay, nguyên liệu, bài viết…')).toBeInTheDocument();
    expect(screen.getByText('Bún bò Huế chay')).toBeInTheDocument();
    expect(screen.getByText('Phở chay Hà Nội')).toBeInTheDocument();

    // Tiện ích AI & TrialCards
    expect(screen.getByText('Dọn sạch Tủ Lạnh')).toBeInTheDocument();
    expect(screen.getByText('Hỏi trợ lý dinh dưỡng AI')).toBeInTheDocument();
  });

  it('các thẻ món ăn chứa liên kết trực tiếp sang giao diện to đầy đủ (/recipes?food=...)', () => {
    renderPage(<HomePage />);

    const links = screen.getAllByRole('link', { name: /Xem các công thức/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/recipes?food='));
  });

  it('chuyển hướng quản trị viên (ADMIN) về trang /admin', () => {
    useAuthStore.setState({
      user: { userId: 1, fullName: 'Quản trị viên', email: 'admin@veggielife.vn', role: 'ADMIN', isVip: true },
      accessToken: 'admin-token',
      guestToken: null,
    });

    renderPage(<HomePage />);
    expect(screen.queryByRole('heading', { name: 'Sống xanh, ăn lành, trọn yêu thương' })).not.toBeInTheDocument();
  });
});
