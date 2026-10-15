/**
 * Hằng số URL theo đúng cột "Route" của docs/11. UI Screen Specification (45 màn).
 * Không thêm route ngoài tài liệu.
 */
export const PATHS = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  ME: {
    PROFILE: '/me',
    HEALTH: '/me/health',
    DIETARY_PREFERENCES: '/me/dietary-preferences',
    RECIPES: '/me/recipes',
    POSTS: '/me/posts',
    SUBSCRIPTION: '/me/subscription',
  },
  PROFILE: {
    ROOT: '/me',
    HEALTH: '/me/health',
  },

  RECIPES: {
    ROOT: '/recipes',
    DETAIL: (id: string | number) => `/recipes/${id}`,
    NEW: '/recipes/new',
    EDIT: (id: string | number) => `/recipes/${id}/edit`,
  },
  SCANNER: {
    ROOT: '/scanner',
    HISTORY: '/scanner/history',
  },
  FRIDGE: '/fridge',
  VENUES: {
    ROOT: '/venues',
    DETAIL: (id: string | number) => `/venues/${id}`,
    SUGGEST: '/venues/suggest',
  },
  VIDEOS: {
    /** postId (query) để trang video lấy URL phát từ videos[] của GET /posts/{postId} (đã thống nhất 13/10/2026). */
    DETAIL: (id: string | number, postId?: number) => (postId ? `/videos/${id}?postId=${postId}` : `/videos/${id}`),
  },
  MEAL_PLANS: {
    ROOT: '/meal-plans',
    DETAIL: (id: string | number) => `/meal-plans/${id}`,
    NEW: '/meal-plans/new',
  },
  SHOPPING_LISTS: {
    DETAIL: (id: string | number) => `/shopping-lists/${id}`,
  },
  COMMUNITY: {
    ROOT: '/community',
    POST_DETAIL: (id: string | number) => `/community/posts/${id}`,
    NEW_POST: '/community/posts/new',
    EDIT_POST: (id: string | number) => `/community/posts/${id}/edit`,
  },
  CHAT: {
    ROOT: '/chat',
    SESSION: (sessionId: string | number) => `/chat/${sessionId}`,
  },
  SUBSCRIPTION: {
    PRICING: '/vip',
    CHECKOUT: (planId: string | number) => `/vip/checkout/${planId}`,
    RESULT: '/vip/result',
  },
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin',
    MODERATION: '/admin/moderation',
    COMMENT_MODERATION: '/admin/moderation/comments',
    CATEGORIES: '/admin/categories',
    RECIPE_VERIFICATION: '/admin/recipe-verification',
    USERS: '/admin/users',
    USER_DETAIL: (id: string | number) => `/admin/users/${id}`,
    AUDIT_LOGS: '/admin/audit-logs',
    AI: '/admin/ai',
    DIETARY_SCHOOLS: '/admin/dietary-schools',
    E_NUMBERS: '/admin/e-numbers',
    INGREDIENTS: '/admin/ingredients',
    SUBSCRIPTION_PLANS: '/admin/subscription-plans',
    VENUES: '/admin/venues',
  },
} as const;

/** Đường dẫn đăng nhập/đăng ký kèm returnUrl để quay lại sau khi xác thực (BR-GUEST-AUTH-01). */
export const withReturnUrl = (path: string, returnUrl: string) =>
  `${path}?returnUrl=${encodeURIComponent(returnUrl)}`;
