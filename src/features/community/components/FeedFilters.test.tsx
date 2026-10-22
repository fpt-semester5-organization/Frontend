import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { FeedFilters } from './FeedFilters';

const SCHOOLS = [
  { dietarySchoolId: 1, schoolName: 'Thuần chay (Vegan)' },
  { dietarySchoolId: 2, schoolName: 'Chay có sữa (Lacto-Vegetarian)' },
];

const mockMasterData = () =>
  mockApi((req) => {
    if (req.url === '/dietary-schools') return { data: SCHOOLS };
    if (req.url === '/categories') return { data: [{ categoryId: 3, categoryName: 'Món chính' }] };
    return undefined;
  });

describe('FeedFilters — nhóm lọc thu gọn được, thân có thanh cuộn riêng', () => {
  it('mở sẵn "Loại nội dung" và "Sắp xếp theo", các nhóm khác thu gọn', async () => {
    mockMasterData();
    renderPage(<FeedFilters />, { route: '/community' });

    expect(screen.getByRole('button', { name: /Loại nội dung/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Sắp xếp theo/ })).toHaveAttribute('aria-expanded', 'true');
    const school = screen.getByRole('button', { name: /Trường phái ăn chay/ });
    expect(school).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Thuần chay (Vegan)')).not.toBeInTheDocument();

    await userEvent.click(school);
    expect(school).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Thuần chay (Vegan)')).toBeInTheDocument();
  });

  it('nhóm đang có điều kiện lọc từ URL được mở sẵn', async () => {
    mockMasterData();
    renderPage(<FeedFilters />, { route: '/community?dietarySchoolId=2&maxCookTime=30' });

    expect(screen.getByRole('button', { name: /Trường phái ăn chay/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Thời gian nấu/ })).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('radio', { name: 'Chay có sữa (Lacto-Vegetarian)' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Đặt lại (2)' })).toBeInTheDocument();
  });
});
