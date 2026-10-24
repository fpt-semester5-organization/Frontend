import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostCard } from './PostCard';
import type { CommunityFeedItem } from '../types/community.types';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe('PostCard Component (SCR-25)', () => {
  const mockPostItem: CommunityFeedItem = {
    key: 'post-1',
    kind: 'POST',
    id: 1,
    title: 'Cách nấu canh chua chay thanh đạm',
    authorName: 'Nguyễn Văn A',
    imageUrl: 'https://example.com/invalid-image.jpg',
    createdAt: '2026-10-20T10:00:00Z',
    voteCount: 15,
    commentCount: 4,
  };

  it('Hiển thị thông tin bài viết và fallback gradient khi ảnh lỗi', () => {
    const { container } = renderWithProviders(<PostCard item={mockPostItem} />);

    expect(screen.getByText('Cách nấu canh chua chay thanh đạm')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Bài viết')).toBeInTheDocument();

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.com/invalid-image.jpg');

    // Giả lập lỗi tải ảnh
    if (img) fireEvent.error(img);

    // Ảnh biến mất và thay thế bằng icon thương hiệu fallback
    expect(container.querySelector('img')).toBeNull();
  });

  it('Hiển thị nhãn công thức và thông tin dinh dưỡng khi là RECIPE', () => {
    const mockRecipeItem: CommunityFeedItem = {
      key: 'recipe-2',
      kind: 'RECIPE',
      id: 2,
      title: 'Đậu hũ sốt cà chua',
      authorName: 'Bếp Chay VeggieLife',
      cookTimeMinutes: 20,
      caloriesKcal: 250,
      dietarySchool: 'Thuần chay (Vegan)',
      createdAt: '2026-10-21T08:00:00Z',
      voteCount: 8,
      commentCount: 2,
    };

    renderWithProviders(<PostCard item={mockRecipeItem} />);

    expect(screen.getByText('Đậu hũ sốt cà chua')).toBeInTheDocument();
    expect(screen.getByText('Công thức')).toBeInTheDocument();
    expect(screen.getByText('20 phút')).toBeInTheDocument();
    expect(screen.getByText('250 kcal')).toBeInTheDocument();
    expect(screen.getByText('Thuần chay (Vegan)')).toBeInTheDocument();
  });
});
