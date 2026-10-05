/**
 * Application route constants
 * Prevents magic strings and centralizes navigation endpoints
 */
export const PATHS = {
  // Public & Guest
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    VERIFY_OTP: '/verify-otp',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },

  // Member Features
  RECIPES: {
    ROOT: '/recipes',
    DETAIL: (id: string | number) => `/recipes/${id}`,
    CREATE: '/recipes/create',
    MY_RECIPES: '/recipes/my',
  },
  COMMUNITY: {
    ROOT: '/community',
    POST_DETAIL: (id: string | number) => `/community/posts/${id}`,
    CREATE_POST: '/community/posts/create',
  },
  VIDEOS: '/videos',
  MEAL_PLANS: '/meal-plans',
  SHOPPING_LISTS: '/shopping-lists',
  FRIDGE: '/fridge',
  SCANNER: {
    ROOT: '/scanner',
    BARCODE: '/scanner/barcode',
    OCR_LABEL: '/scanner/ocr-label',
  },
  VENUES: {
    ROOT: '/venues',
    DETAIL: (id: string | number) => `/venues/${id}`,
  },
  CHAT: '/chat',
  PROFILE: {
    ROOT: '/profile',
    HEALTH: '/profile/health',
    DIETARY: '/profile/dietary',
  },
  SUBSCRIPTION: {
    PRICING: '/pricing',
    CHECKOUT: '/checkout',
    PAYMENT_RESULT: '/payment-result',
  },

  // Admin Portal
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    MODERATION: '/admin/moderation',
    RECIPES: '/admin/recipes',
    AI_MONITORING: '/admin/ai-monitoring',
  },
} as const;
