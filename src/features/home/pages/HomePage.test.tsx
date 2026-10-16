import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi, type MockRequest, type MockResponse } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import HomePage from './HomePage';

const recipe = (id: number, extra: Partial<Record<string, unknown>> = {}) => ({
  recipeId: id,
  type: 'RECIPE',
  title: `Món chay số ${id}`,
  imageUrl: null,
  dietarySchool: 'VEGAN',
  cookTimeMinutes: 20,
  caloriesKcal: 300,
  voteCount: 10,
  isVerified: false,
  ...extra,
});

const SCHOOLS = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay', forbiddenFoodGroups: [], forbidAllium: false },
  { dietarySchoolId: 4, schoolCode: 'LACTO_OVO', schoolName: 'Ăn chay có trứng và sữa', forbiddenFoodGroups: [], forbidAllium: false },
];

/** API giả mặc định: 6 công thức, 1 bài viết; `recipes` thay được theo từng ca. */
function mockHome(recipes: (req: MockRequest) => MockResponse | undefined = () => ({
  data: [1, 2, 3, 4, 5, 6].map((id) => recipe(id)),
  meta: { page: 1, size: 9, total: 6, signUpPromptAtItem: 5 },
})) {
  return mockApi((req) => {
    if (req.url === '/recipes') return recipes(req);
    if (req.url === '/dietary-schools') return { data: SCHOOLS };
    if (req.url === '/posts')
      return {
        data: [{ postId: 77, title: 'Một tuần ăn chay', authorName: 'Nguyễn An', imageUrl: null, voteCount: 3, commentCount: 1, createdAt: '2026-10-15T08:00:00Z' }],
        meta: { page: 1, size: 3, total: 1 },
      };
    return undefined;
  });
}

const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;

// IntersectionObserver giả: test tự quyết định khi nào phần tử "lọt vào màn hình".
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
const scrollTo = (node: Element) =>
  act(() => {
    observed
      .filter((o) => o.node === node)
      .forEach((o) => o.cb([{ isIntersecting: true, target: node } as IntersectionObserverEntry], {} as IntersectionObserver));
  });

beforeEach(() => {
  window.localStorage.clear();
  observed.length = 0;
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: FakeObserver });
  useAuthStore.setState({ user: null, accessToken: null, guestToken: 'guest-jwt' });
  useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' } });
});

afterEach(() => {
  delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
});

const recipeCards = () => within(screen.getByRole('region', { name: /Công thức nổi bật|Kết quả cho/ })).queryAllByRole('article');

