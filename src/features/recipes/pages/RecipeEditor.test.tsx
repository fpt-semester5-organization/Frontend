import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MockRequest, MockResponse } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { mockRecipesApi, signInAsGuest, signInAsMember } from '../test/recipeFixtures';
import RecipeEditor from './RecipeEditor';

const DetailProbe = () => <p>Đã mở chi tiết {useParams().id}</p>;

const renderEditor = () =>
  renderPage(
    <Routes>
      <Route path="/recipes/new" element={<RecipeEditor />} />
      <Route path="/recipes/:id" element={<DetailProbe />} />
    </Routes>,
    { route: '/recipes/new' }
  );

const writes = (calls: MockRequest[]) => calls.filter((c) => c.method !== 'GET');
const submitButton = () => screen.getByRole('button', { name: /Gửi duyệt & đăng/ });
const draftButton = () => screen.getByRole('button', { name: /Lưu nháp/ });

async function pickIngredient(index: number, text: string, name: string) {
  await userEvent.type(screen.getByLabelText(`Nguyên liệu ${index + 1}`), text);
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
}

/** Điền form hợp lệ: Thuần chay, Món chiên, nấu 20 phút, 300 g đậu phụ, 2 bước. */
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/Tên món/), 'Đậu phụ chiên sả ớt');
  await screen.findByRole('option', { name: 'Thuần chay' });
  await userEvent.selectOptions(screen.getByLabelText(/Trường phái ăn chay/), '1');
  await screen.findByRole('option', { name: 'Món chiên' });
  await userEvent.selectOptions(screen.getByLabelText(/Danh mục món/), '4');
  await userEvent.type(screen.getByLabelText(/^Nấu/), '20');
  await pickIngredient(0, 'đậu', 'Đậu phụ');
  await userEvent.type(screen.getByLabelText('Định lượng nguyên liệu 1'), '300');
  await userEvent.type(screen.getByLabelText('Bước 1'), 'Cắt đậu thành khối.');
  await userEvent.type(screen.getByLabelText('Bước 2'), 'Chiên vàng giòn.');
}

const EXPECTED_BODY = {
  title: 'Đậu phụ chiên sả ớt',
  categoryId: 4,
  dietarySchoolId: 1,
  instructions: ['Cắt đậu thành khối.', 'Chiên vàng giòn.'],
  cookTimeMinutes: 20,
  ingredients: [{ ingredientId: 1, quantity: 300, unit: 'g' }],
};

const created = (status: string): MockResponse => ({
  status: 201,
  message: status === 'DRAFT' ? 'Đã lưu nháp.' : 'Đã gửi công thức.',
  data: { recipeId: 700, status, aiConfidence: 0.1 },
});

beforeAll(() => {
  // jsdom chưa có URL.createObjectURL (xem trước ảnh đã chọn).
  URL.createObjectURL = () => 'blob:preview';
  URL.revokeObjectURL = () => {};
});

