import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PATHS } from '@/routes/paths';
import { QuotaMeter } from '../components/QuotaMeter';

describe('QuotaMeter Component', () => {
  it('hiển thị đầy đủ nhãn, số lượng đã dùng, giới hạn và đơn vị', () => {
    renderWithProviders(
      <QuotaMeter
        label="Hạn mức hội thoại hôm nay"
        used={5}
        limit={20}
        unit="câu"
        isAuthenticated={true}
        isVip={false}
      />
    );

    expect(screen.getByText('Hạn mức hội thoại hôm nay')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('/ 20 câu')).toBeInTheDocument();
    expect(screen.getByText('Trợ lý Dinh dưỡng VeggieLife')).toBeInTheDocument();
  });

  it('tính toán đúng thanh tiến trình và hiển thị màu cảnh báo khi đạt ngưỡng >= 80%', () => {
    const { container } = renderWithProviders(
      <QuotaMeter
        label="Hạn mức Khách"
        used={18}
        limit={20}
        unit="câu"
        isAuthenticated={true}
        isVip={false}
      />
    );

    // 18 / 20 = 90%
    const progressBar = container.querySelector('.bg-warning');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '90%' });
  });

  it('hiển thị liên kết nâng cấp VIP khi người dùng là Thành viên thường', () => {
    renderWithProviders(
      <QuotaMeter
        label="Hạn mức Thành viên"
        used={2}
        limit={20}
        unit="câu"
        isAuthenticated={true}
        isVip={false}
      />
    );

    const upgradeLink = screen.getByRole('link', { name: /Nâng cấp VIP/i });
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink).toHaveAttribute('href', PATHS.SUBSCRIPTION.PRICING);
  });

  it('hiển thị liên kết Đăng ký khi là Khách vãng lai chưa đăng nhập', () => {
    renderWithProviders(
      <QuotaMeter
        label="Dùng thử Khách vãng lai"
        used={1}
        limit={3}
        unit="câu"
        isAuthenticated={false}
        isVip={false}
      />
    );

    const registerLink = screen.getByRole('link', { name: /Đăng ký để nhận 20 câu\/ngày/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', PATHS.AUTH.REGISTER);
  });

  it('ẩn liên kết nâng cấp khi người dùng đã có gói VIP', () => {
    renderWithProviders(
      <QuotaMeter
        label="Hạn mức VIP"
        used={10}
        limit={100}
        unit="câu"
        isAuthenticated={true}
        isVip={true}
      />
    );

    expect(screen.queryByRole('link', { name: /Nâng cấp VIP/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Đăng ký để nhận/i })).not.toBeInTheDocument();
  });
});
