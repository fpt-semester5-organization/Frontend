/**
 * Hằng số URL — đúng cột "Route" của `13. UI Screen Specification` (45 màn hình).
 * Không thêm route ngoài tài liệu; thay đổi phải sửa spec trước (nguồn: scripts/master_spec).
 */
export const PATHS = {
  HOME: '/', // SCR-10
  AUTH: {
    LOGIN: '/auth/login', // SCR-01
    REGISTER: '/auth/register', // SCR-02
    VERIFY_OTP: '/auth/verify-otp', // SCR-03
    FORGOT_PASSWORD: '/auth/forgot-password', // SCR-04
    RESET_PASSWORD: '/auth/reset-password', // SCR-05
    CHANGE_PASSWORD: '/auth/change-password', // SCR-06
  },
  ME: {
    ROOT: '/me', // SCR-07
    HEALTH: '/me/health', // SCR-08
    DIETARY: '/me/dietary-preferences', // SCR-09
    RECIPES: '/me/recipes', // SCR-14
    POSTS: '/me/posts', // SCR-28
    SUBSCRIPTION: '/me/subscription', // SCR-33
  },
  RECIPES: {
    ROOT: '/recipes', // SCR-11
    NEW: '/recipes/new', // SCR-13
    DETAIL: (id: string | number = ':id') => `/recipes/${id}`, // SCR-12
    EDIT: (id: string | number = ':id') => `/recipes/${id}/edit`, // SCR-13
  },
  SCANNER: {
    ROOT: '/scanner', // SCR-15
    HISTORY: '/scanner/history', // SCR-16
  },
  FRIDGE: '/fridge', // SCR-17
  VENUES: {
    ROOT: '/venues', // SCR-18
    SUGGEST: '/venues/suggest', // SCR-20
    DETAIL: (id: string | number = ':id') => `/venues/${id}`, // SCR-19
  },
  VIDEOS: {
    DETAIL: (id: string | number = ':id') => `/videos/${id}`, // SCR-21
  },
  MEAL_PLANS: {
    ROOT: '/meal-plans', // SCR-22
    NEW: '/meal-plans/new', // SCR-23
    DETAIL: (id: string | number = ':id') => `/meal-plans/${id}`, // SCR-22
  },
  SHOPPING_LISTS: {
    DETAIL: (id: string | number = ':id') => `/shopping-lists/${id}`, // SCR-24
  },
  COMMUNITY: {
    ROOT: '/community', // SCR-25
    POST: (id: string | number = ':id') => `/community/posts/${id}`, // SCR-26
    NEW: '/community/posts/new', // SCR-27
    EDIT: (id: string | number = ':id') => `/community/posts/${id}/edit`, // SCR-27
  },
  CHAT: {
    ROOT: '/chat', // SCR-29
    SESSION: (sessionId: string | number = ':sessionId') => `/chat/${sessionId}`, // SCR-29
  },
  VIP: {
    ROOT: '/vip', // SCR-30
    CHECKOUT: (planId: string | number = ':planId') => `/vip/checkout/${planId}`, // SCR-31
    RESULT: '/vip/result', // SCR-32
  },
  ADMIN: {
    ROOT: '/admin', // SCR-38
    DASHBOARD: '/admin',
    MODERATION: '/admin/moderation', // SCR-34
    COMMENTS: '/admin/moderation/comments', // SCR-35
    CATEGORIES: '/admin/categories', // SCR-36
    RECIPE_VERIFICATION: '/admin/recipe-verification', // SCR-37
    USERS: '/admin/users', // SCR-39
    USER_DETAIL: (id: string | number = ':id') => `/admin/users/${id}`, // SCR-39
    AUDIT_LOGS: '/admin/audit-logs', // SCR-40
    AI: '/admin/ai', // SCR-41
    DIETARY_SCHOOLS: '/admin/dietary-schools', // SCR-42
    E_NUMBERS: '/admin/e-numbers', // SCR-42
    INGREDIENTS: '/admin/ingredients', // SCR-43
    SUBSCRIPTION_PLANS: '/admin/subscription-plans', // SCR-44
    VENUES: '/admin/venues', // SCR-45
  },
} as const;
