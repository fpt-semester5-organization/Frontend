import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealPlanListToolbar } from '../../components/MealPlanListToolbar';
import type { MealPlanSortOption, MealPlanStatusFilter } from '../../types/mealPlan.types';

describe('MealPlanListToolbar Component', () => {
  const defaultCounts: Record<MealPlanStatusFilter, number> = {
    ALL: 5,
    ACTIVE: 1,
    DRAFT: 2,
    CANCELLED: 1,
    ARCHIVED: 1,
  };

  it('renders all status tabs with correct badges and accessible attributes', () => {
    const onStatusChange = vi.fn();
    const onKeywordChange = vi.fn();
    const onSortChange = vi.fn();
    const onReset = vi.fn();

    render(
      <MealPlanListToolbar
        status="ALL"
        keyword=""
        sort="newest"
        counts={defaultCounts}
        onStatusChange={onStatusChange}
        onKeywordChange={onKeywordChange}
        onSortChange={onSortChange}
        onReset={onReset}
      />
    );

    // Kiểm tra các nhãn Tab xuất hiện
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getByText('Đang áp dụng')).toBeInTheDocument();
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    expect(screen.getByText('Đã lưu trữ')).toBeInTheDocument();

    // Kiểm tra số lượng trên badges
    expect(screen.getByText('5')).toBeInTheDocument(); // ALL
    expect(screen.getByText('2')).toBeInTheDocument(); // DRAFT
  });

  it('triggers onStatusChange when a tab is clicked', () => {
    const onStatusChange = vi.fn();

    render(
      <MealPlanListToolbar
        status="ALL"
        keyword=""
        sort="newest"
        counts={defaultCounts}
        onStatusChange={onStatusChange}
        onKeywordChange={vi.fn()}
        onSortChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const cancelledTab = screen.getByRole('tab', { name: /đã hủy/i });
    fireEvent.click(cancelledTab);

    expect(onStatusChange).toHaveBeenCalledWith('CANCELLED');
  });

  it('triggers onKeywordChange when typing in the search input', () => {
    const onKeywordChange = vi.fn();

    render(
      <MealPlanListToolbar
        status="ALL"
        keyword="01/11"
        sort="newest"
        counts={defaultCounts}
        onStatusChange={vi.fn()}
        onKeywordChange={onKeywordChange}
        onSortChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/tìm theo tên thực đơn/i);
    expect(searchInput).toHaveValue('01/11');

    fireEvent.change(searchInput, { target: { value: 'Thực Dưỡng' } });
    expect(onKeywordChange).toHaveBeenCalledWith('Thực Dưỡng');
  });

  it('shows clear button when keyword is not empty and clears input on click', () => {
    const onKeywordChange = vi.fn();

    render(
      <MealPlanListToolbar
        status="ALL"
        keyword="abc"
        sort="newest"
        counts={defaultCounts}
        onStatusChange={vi.fn()}
        onKeywordChange={onKeywordChange}
        onSortChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const clearBtn = screen.getByLabelText(/xóa từ khóa tìm kiếm/i);
    fireEvent.click(clearBtn);

    expect(onKeywordChange).toHaveBeenCalledWith('');
  });

  it('triggers onSortChange when selecting a different sort option', () => {
    const onSortChange = vi.fn();

    render(
      <MealPlanListToolbar
        status="ALL"
        keyword=""
        sort="newest"
        counts={defaultCounts}
        onStatusChange={vi.fn()}
        onKeywordChange={vi.fn()}
        onSortChange={onSortChange}
        onReset={vi.fn()}
      />
    );

    const sortSelect = screen.getByLabelText(/sắp xếp danh sách thực đơn/i);
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });

    expect(onSortChange).toHaveBeenCalledWith('oldest');
  });

  it('shows reset button when filters are active and triggers onReset', () => {
    const onReset = vi.fn();

    render(
      <MealPlanListToolbar
        status="CANCELLED"
        keyword=""
        sort="newest"
        counts={defaultCounts}
        onStatusChange={vi.fn()}
        onKeywordChange={vi.fn()}
        onSortChange={vi.fn()}
        onReset={onReset}
      />
    );

    const resetBtn = screen.getByTitle(/khôi phục bộ lọc mặc định/i);
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalled();
  });
});
