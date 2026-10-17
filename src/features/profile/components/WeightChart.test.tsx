import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeightChart } from './WeightChart';

describe('WeightChart', () => {
  it('nhiều mốc cùng ngày thì mốc ghi sau (logId lớn hơn) là mốc cuối, dù Backend trả mới nhất trước', () => {
    const entries = [
      { logId: 2, weightKg: 62, loggedDate: '2026-10-17' },
      { logId: 1, weightKg: 62.5, loggedDate: '2026-10-17' },
    ];
    render(<WeightChart entries={entries} targetWeightKg={null} />);
    expect(screen.getByText('Thay đổi:').textContent).toBe('Thay đổi: -0,5 kg');
    expect(screen.getByRole('img', { name: /từ 62,5 kg .* đến 62 kg/ })).toBeInTheDocument();
  });
});
