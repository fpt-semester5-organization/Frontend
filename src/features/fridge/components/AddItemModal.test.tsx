import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import { AddItemModal } from './AddItemModal';

const CATALOG = ['Bánh canh', 'Bắp cải tím', 'Cà chua chín đỏ', 'Cà rốt củ tươi'].map((name, index) => ({ ingredientId: index + 1, name }));

/** Giống Backend thật: chỉ đọc `keyword`, tham số lạ bị bỏ qua nên trả về cả danh mục. */
const mockCatalog = () =>
  mockApi((req) => {
    if (req.url !== '/ingredients') return undefined;
    const { keyword = '' } = req.params as { keyword?: string };
    const items = CATALOG.filter((item) => item.name.toLowerCase().includes(keyword.toLowerCase()));
    return { data: items, meta: { page: 1, size: 20, total: items.length } };
  });

const openModal = () => renderWithProviders(<AddItemModal show onHide={vi.fn()} />);
const searchBox = () => screen.getByLabelText(/Chọn nguyên liệu hệ thống/);
const HINT = 'Nhập từ khóa để tìm nguyên liệu chuẩn';

describe('AddItemModal: gợi ý nguyên liệu', () => {
  it('gửi đúng tham số keyword, size của GET /ingredients và chỉ hiện nguyên liệu khớp từ khóa', async () => {
    const calls = mockCatalog();
    openModal();

    await userEvent.type(searchBox(), 'cà');

    expect(await screen.findByRole('option', { name: 'Cà rốt củ tươi' })).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Cà chua chín đỏ', 'Cà rốt củ tươi']);
    expect(calls.find((call) => call.url === '/ingredients')?.params).toEqual({ keyword: 'cà', page: 1, size: 20 });
  });

  it('từ khóa không có trong danh mục: không hiện nguyên liệu nào, cho dùng tên vừa nhập', async () => {
    mockCatalog();
    openModal();

    await userEvent.type(searchBox(), 'cơm');

    expect(await screen.findByRole('button', { name: /Dùng tên: “cơm”/ })).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('chưa nhập hoặc đã xóa từ khóa: hiện lời nhắc, không báo đang tìm và không gọi API', async () => {
    const calls = mockCatalog();
    openModal();

    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.queryByText('Đang tìm nguyên liệu...')).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await userEvent.type(searchBox(), 'cà');
    await screen.findByRole('option', { name: 'Cà rốt củ tươi' });
    await userEvent.clear(searchBox());

    await waitFor(() => expect(screen.getByText(HINT)).toBeInTheDocument());
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('bấm "Dùng tên": gửi tên vừa nhập, không kèm ingredientId', async () => {
    const calls = mockCatalog();
    openModal();

    await userEvent.type(searchBox(), 'cơm');
    await userEvent.click(await screen.findByRole('button', { name: /Dùng tên: “cơm”/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào tủ' }));

    await waitFor(() => expect(calls.find((call) => call.method === 'POST')).toBeDefined());
    expect(calls.find((call) => call.method === 'POST')).toMatchObject({ url: '/fridge/items', body: { customItemName: 'cơm', freshnessStatus: 'FRESH' } });
    expect(calls.find((call) => call.method === 'POST')?.body).not.toHaveProperty('ingredientId');
  });

  it('chọn một gợi ý: gửi đúng ingredientId của nguyên liệu đó', async () => {
    const calls = mockCatalog();
    openModal();

    await userEvent.type(searchBox(), 'cà');
    await userEvent.click(await screen.findByRole('option', { name: 'Cà rốt củ tươi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào tủ' }));

    await waitFor(() => expect(calls.find((call) => call.method === 'POST')).toBeDefined());
    expect(calls.find((call) => call.method === 'POST')).toMatchObject({ url: '/fridge/items', body: { ingredientId: 4, customItemName: 'Cà rốt củ tươi' } });
  });
});