describe('RecipeEditor (SCR-13)', () => {
  it('Khách xem được form; bấm gửi thì mở SignupPromptModal và không gọi API', async () => {
    signInAsGuest();
    const calls = mockRecipesApi();
    renderEditor();
    expect(screen.getByRole('heading', { level: 1, name: 'Soạn công thức chay' })).toBeInTheDocument();
    await userEvent.click(submitButton());
    expect(useUiStore.getState().signupPrompt.open).toBe(true);
    await userEvent.click(draftButton());
    expect(writes(calls)).toHaveLength(0);
    expect(screen.queryByText('Tên món cần ít nhất 10 ký tự.')).not.toBeInTheDocument();
  });

  describe('Thành viên', () => {
    beforeEach(() => signInAsMember());

    it('form trống: báo lỗi dưới từng trường, không gọi API', async () => {
      const calls = mockRecipesApi();
      renderEditor();
      await userEvent.click(submitButton());
      expect(await screen.findByText('Tên món cần ít nhất 10 ký tự.')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng chọn trường phái ăn chay.')).toBeInTheDocument();
      expect(screen.getByText('Thời gian nấu phải lớn hơn 0 phút.')).toBeInTheDocument();
      expect(screen.getByText(/Chọn nguyên liệu từ danh sách gợi ý/)).toBeInTheDocument();
      expect(screen.getAllByText('Nhập nội dung bước hoặc xóa bước này.')).toHaveLength(2);
      expect(writes(calls)).toHaveLength(0);
    });

    it('lưu nháp bằng POST, gửi duyệt lần sau bằng PUT rồi mở trang chi tiết khi được đăng', async () => {
      const calls = mockRecipesApi((req) => {
        if (req.method === 'POST' && req.url === '/recipes') return created('DRAFT');
        if (req.method === 'PUT' && req.url === '/recipes/700')
          return { message: 'Đã đăng công thức.', data: { recipeId: 700, status: 'APPROVED_ACTIVE', moderated: true } };
        return undefined;
      });
      renderEditor();
      await fillValidForm();
      expect(screen.getByLabelText('Đơn vị nguyên liệu 1')).toHaveValue('g'); // lấy đơn vị chuẩn của nguyên liệu

      await userEvent.click(draftButton());
      expect(await screen.findByText(/Bản nháp · đã lưu lúc/)).toBeInTheDocument();
      expect(writes(calls)[0]).toMatchObject({ method: 'POST', url: '/recipes', body: { ...EXPECTED_BODY, submit: false } });

      await userEvent.click(submitButton());
      expect(await screen.findByText('Đã mở chi tiết 700')).toBeInTheDocument();
      expect(writes(calls)[1]).toMatchObject({ method: 'PUT', url: '/recipes/700', body: { ...EXPECTED_BODY, submit: true } });
      expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Đã đăng công thức.');
    });

    it('tải ảnh lên sau khi có recipeId; chờ kiểm duyệt thì báo chưa công khai', async () => {
      const calls = mockRecipesApi((req) => {
        if (req.url === '/recipes' && req.method === 'POST') return created('PENDING_REVIEW');
        if (req.url === '/videos') return { status: 202, message: 'Đã tải ảnh lên.', data: { videoId: 1, status: 'READY' } };
        return undefined;
      });
      renderEditor();
      await fillValidForm();
      const image = new File(['img'], 'dau-phu.png', { type: 'image/png' });
      await userEvent.upload(screen.getByLabelText('Chọn ảnh hoặc video đính kèm'), image);
      expect(await screen.findByText('dau-phu.png')).toBeInTheDocument();

      await userEvent.click(submitButton());
      expect(await screen.findByText('Công thức đang chờ kiểm duyệt')).toBeInTheDocument();
      const upload = writes(calls).find((c) => c.url === '/videos');
      expect(upload?.body).toBeInstanceOf(FormData);
      expect((upload?.body as FormData).get('recipeId')).toBe('700');
      expect(writes(calls).map((c) => c.url)).toEqual(['/recipes', '/videos']);
    });

    it('422 Red Alert: hiện khung cảnh báo với message của server, giữ dữ liệu đã nhập', async () => {
      mockRecipesApi((req) =>
        req.url === '/recipes' && req.method === 'POST'
          ? { status: 422, errorCode: 'ERR_RECIPE_RED_ALERT', message: '“Trứng gà” không phù hợp trường phái Thuần chay.' }
          : undefined
      );
      renderEditor();
      await fillValidForm();
      await userEvent.click(submitButton());
      const title = await screen.findByText('Nguyên liệu không hợp với trường phái đã chọn');
      const alert = title.closest('[role="alert"]') as HTMLElement;
      expect(within(alert).getByText('“Trứng gà” không phù hợp trường phái Thuần chay.')).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên món/)).toHaveValue('Đậu phụ chiên sả ớt');
    });

    it('400 ERR_VALIDATION: lỗi server hiện dưới đúng trường', async () => {
      mockRecipesApi((req) =>
        req.url === '/recipes' && req.method === 'POST'
          ? {
              status: 400,
              errorCode: 'ERR_VALIDATION',
              message: 'Dữ liệu đầu vào không hợp lệ.',
              details: [
                { field: 'title', message: 'Tên món đã tồn tại.' },
                { field: 'ingredients[0].quantity', message: 'Định lượng vượt giới hạn.' },
              ],
            }
          : undefined
      );
      renderEditor();
      await fillValidForm();
      await userEvent.click(draftButton());
      expect(await screen.findByText('Tên món đã tồn tại.')).toBeInTheDocument();
      expect(screen.getByText('Định lượng vượt giới hạn.')).toBeInTheDocument();
    });

    it('409 ERR_RECIPE_LOCKED: hộp thoại giải thích', async () => {
      mockRecipesApi((req) =>
        req.url === '/recipes' && req.method === 'POST'
          ? { status: 409, errorCode: 'ERR_RECIPE_LOCKED', message: 'Công thức đang chờ quản trị viên xem xét.' }
          : undefined
      );
      renderEditor();
      await fillValidForm();
      await userEvent.click(submitButton());
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Công thức đang chờ quản trị viên xem xét.')).toBeInTheDocument();
    });

    it('429: khóa nút gửi tạm thời', async () => {
      mockRecipesApi((req) =>
        req.url === '/recipes' && req.method === 'POST'
          ? { status: 429, errorCode: 'ERR_POST_DAILY_LIMIT_EXCEEDED', message: 'Bạn đã đạt giới hạn số bài đăng trong ngày.' }
          : undefined
      );
      renderEditor();
      await fillValidForm();
      await userEvent.click(submitButton());
      expect(await screen.findByText(/Thao tác quá nhanh, thử lại sau 30 giây/)).toBeInTheDocument();
      expect(submitButton()).toBeDisabled();
      expect(draftButton()).toBeDisabled();
    });

    it('nguyên liệu trái trường phái được cảnh báo sớm (D109)', async () => {
      mockRecipesApi();
      renderEditor();
      await screen.findByRole('option', { name: 'Thuần chay' });
      await userEvent.selectOptions(screen.getByLabelText(/Trường phái ăn chay/), '1');
      await pickIngredient(0, 'trứng', 'Trứng gà');
      await waitFor(() => expect(screen.getByText(/Thuần chay không dùng trứng/)).toBeInTheDocument());
      expect(screen.getByLabelText('Đơn vị nguyên liệu 1')).toHaveValue('quả');
    });
  });
});
