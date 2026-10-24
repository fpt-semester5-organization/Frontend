import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminDietarySchoolsPage from '../pages/AdminDietarySchoolsPage';
import AdminENumbersPage from '../pages/AdminENumbersPage';
import AdminIngredientsPage from '../pages/AdminIngredientsPage';

const SCHOOL = {
  dietarySchoolId: 2,
  schoolCode: 'LACTO',
  schoolName: 'Chay có sữa',
  forbiddenFoodRules: { forbiddenFoodGroups: ['EGG', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
};
const E120 = { code: 'E120', name: 'Carmine', veganStatus: 'NON_VEGAN', originSource: 'Côn trùng' };
const PEANUT = {
  ingredientId: 12,
  name: 'Đậu phộng',
  caloriesPer100g: 567,
  isAllium: false,
  defaultStallType: 'PLANT_PROTEIN',
  foodGroup: 'PLANT',
  allergens: [{ allergenId: 3, name: 'Đậu phộng' }],
};
const ALLERGENS = [
  { allergenId: 3, code: 'PEANUT', allergenName: 'Đậu phộng' },
  { allergenId: 5, code: 'SOY', allergenName: 'Đậu nành' },
];

describe('SCR-42 Trường phái ăn chay', () => {
  it('Backend chưa có route: nói rõ "Máy chủ chưa hỗ trợ" thay vì "Không tìm thấy"', async () => {
    mockApi(() => ({ status: 404 }));
    renderWithProviders(<AdminDietarySchoolsPage />, '/admin/dietary-schools');
    expect(await screen.findByText('Máy chủ chưa hỗ trợ chức năng này')).toBeInTheDocument();
  });

  it('sửa tên và nhóm cấm: PUT đúng cấu trúc forbiddenFoodRules (D109)', async () => {
    const calls = mockApi((req) => {
      if (req.method === 'GET' && req.url === '/admin/dietary-schools') return { data: [SCHOOL] };
      if (req.method === 'PUT') return { message: 'Đã cập nhật.', data: { dietarySchoolId: 2 } };
      return undefined;
    });
    renderWithProviders(<AdminDietarySchoolsPage />, '/admin/dietary-schools');
    expect(await screen.findByRole('heading', { name: 'Chay có sữa' })).toBeInTheDocument();
    expect(screen.getByText('Trứng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sửa Chay có sữa' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText(/Tên hiển thị/));
    await userEvent.type(within(dialog).getByLabelText(/Tên hiển thị/), 'Chay sữa');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Trứng' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Kiêng ngũ vị tân/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe('/admin/dietary-schools/2');
    expect(put.body).toEqual({ schoolName: 'Chay sữa', forbiddenFoodRules: { forbiddenFoodGroups: ['POULTRY', 'SEAFOOD'], forbidAllium: true } });
  });
});

describe('SCR-42 Từ điển E-number', () => {
  it('thêm mới: mã chuẩn hóa chữ in hoa, chỉ gửi trường có giá trị', async () => {
    const calls = mockApi((req) => {
      if (req.method === 'GET') return { data: [E120], meta: { page: 1, size: 20, total: 1 } };
      return { status: 201, message: 'Đã thêm.', data: { code: 'E441' } };
    });
    renderWithProviders(<AdminENumbersPage />, '/admin/e-numbers');
    const row = (await screen.findByText('Carmine')).closest('tr')!;
    expect(within(row).getByText('Không chay')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Thêm E-number/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Mã/), 'e441');
    await userEvent.selectOptions(within(dialog).getByLabelText(/Mức an toàn/), 'NON_VEGAN');
    await userEvent.type(within(dialog).getByLabelText(/Tên phụ gia/), 'Gelatin');
    await userEvent.type(within(dialog).getByLabelText(/Nguồn gốc/), 'Động vật');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm' }));

    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toBeDefined());
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      code: 'E441',
      name: 'Gelatin',
      veganStatus: 'NON_VEGAN',
      originSource: 'Động vật',
    });
  });

  it('409 ERR_ENUMBER_DUPLICATE: hộp thoại với message của server, giữ dữ liệu đã nhập', async () => {
    mockApi((req) =>
      req.method === 'GET'
        ? { data: [], meta: { page: 1, size: 20, total: 0 } }
        : { status: 409, errorCode: 'ERR_ENUMBER_DUPLICATE', message: 'Mã E120 đã tồn tại.' }
    );
    renderWithProviders(<AdminENumbersPage />, '/admin/e-numbers');
    expect(await screen.findByText('Từ điển chưa có E-number nào')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /Thêm E-number/ })[0]);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Mã/), 'E120');
    await userEvent.selectOptions(within(dialog).getByLabelText(/Mức an toàn/), 'NON_VEGAN');
    await userEvent.type(within(dialog).getByLabelText(/Tên phụ gia/), 'Carmine');
    await userEvent.type(within(dialog).getByLabelText(/Nguồn gốc/), 'Côn trùng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm' }));
    expect(await screen.findByText('Mã E120 đã tồn tại.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Tên phụ gia/)).toHaveValue('Carmine');
  });

  it('sửa mức an toàn: cảnh báo ảnh hưởng kết luận sản phẩm, chỉ gửi trường đổi', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET' ? { data: [E120], meta: { page: 1, size: 20, total: 1 } } : { data: { code: 'E120', veganStatus: 'DOUBTFUL' } }
    );
    renderWithProviders(<AdminENumbersPage />, '/admin/e-numbers');
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa E120' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText(/Mức an toàn/), 'DOUBTFUL');
    expect(within(dialog).getByText(/thay đổi kết luận chay của các sản phẩm chứa E120/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/admin/e-numbers/E120', body: { veganStatus: 'DOUBTFUL' } });
  });
});

describe('SCR-43 Nguyên liệu & dị ứng', () => {
  const handler = (req: { method: string; url: string }) => {
    if (req.url === '/allergens') return { data: ALLERGENS };
    if (req.method === 'GET') return { data: [PEANUT], meta: { page: 1, size: 20, total: 1 } };
    return { message: 'Đã cập nhật.', data: { ingredientId: 12 } };
  };

  it('sửa nguyên liệu: chỉ gửi trường đã đổi lên PUT /admin/ingredients/{id}', async () => {
    const calls = mockApi(handler);
    renderWithProviders(<AdminIngredientsPage />, '/admin/ingredients');
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa Đậu phộng' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText(/Calo trên 100 g/));
    await userEvent.type(within(dialog).getByLabelText(/Calo trên 100 g/), '570');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/admin/ingredients/12', body: { caloriesPer100g: 570 } });
  });

  it('gán nhóm dị ứng: thay toàn bộ danh sách bằng PUT .../allergens', async () => {
    const calls = mockApi(handler);
    renderWithProviders(<AdminIngredientsPage />, '/admin/ingredients');
    await userEvent.click(await screen.findByRole('button', { name: 'Dị ứng của Đậu phộng' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('checkbox', { name: 'Đậu phộng' })).toBeChecked();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Đậu nành' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu nhóm dị ứng' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/admin/ingredients/12/allergens', body: { allergenIds: [3, 5] } });
  });

  it('thêm nguyên liệu thiếu quầy hàng: lỗi dưới trường, không gọi API', async () => {
    const calls = mockApi(handler);
    renderWithProviders(<AdminIngredientsPage />, '/admin/ingredients');
    await userEvent.click(await screen.findByRole('button', { name: /Thêm nguyên liệu/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Tên nguyên liệu/), 'Nấm mỡ');
    await userEvent.type(within(dialog).getByLabelText(/Calo trên 100 g/), '22');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chọn quầy hàng');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});
