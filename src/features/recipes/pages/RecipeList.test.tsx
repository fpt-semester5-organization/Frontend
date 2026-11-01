import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MockRequest } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useUiStore } from '@/stores/ui.store';
import { listItem, mockRecipesApi, signInAsGuest } from '../test/recipeFixtures';
import RecipeList from './RecipeList';

const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;
const recipeCalls = (calls: MockRequest[]) => calls.filter((c) => c.url === '/recipes').map((c) => c.params as Record<string, unknown>);
const results = () => screen.getByRole('region', { name: /Tất cả công thức|Kết quả cho/ });

/** 12 món/trang, tổng 14 món: trang 2 còn 2 món. */
const pagedRecipes = (req: MockRequest) => {
  if (req.url !== '/recipes') return undefined;
  const page = (req.params as { page: number }).page;
  const ids = page === 1 ? Array.from({ length: 12 }, (_, i) => i + 1) : [13, 14];
  return { data: ids.map((id) => listItem(id)), meta: { page, size: 12, total: 14, signUpPromptAtItem: 5 } };
};

// IntersectionObserver giả để kiểm tra mục được theo dõi cho BR-GUEST-01.
const observed: { node: Element; cb: IntersectionObserverCallback }[] = [];
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(node: Element) {
    observed.push({ node, cb: this.cb });
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  signInAsGuest();
  window.localStorage.clear();
  observed.length = 0;
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: FakeObserver });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
});

