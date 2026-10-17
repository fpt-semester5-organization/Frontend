// Dữ liệu mẫu và API giả dùng chung cho test các trang hồ sơ (SCR-07..09).
import { mockApi, type MockRequest, type MockResponse } from '@/test/mockApi';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

export const SCHOOLS = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 5, schoolCode: 'BUDDHIST', schoolName: 'Chay kiêng ngũ vị tân', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: true },
];

export const ALLERGENS = [
  { allergenId: 1, code: 'SOY', allergenName: 'Đậu nành' },
  { allergenId: 2, code: 'GLUTEN', allergenName: 'Gluten' },
  { allergenId: 3, code: 'PEANUT', allergenName: 'Đậu phộng' },
];

export const HEALTH = {
  gender: 'FEMALE',
  dateOfBirth: '2003-04-12',
  heightCm: 162,
  currentWeightKg: 54.5,
  targetWeightKg: 52,
  bmi: 20.8,
  bmiCategory: 'NORMAL',
  bmrKcal: 1302,
  tdeeKcal: 1562,
  targetDailyCalories: 1200,
  healthGoal: 'LOSE_WEIGHT',
  dietarySchool: { id: 1, code: 'VEGAN', name: 'Thuần chay' },
  requiresAlliumFree: false,
  regionPreference: 'SOUTH',
  isStaleMetrics: false,
  updatedAt: '2026-10-01T09:00:00Z',
};

export const me = (extra: Record<string, unknown> = {}) => ({
  userId: 1024,
  fullName: 'Nguyễn An',
  email: 'an.nguyen@gmail.com',
  phoneNumber: '0912345678',
  avatarUrl: null,
  role: 'MEMBER',
  isVip: false,
  health: HEALTH,
  allergens: [{ allergenId: 3, name: 'Đậu phộng' }],
  ...extra,
});

export const WEIGHTS = [
  { logId: 3, weightKg: 54.5, loggedDate: '2026-10-15' },
  { logId: 2, weightKg: 55, loggedDate: '2026-10-08' },
  { logId: 1, weightKg: 55.6, loggedDate: '2026-10-01' },
];

/** API giả: GET /users/me trả `profile`; danh mục và lịch sử cân nặng mặc định; `handler` xử lý trước. */
export function mockProfileApi(
  handler: (req: MockRequest) => MockResponse | undefined = () => undefined,
  profile: () => ReturnType<typeof me> = () => me()
) {
  return mockApi((req) => {
    const custom = handler(req);
    if (custom) return custom;
    if (req.url === '/users/me' && req.method === 'GET') return { data: profile() };
    if (req.url === '/dietary-schools') return { data: SCHOOLS };
    if (req.url === '/allergens') return { data: ALLERGENS };
    if (req.url === '/users/me/weight-history' && req.method === 'GET') return { data: WEIGHTS, meta: { page: 1, size: 10, total: WEIGHTS.length } };
    return undefined;
  });
}

export function signInAsGuest() {
  useAuthStore.setState({ user: null, accessToken: null, token: null, guestToken: 'guest-jwt', isAuthenticated: false, sessionStatus: 'ready' });
  useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' }, toasts: [] });
}

export function signInAsMember() {
  useAuthStore.setState({
    user: { userId: 1024, fullName: 'Nguyễn An', email: 'an.nguyen@gmail.com', role: 'MEMBER', isVip: false },
    accessToken: 'member-token',
    token: 'member-token',
    guestToken: null,
    isAuthenticated: true,
    sessionStatus: 'ready',
  });
  useUiStore.setState({ signupPrompt: { open: false, reason: 'guest', returnUrl: '/' }, toasts: [] });
}

export const toastMessages = () => useUiStore.getState().toasts.map((toast) => toast.message);