describe('HomePage (SCR-10)', () => {
  it('hiện skeleton khi đang tải rồi hiện bảng tin công thức và bài cộng đồng', async () => {
    mockHome();
    renderPage(<HomePage />);
    expect(screen.getByRole('status', { name: 'Đang tải công thức' })).toBeInTheDocument();
    expect(await screen.findByText('Món chay số 1')).toBeInTheDocument();
    expect(recipeCards()).toHaveLength(6);
    expect(screen.getByText('6 công thức và video')).toBeInTheDocument();
    expect(await screen.findByText('Một tuần ăn chay')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Món chay số 1' })).toHaveAttribute('href', '/recipes/1');
  });

  it('danh sách rỗng khi đang lọc thì gợi ý xóa bộ lọc', async () => {
    mockHome(() => ({ data: [], meta: { page: 1, size: 9, total: 0 } }));
    renderPage(
      <>
        <HomePage />
        <LocationProbe />
      </>,
      { route: '/?q=xyz&quick=1' }
    );
    expect(await screen.findByText('Không tìm thấy công thức phù hợp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^$/);
  });

  it('danh sách rỗng khi không lọc thì mời xem cộng đồng', async () => {
    mockHome(() => ({ data: [], meta: { page: 1, size: 9, total: 0 } }));
    renderPage(<HomePage />);
    expect(await screen.findByText('Chưa có công thức nào')).toBeInTheDocument();
  });

  it('lỗi 500 hiện trạng thái lỗi và thử lại được', async () => {
    let fail = true;
    const calls = mockHome(() =>
      fail
        ? { status: 500, errorCode: 'ERR_SYS_DATABASE_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu.' }
        : { data: [recipe(9)], meta: { page: 1, size: 9, total: 1 } }
    );
    renderPage(<HomePage />);
    expect(await screen.findByText('Không kết nối được cơ sở dữ liệu.', {}, { timeout: 3000 })).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Món chay số 9')).toBeInTheDocument();
    expect(calls.filter((c) => c.url === '/recipes').length).toBeGreaterThanOrEqual(2);
  });

  it('503 hiện "Dịch vụ tạm gián đoạn"', async () => {
    mockHome(() => ({ status: 503, errorCode: 'ERR_SYS_REDIS_UNAVAILABLE', message: 'Dịch vụ tạm gián đoạn, vui lòng thử lại sau.' }));
    renderPage(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Dịch vụ tạm gián đoạn' }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('tìm kiếm gửi keyword cho cả công thức và bài viết, ghi vào URL', async () => {
    const calls = mockHome();
    renderPage(
      <>
        <HomePage />
        <LocationProbe />
      </>
    );
    await screen.findByText('Món chay số 1');
    await userEvent.type(screen.getByRole('searchbox'), 'đậu hũ');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/recipes' && (c.params as { keyword?: string }).keyword === 'đậu hũ')).toBe(true));
    expect(calls.some((c) => c.url === '/posts' && (c.params as { keyword?: string }).keyword === 'đậu hũ')).toBe(true);
    expect(screen.getByTestId('location').textContent).toBe('?q=%C4%91%E1%BA%ADu+h%C5%A9');
    expect(await screen.findByRole('heading', { name: 'Kết quả cho “đậu hũ”' })).toBeInTheDocument();
  });

  it('chip trường phái và “Dưới 20 phút” đổi tham số GET /recipes', async () => {
    const calls = mockHome();
    renderPage(<HomePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Thuần chay' }));
    await userEvent.click(screen.getByRole('button', { name: /Dưới 20 phút/ }));
    await waitFor(() =>
      expect(calls.some((c) => {
        const p = c.params as { dietarySchoolId?: number; maxCookTime?: number };
        return c.url === '/recipes' && p.dietarySchoolId === 1 && p.maxCookTime === 20;
      })).toBe(true)
    );
    expect(screen.getByRole('button', { name: 'Thuần chay' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tải thêm trang tiếp theo khi còn công thức', async () => {
    const calls = mockHome((req) => {
      const page = (req.params as { page: number }).page;
      return page === 1
        ? { data: Array.from({ length: 9 }, (_, i) => recipe(i + 1)), meta: { page: 1, size: 9, total: 11 } }
        : { data: [recipe(10), recipe(11)], meta: { page: 2, size: 9, total: 11 } };
    });
    renderPage(<HomePage />);
    await userEvent.click(await screen.findByRole('button', { name: /Xem thêm công thức/ }));
    expect(await screen.findByText('Món chay số 11')).toBeInTheDocument();
    expect(recipeCards()).toHaveLength(11);
    expect(screen.queryByRole('button', { name: /Xem thêm công thức/ })).not.toBeInTheDocument();
    expect(calls.filter((c) => c.url === '/recipes').map((c) => (c.params as { page: number }).page)).toEqual([1, 2]);
  });

  describe('BR-GUEST-01: mời đăng ký ở mục thứ 5', () => {
    it('Khách lướt tới mục 5 thì mở hộp mời và 24 giờ không mời lại', async () => {
      mockHome();
      renderPage(<HomePage />);
      await screen.findByText('Món chay số 5');
      const fifth = recipeCards()[4];
      expect(observed.map((o) => o.node)).toEqual([fifth]); // chỉ theo dõi đúng mục thứ 5
      scrollTo(fifth);
      expect(useUiStore.getState().signupPrompt).toMatchObject({ open: true, reason: 'browse' });
      expect(Number(window.localStorage.getItem('vl_browse_prompt_until'))).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
    });

    it('đã mời trong 24 giờ qua thì không mời nữa', async () => {
      window.localStorage.setItem('vl_browse_prompt_until', String(Date.now() + 3600 * 1000));
      mockHome();
      renderPage(<HomePage />);
      await screen.findByText('Món chay số 5');
      expect(observed).toHaveLength(0);
      expect(useUiStore.getState().signupPrompt.open).toBe(false);
    });

    it('Thành viên không bị mời', async () => {
      useAuthStore.setState({
        user: { userId: 1024, fullName: 'Nguyễn An', email: 'an@x.vn', role: 'MEMBER', isVip: false },
        accessToken: 'member-token',
        guestToken: null,
      });
      mockHome(() => ({ data: [1, 2, 3, 4, 5, 6].map((id) => recipe(id)), meta: { page: 1, size: 9, total: 6 } }));
      renderPage(<HomePage />);
      await screen.findByText('Món chay số 5');
      expect(observed).toHaveLength(0);
    });
  });
});
