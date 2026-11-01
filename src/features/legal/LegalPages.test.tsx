import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe('Legal Pages and Links', () => {
  it('renders TermsPage with title and key sections', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <TermsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Điều Khoản Sử Dụng Dịch Vụ/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Giới thiệu & Phạm vi áp dụng/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Giới hạn trách nhiệm Dinh dưỡng & Y tế/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Văn bản số hóa chính thức/i).length).toBeGreaterThan(0);
  });

  it('renders PrivacyPage with title and key principles', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <PrivacyPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Chính Sách Bảo Mật Quyền Riêng Tư/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Dữ liệu chúng tôi thu thập/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Xử lý ảnh Quét tủ lạnh & Mã vạch/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Văn bản pháp lý số hóa/i).length).toBeGreaterThan(0);
  });

  it('renders clickable links for Terms and Privacy on RegisterPage without target="_blank"', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const termsLink = screen.getByRole('link', { name: /Điều khoản/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(termsLink).not.toHaveAttribute('target');

    const privacyLink = screen.getByRole('link', { name: /Chính sách bảo mật/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(privacyLink).not.toHaveAttribute('target');
  });

  it('opens LegalDocumentsModal directly on RegisterPage when clicking Điều khoản', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const termsLink = screen.getByRole('link', { name: /Điều khoản/i });
    fireEvent.click(termsLink);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText(/Điều Khoản Sử Dụng Dịch Vụ/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Tôi đồng ý với điều khoản này/i })).toBeInTheDocument();
  });
});