describe('RecipeList (SCR-11)', () => {
  it('hiện skeleton rồi lưới công thức, tổng số và phân trang', async () => {
    mockRecipesApi(pagedRecipes);
    renderPage(<RecipeList />, { route: '/recipes' });
    expect(screen.getByRole('status', { name: 'Đang tải công thức' })).toBeInTheDocument();
    expect(await screen.findByText('Món chay số 1')).toBeInTheDocument();
    expect(within(results()).getAllByRole('article')).toHaveLength(12);
    expect(screen.getByText('14 công thức')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Món chay số 1' })).toHaveAttribute('href', '/recipes/1');
    expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeInTheDocument();
  });

  it('đọc bộ lọc từ URL và gửi đúng tham số GET /recipes', async () => {
    const calls = mockRecipesApi(pagedRecipes);
    renderPage(<RecipeList />, { route: '/recipes?q=canh&ingredient=nấm&school=1&category=4&time=30&type=VIDEO&sort=NEWEST&page=2' });
    await screen.findByText('Món chay số 13');
    expect(recipeCalls(calls)[0]).toEqual({
      keyword: 'canh',
      ingredient: 'nấm',
      dietarySchoolId: 1,
      categoryId: 4,
      maxCookTime: 30,
      contentType: 'VIDEO',
      sort: 'NEWEST',
      page: 2,
      size: 12,
    });
    expect(screen.getByRole('searchbox', { name: 'Tìm công thức theo tên hoặc mô tả' })).toHaveValue('canh');
    expect(await screen.findByRole('button', { name: 'Bỏ lọc Thuần chay' })).toBeInTheDocument();
  });

  it('đổi bộ lọc thì về trang 1 và ghi vào URL', async () => {
    const calls = mockRecipesApi(pagedRecipes);
    renderPage(
      <>
        <RecipeList />
        <LocationProbe />
      </>,
      { route: '/recipes?page=2' }
    );
    await screen.findByText('Món chay số 13');
    await screen.findByRole('option', { name: 'Thuần chay' });
    await userEvent.selectOptions(screen.getByLabelText('Trường phái'), '1');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?school=1'));
    await userEvent.selectOptions(screen.getByLabelText('Thời gian nấu'), '30');
    await waitFor(() => expect(recipeCalls(calls).at(-1)).toMatchObject({ dietarySchoolId: 1, maxCookTime: 30, page: 1 }));

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm công thức theo tên hoặc mô tả' }), 'đậu hũ');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Có nguyên liệu' }), 'nấm');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(recipeCalls(calls).at(-1)).toMatchObject({ keyword: 'đậu hũ', ingredient: 'nấm', page: 1 }));
    expect(await screen.findByRole('heading', { name: 'Kết quả cho “đậu hũ”' })).toBeInTheDocument();
  });

  it('thẻ công thức hiện món ăn (tên chung) phía trên tên công thức', async () => {
    mockRecipesApi((req) =>
      req.url === '/recipes'
        ? { data: [listItem(1, { foodId: 7, foodName: 'Đậu phụ chiên sả', title: 'Đậu phụ chiên sả ớt kiểu Huế' })], meta: { page: 1, size: 12, total: 1 } }
        : undefined
    );
    renderPage(<RecipeList />, { route: '/recipes' });
    const card = (await screen.findByRole('link', { name: 'Đậu phụ chiên sả ớt kiểu Huế' })).closest('article')!;
    expect(within(card).getByText('Đậu phụ chiên sả')).toBeInTheDocument();
  });

  it('lọc theo món ăn: link ?food= gửi foodId, hiện tên món trên ô lọc và chip bỏ lọc', async () => {
    const calls = mockRecipesApi(pagedRecipes);
    renderPage(
      <>
        <RecipeList />
        <LocationProbe />
      </>,
      { route: '/recipes?food=7' }
    );
    await screen.findByText('Món chay số 1');
    expect(recipeCalls(calls)[0]).toMatchObject({ foodId: 7 });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Lọc theo món ăn' })).toHaveValue('Đậu phụ chiên sả'));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ lọc Món: Đậu phụ chiên sả' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^$/));
    await waitFor(() => expect(recipeCalls(calls).at(-1)).not.toHaveProperty('foodId'));
  });

  it('chọn món trong ô lọc thì lọc ngay theo món đó', async () => {
    const calls = mockRecipesApi(pagedRecipes);
    renderPage(
      <>
        <RecipeList />
        <LocationProbe />
      </>,
      { route: '/recipes' }
    );
    await screen.findByText('Món chay số 1');
    await userEvent.type(screen.getByRole('combobox', { name: 'Lọc theo món ăn' }), 'cháo');
    const option = await screen.findByRole('option', { name: 'Cháo đậu xanh' });
    // Bộ lọc kho công thức chỉ chọn món có sẵn, không có dòng "Thêm món mới".
    expect(screen.queryByRole('option', { name: /Thêm món mới/ })).not.toBeInTheDocument();
    await userEvent.click(option);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?food=3'));
    await waitFor(() => expect(recipeCalls(calls).at(-1)).toMatchObject({ foodId: 3, page: 1 }));
  });

  it('bấm số trang thì tải trang đó', async () => {
    const calls = mockRecipesApi(pagedRecipes);
    renderPage(<RecipeList />, { route: '/recipes' });
    await screen.findByText('Món chay số 1');
    await userEvent.click(screen.getByRole('button', { name: 'Trang 2' }));
    expect(await screen.findByText('Món chay số 14')).toBeInTheDocument();
    expect(recipeCalls(calls).map((p) => p.page)).toEqual([1, 2]);
  });

  it('rỗng khi đang lọc thì gợi ý xóa bộ lọc', async () => {
    mockRecipesApi((req) => (req.url === '/recipes' ? { data: [], meta: { page: 1, size: 12, total: 0 } } : undefined));
    renderPage(
      <>
        <RecipeList />
        <LocationProbe />
      </>,
      { route: '/recipes?q=xyz&time=15&sort=NEWEST' }
    );
    expect(await screen.findByText('Không tìm thấy công thức phù hợp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    // Giữ cách sắp xếp, bỏ mọi điều kiện lọc.
    expect(screen.getByTestId('location')).toHaveTextContent(/^\?sort=NEWEST$/);
  });

  it('rỗng khi không lọc thì mời đăng công thức', async () => {
    mockRecipesApi((req) => (req.url === '/recipes' ? { data: [], meta: { page: 1, size: 12, total: 0 } } : undefined));
    renderPage(<RecipeList />, { route: '/recipes' });
    expect(await screen.findByText('Chưa có công thức nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng công thức' })).toHaveAttribute('href', '/recipes/new');
  });

  it('lỗi 500 hiện trạng thái lỗi và thử lại được', async () => {
    let fail = true;
    mockRecipesApi((req) =>
      req.url !== '/recipes'
        ? undefined
        : fail
          ? { status: 500, errorCode: 'ERR_SYS_DATABASE_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu.' }
          : { data: [listItem(9)], meta: { page: 1, size: 12, total: 1 } }
    );
    renderPage(<RecipeList />, { route: '/recipes' });
    expect(await screen.findByText('Không kết nối được cơ sở dữ liệu.', {}, { timeout: 3000 })).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Món chay số 9')).toBeInTheDocument();
  });

  it('BR-GUEST-01: Khách lướt tới mục thứ 5 thì mời đăng ký', async () => {
    mockRecipesApi(pagedRecipes);
    renderPage(<RecipeList />, { route: '/recipes' });
    await screen.findByText('Món chay số 5');
    const fifth = within(results()).getAllByRole('article')[4];
    expect(observed.map((o) => o.node)).toEqual([fifth]);
    act(() => {
      observed[0].cb([{ isIntersecting: true, target: fifth } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(useUiStore.getState().signupPrompt).toMatchObject({ open: true, reason: 'browse' });
  });
});
