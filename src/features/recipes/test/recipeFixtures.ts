// Dữ liệu mẫu và API giả dùng chung cho test các trang công thức (SCR-11..13).
import { mockApi, type MockRequest, type MockResponse } from '@/test/mockApi';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

export const SCHOOLS = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 5, schoolCode: 'BUDDHIST', schoolName: 'Chay kiêng ngũ vị tân', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: true },
];

export const CATEGORIES = [
  { categoryId: 1, categoryName: 'Món canh', isCore: true },
  { categoryId: 4, categoryName: 'Món chiên', isCore: true },
];

export const INGREDIENTS = [
  { ingredientId: 1, name: 'Đậu phụ', standardUnit: 'g', foodGroup: 'PLANT', isAllium: false, caloriesPer100g: 76 },
  { ingredientId: 2, name: 'Trứng gà', standardUnit: 'quả', foodGroup: 'EGG', isAllium: false, caloriesPer100g: 155 },
  { ingredientId: 3, name: 'Sả', standardUnit: 'g', foodGroup: 'PLANT', isAllium: false, caloriesPer100g: 99 },
];

export const listItem = (id: number, extra: Record<string, unknown> = {}) => ({
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

export const detail = (id: number, extra: Record<string, unknown> = {}) => ({
  ...listItem(id, { title: 'Canh nấm đậu phụ rong biển', voteCount: 42, isVerified: true, caloriesKcal: 310 }),
  description: 'Món canh thanh đạm.',
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  instructions: ['Ngâm rong biển 10 phút.', 'Nấu nấm 5 phút.'],
  ingredients: [
    { ingredientId: 3, name: 'Nấm rơm', quantity: 200, unit: 'g' },
    { ingredientId: 1, name: 'Đậu phụ', quantity: 300, unit: 'g' },
  ],
  hasTranscript: false,
  commentCount: 1,
  memberActions: { canVote: true, canComment: true, canReport: true },
  ...extra,
});

/** API giả mặc định cho các danh mục; `handler` xử lý trước, trả undefined thì rơi về mặc định. */
export function mockRecipesApi(handler: (req: MockRequest) => MockResponse | undefined = () => undefined) {
  return mockApi((req) => {
    const custom = handler(req);
    if (custom) return custom;
    if (req.url === '/dietary-schools') return { data: SCHOOLS };
    if (req.url === '/categories') return { data: CATEGORIES };
    if (req.url === '/ingredients') {
      const keyword = String((req.params as { keyword?: string }).keyword ?? '').toLowerCase();
      const items = INGREDIENTS.filter((item) => item.name.toLowerCase().includes(keyword));
      return { data: items, meta: { page: 1, size: 8, total: items.length } };
    }
    return undefined;
  });
}

export function signInAsGuest() {
  useAuthStore.setState({ user: null, accessToken: null, token: null, guestToken: 'guest-jwt', isAuthenticated: false });
  useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' }, toasts: [] });
}

export function signInAsMember() {
  useAuthStore.setState({
    user: { userId: 1024, fullName: 'Nguyễn An', email: 'an@x.vn', role: 'MEMBER', isVip: false },
    accessToken: 'member-token',
    token: 'member-token',
    guestToken: null,
    isAuthenticated: true,
  });
  useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' }, toasts: [] });
}
