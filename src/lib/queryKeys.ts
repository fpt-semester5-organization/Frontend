/**
 * Khóa TanStack Query ổn định, dùng chung giữa các feature để invalidate nhất quán.
 * Quy ước: [tài nguyên, ...tham số]; `all` là tiền tố để invalidate cả nhóm.
 */
export const qk = {
  me: ['me'] as const,
  weightHistory: (params?: object) => ['me', 'weight-history', params ?? {}] as const,
  catalog: {
    dietarySchools: ['catalog', 'dietary-schools'] as const,
    allergens: ['catalog', 'allergens'] as const,
    categories: ['catalog', 'categories'] as const,
    ingredients: (params?: object) => ['catalog', 'ingredients', params ?? {}] as const,
  },
  recipes: {
    all: ['recipes'] as const,
    list: (params?: object) => ['recipes', 'list', params ?? {}] as const,
    detail: (id: number | string) => ['recipes', 'detail', String(id)] as const,
    related: (id: number | string, limit?: number) => ['recipes', 'related', String(id), limit ?? null] as const,
    comments: (id: number | string, params?: object) => ['recipes', 'comments', String(id), params ?? {}] as const,
    venues: (id: number | string, params?: object) => ['recipes', 'venues', String(id), params ?? {}] as const,
  },
  posts: {
    all: ['posts'] as const,
    list: (params?: object) => ['posts', 'list', params ?? {}] as const,
    detail: (id: number | string) => ['posts', 'detail', String(id)] as const,
    comments: (id: number | string, params?: object) => ['posts', 'comments', String(id), params ?? {}] as const,
  },
  videos: {
    transcript: (id: number | string) => ['videos', 'transcript', String(id)] as const,
  },
  guestQuota: ['guest', 'quota'] as const,
} as const;
