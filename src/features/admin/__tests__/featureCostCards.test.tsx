import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeatureCostCards } from '../components/FeatureCostCards';
import { buildCostMatrix, formatVnd, USD_TO_VND_RATE } from '../lib/llmops';

describe('formatVnd', () => {
  it('quy đổi USD sang VND theo tỷ giá tham khảo', () => {
    expect(formatVnd(1)).toBe(`≈ ${new Intl.NumberFormat('vi-VN').format(USD_TO_VND_RATE)} ₫`);
    expect(formatVnd(0)).toBe('≈ 0 ₫');
    expect(formatVnd(0.00001)).toBe('< 1 ₫');
  });
});

describe('FeatureCostCards', () => {
  it('hiển thị chi phí USD, VND và token cho Chat, Tủ lạnh, Thực đơn', () => {
    const matrix = buildCostMatrix([
      { date: '2026-11-10', feature: 'AI_CHAT', costUsd: 0.5, tokens: 1200 },
      { date: '2026-11-11', feature: 'AI_CHAT', costUsd: 0.25, tokens: 800 },
      { date: '2026-11-11', feature: 'AI_FRIDGE', costUsd: 0.1, tokens: 3000 },
    ]);
    render(<FeatureCostCards matrix={matrix} />);
    const chat = screen.getByTestId('feature-cost-AI_CHAT');
    expect(within(chat).getByText('Trợ lý dinh dưỡng')).toBeInTheDocument();
    expect(within(chat).getByText(formatVnd(0.75))).toBeInTheDocument();
    expect(within(chat).getByText(/2\.000 token/)).toBeInTheDocument();
    expect(within(screen.getByTestId('feature-cost-AI_FRIDGE')).getByText(/3\.000 token/)).toBeInTheDocument();
    // Tính năng chưa có dữ liệu vẫn hiện thẻ với 0
    expect(within(screen.getByTestId('feature-cost-MEAL_PLAN_GEN')).getByText('0 token')).toBeInTheDocument();
  });
});
