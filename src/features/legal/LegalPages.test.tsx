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

  it('renders clickable links for Terms and Privacy on RegisterPage without quick-view button', () => {
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

    // Quick-view button has been removed as requested by user
    expect(screen.queryByText(/Xem nhanh văn bản pháp lý chính thức/i)).not.toBeInTheDocument();
  });

  it('opens LegalDocumentsModal directly on RegisterPage when clicking Điều khoản and renders document image instead of text', async () => {
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
    expect(screen.getAllByText(/Điều Khoản Dịch Vụ \(Luật 19\/2023\/QH15\)/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Tôi đồng ý với điều khoản này/i })).toBeInTheDocument();

    // Verify it displays document image, NOT text clauses
    const docImage = screen.getByRole('img', { name: /Điều Khoản Dịch Vụ/i });
    expect(docImage).toBeInTheDocument();
    expect(docImage).toHaveAttribute('src', expect.stringContaining('19_2023_QH15_500102.jpg'));

    // Verify raw text clauses are NOT rendered
    expect(screen.queryByText(/1\.1\. Điều khoản này cấu thành/i)).not.toBeInTheDocument();
  });

  it('opens LegalDocumentsModal with Privacy Policy matching Image 3 when clicking Chính sách bảo mật on RegisterPage', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const privacyLink = screen.getByRole('link', { name: /Chính sách bảo mật/i });
    fireEvent.click(privacyLink);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText(/Chính Sách Bảo Mật Dữ Liệu \(Nghị định 13\/2023\/NĐ-CP\)/i).length).toBeGreaterThan(0);

    const privacyImage = screen.getByRole('img', { name: /Chính Sách Bảo Mật Dữ Liệu/i });
    expect(privacyImage).toBeInTheDocument();
    expect(privacyImage).toHaveAttribute('src', expect.stringContaining('13_2023_ND-CP_465185.jpg'));
  });

  it('allows switching between all 4 legal document images inside the modal', async () => {
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

    // Switch to Cam kết người dùng tab
    const userAgreementTab = screen.getByRole('button', { name: /Cam kết người dùng/i });
    fireEvent.click(userAgreementTab);

    expect(screen.getAllByText(/Thỏa Thuận & Cam Kết Người Dùng \(Luật 116\/2025\/QH15\)/i).length).toBeGreaterThan(0);
    const uaImg = screen.getByRole('img', { name: /Thỏa Thuận & Cam Kết Người Dùng/i });
    expect(uaImg).toHaveAttribute('src', expect.stringContaining('116_2025_QH15_666020.jpg'));

    // Switch to Quy định AI & Miễn trừ tab
    const disclaimerTab = screen.getByRole('button', { name: /Quy định AI & Miễn trừ/i });
    fireEvent.click(disclaimerTab);

    expect(screen.getAllByText(/Quy Định Trí Tuệ Nhân Tạo & Miễn Trừ/i).length).toBeGreaterThan(0);
    const disclaimerImg = screen.getByRole('img', { name: /Quy Định Trí Tuệ Nhân Tạo & Miễn Trừ/i });
    expect(disclaimerImg).toHaveAttribute('src', expect.stringContaining('142_2026_ND-CP_696080.jpg'));
  });
});
