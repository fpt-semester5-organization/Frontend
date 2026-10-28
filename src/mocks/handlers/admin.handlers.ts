import { http, HttpResponse } from 'msw';
import { api, currentUser, fail, latency, ok, unauthorized } from '../utils';

// Danh sách hàng đợi kiểm duyệt mẫu
const mockModerationQueue = [
  {
    reportId: 101,
    targetType: 'RECIPE',
    targetId: 501,
    violationType: 'VIO_MEAT',
    reportSource: 'AI_SCAN',
    evidenceSummary: 'Phát hiện thành phần nước mắm cốt cá trong công thức (điểm vi phạm 92%).',
    status: 'PENDING',
    createdAt: '2026-10-23T10:15:00Z',
    targetStatus: 'QUARANTINED_HIDDEN',
  },
  {
    reportId: 102,
    targetType: 'POST',
    targetId: 802,
    violationType: 'VIO_SPAM',
    reportSource: 'USER_REPORT',
    evidenceSummary: 'Nội dung chứa liên kết quảng cáo cá độ trái phép nhiều lần.',
    status: 'PENDING',
    createdAt: '2026-10-23T11:30:00Z',
    targetStatus: 'PENDING_REVIEW',
  },
  {
    reportId: 103,
    targetType: 'COMMENT',
    targetId: 301,
    violationType: 'VIO_HATE',
    reportSource: 'USER_REPORT',
    evidenceSummary: 'Bình luận chứa ngôn từ miệt thị và xúc phạm danh dự thành viên.',
    status: 'PENDING',
    createdAt: '2026-10-23T12:00:00Z',
    targetStatus: 'FLAGGED',
  },
  {
    reportId: 104,
    targetType: 'RECIPE',
    targetId: 504,
    violationType: 'VIO_LABEL',
    reportSource: 'AI_SCAN',
    evidenceSummary: 'Gán nhãn Chay Phật giáo nhưng thành phần có tỏi và hành lá (ngũ vị tân).',
    status: 'PENDING',
    createdAt: '2026-10-23T13:45:00Z',
    targetStatus: 'QUARANTINED_HIDDEN',
  },
  {
    reportId: 105,
    targetType: 'COMMENT',
    targetId: 302,
    violationType: 'VIO_SPAM',
    reportSource: 'AI_SCAN',
    evidenceSummary: 'Spam đường dẫn mời gọi mua bán thực phẩm chức năng.',
    status: 'PENDING',
    createdAt: '2026-10-23T14:10:00Z',
    targetStatus: 'FLAGGED',
  },
];

// Danh mục mẫu
const mockCategories = [
  { categoryId: 1, categoryName: 'Món kho chay', description: 'Các món kho đậm đà', isCore: true, isActive: true },
  { categoryId: 2, categoryName: 'Món canh chay', description: 'Các món canh thanh nhiệt', isCore: true, isActive: true },
  { categoryId: 3, categoryName: 'Món xào chay', description: 'Các món rau củ xào', isCore: true, isActive: true },
  { categoryId: 4, categoryName: 'Món gỏi & salad', description: 'Món trộn tươi mát', isCore: false, isActive: true },
  { categoryId: 5, categoryName: 'Lẩu chay', description: 'Các món lẩu tiệc', isCore: false, isActive: true },
];

// Nhật ký kiểm toán mẫu
const mockAuditLogs = [
  {
    auditId: 901,
    actorUserId: 1,
    actorRole: 'ADMIN',
    action: 'RECIPE_VERIFY',
    targetTable: 'Recipes',
    targetId: '501',
    note: 'Cấp chứng nhận công thức chuẩn chay thỏa 4 tiêu chuẩn',
    createdAt: '2026-10-23T14:00:00Z',
  },
  {
    auditId: 902,
    actorUserId: null,
    actorRole: 'SYSTEM',
    action: 'AI_MODERATION_QUARANTINE',
    targetTable: 'Recipes',
    targetId: '504',
    note: 'Tự động cách ly công thức vi phạm Red Alert (ngũ vị tân)',
    createdAt: '2026-10-23T13:45:00Z',
  },
  {
    auditId: 903,
    actorUserId: 1,
    actorRole: 'ADMIN',
    action: 'COMMENT_SOFT_DELETE',
    targetTable: 'Comments',
    targetId: '301',
    note: 'Xóa mềm bình luận vi phạm ngôn từ thù ghét',
    createdAt: '2026-10-23T12:05:00Z',
  },
];

export const adminHandlers = [
  // FN-ADM-04: Hàng đợi kiểm duyệt
  http.get(api('/admin/moderation/queue'), async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const source = url.searchParams.get('reportSource');
    const targetType = url.searchParams.get('targetType');
    const violationType = url.searchParams.get('violationType');
    const page = Number(url.searchParams.get('page') || '1');
    const size = Number(url.searchParams.get('size') || '20');

    let filtered = [...mockModerationQueue];
    if (source) filtered = filtered.filter((item) => item.reportSource === source);
    if (targetType) filtered = filtered.filter((item) => item.targetType === targetType);
    if (violationType) filtered = filtered.filter((item) => item.violationType === violationType);

    const total = filtered.length;
    const items = filtered.slice((page - 1) * size, page * size);
    return ok(items, 'OK', 200, { page, size, total });
  }),

  // FN-ADM-05: Quyết định xử lý báo cáo
  http.put(api('/admin/moderation/reports/:id/decision'), async ({ params, request }) => {
    await latency();
    const id = Number(params.id);
    const body = (await request.json()) as { decision: string; note: string; applySanction?: boolean };
    const idx = mockModerationQueue.findIndex((item) => item.reportId === id);
    if (idx !== -1) {
      mockModerationQueue.splice(idx, 1);
    }
    return ok({ reportId: id, status: 'RESOLVED', decision: body.decision }, 'Đã xử lý báo cáo.');
  }),

  // FN-ADM-06: Xóa mềm bình luận vi phạm
  http.delete(api('/admin/comments/:id'), async ({ params, request }) => {
    await latency();
    const id = Number(params.id);
    const url = new URL(request.url);
    const reason = url.searchParams.get('reason');
    if (!reason || reason.trim().length < 10) {
      return fail(400, 'ERR_VALIDATION', 'Lý do xóa phải từ 10 đến 500 ký tự.');
    }
    const idx = mockModerationQueue.findIndex((item) => item.targetType === 'COMMENT' && item.targetId === id);
    if (idx !== -1) {
      mockModerationQueue.splice(idx, 1);
    }
    return ok({ deleted: true }, 'Đã xóa bình luận.');
  }),

  // FN-ADM-07: Lấy toàn bộ danh mục
  http.get(api('/admin/categories'), async () => {
    await latency();
    return ok(mockCategories, 'Danh sách danh mục món ăn.');
  }),

  // FN-ADM-07: Tạo danh mục mới
  http.post(api('/admin/categories'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as { categoryName: string; description?: string };
    if (!body.categoryName || body.categoryName.trim().length < 2) {
      return fail(400, 'ERR_VALIDATION', 'Tên danh mục phải từ 2 đến 100 ký tự.');
    }
    if (mockCategories.some((c) => c.categoryName.toLowerCase() === body.categoryName.trim().toLowerCase())) {
      return fail(409, 'ERR_CATEGORY_DUPLICATE', 'Tên danh mục đã tồn tại.');
    }
    const newCat = {
      categoryId: mockCategories.length + 1,
      categoryName: body.categoryName.trim(),
      description: body.description || '',
      isCore: false,
      isActive: true,
    };
    mockCategories.push(newCat);
    return ok(newCat, 'Đã tạo danh mục.', 201);
  }),

  // FN-ADM-07: Sửa danh mục
  http.put(api('/admin/categories/:id'), async ({ params, request }) => {
    await latency();
    const id = Number(params.id);
    const body = (await request.json()) as { categoryName?: string; isActive?: boolean };
    const cat = mockCategories.find((c) => c.categoryId === id);
    if (!cat) return fail(404, 'ERR_ADM_NOT_FOUND', 'Không tìm thấy danh mục.');
    if (body.categoryName) cat.categoryName = body.categoryName.trim();
    if (body.isActive !== undefined) cat.isActive = body.isActive;
    return ok(cat, 'Đã cập nhật danh mục.');
  }),

  // FN-ADM-08: Xóa danh mục
  http.delete(api('/admin/categories/:id'), async ({ params, request }) => {
    await latency();
    const id = Number(params.id);
    const url = new URL(request.url);
    const targetCategoryId = url.searchParams.get('targetCategoryId');
    const cat = mockCategories.find((c) => c.categoryId === id);
    if (!cat) return fail(404, 'ERR_ADM_NOT_FOUND', 'Không tìm thấy danh mục.');
    if (cat.isCore) {
      return fail(403, 'ERR_CATEGORY_CORE_PROTECTED', 'Không được phép xóa danh mục cốt lõi của hệ thống.');
    }
    // Giả lập danh mục ID=4 có phụ thuộc cần chuyển dữ liệu
    if (id === 4 && !targetCategoryId) {
      return fail(
        409,
        'ERR_CATEGORY_NEEDS_MIGRATION',
        'Còn công thức hoặc quán phụ thuộc, vui lòng chọn danh mục đích để chuyển giao.'
      );
    }
    const idx = mockCategories.findIndex((c) => c.categoryId === id);
    if (idx !== -1) mockCategories.splice(idx, 1);
    return ok({ categoryId: id, migratedRecipes: 3, migratedVenues: 1 }, 'Đã xóa danh mục.');
  }),

  // FN-ADM-09: Xác minh công thức chuẩn chay
  http.post(api('/admin/recipes/:id/verify'), async ({ params, request }) => {
    await latency();
    const id = Number(params.id);
    // Giả lập ID=999 chưa đủ tiêu chí
    if (id === 999) {
      return HttpResponse.json(
        {
          statusCode: 422,
          errorCode: 'ERR_RECIPE_NOT_ELIGIBLE',
          message: 'Công thức chưa thỏa mãn đủ 4 tiêu chuẩn công thức chuẩn chay.',
          data: {
            failedCriteria: [
              'Chưa nhận đủ tối thiểu 10 lượt thả tim từ cộng đồng (hiện tại: 6/10).',
              'Còn 01 báo cáo vi phạm đang chờ xử lý.',
            ],
          },
        },
        { status: 422 }
      );
    }
    return ok({ recipeId: id, isVerified: true }, 'Đã cấp huy hiệu Công thức chuẩn chay.');
  }),

  // FN-ADM-09: Thu hồi huy hiệu công thức
  http.delete(api('/admin/recipes/:id/verify'), async ({ params }) => {
    await latency();
    const id = Number(params.id);
    return ok({ recipeId: id, isVerified: false }, 'Đã gỡ huy hiệu Công thức chuẩn chay.');
  }),

  // FN-ADM-18: Thống kê tổng quan nền tảng (Dashboard)
  http.get(api('/admin/analytics/overview'), async ({ request }) => {
    await latency();
    return ok(
      {
        users: {
          total: 12480,
          newInPeriod: 342,
          byStatus: {
            ACTIVE: 11950,
            SUSPENDED_3D: 18,
            SUSPENDED_10D: 5,
            SUSPENDED_30D: 2,
            BANNED: 12,
            ANONYMIZED_REQUESTED: 3,
          },
        },
        content: {
          recipes: 1850,
          recipesNewInPeriod: 45,
          posts: 3420,
          postsNewInPeriod: 120,
          videos: 620,
          videosNewInPeriod: 15,
        },
        vip: {
          active: 890,
          revenueVnd: 78500000,
        },
        moderationQueue: mockModerationQueue.length,
        aiCostUsd: 48.75,
      },
      'OK'
    );
  }),

  // FN-ADM-17: Tra cứu nhật ký kiểm toán
  http.get(api('/admin/audit-logs'), async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const size = Number(url.searchParams.get('size') || '20');
    return ok(mockAuditLogs, 'OK', 200, { page, size, total: mockAuditLogs.length });
  }),

  // FN-ADM-15: Giám sát AI Circuit Breaker (cho header indicator)
  http.get(api('/admin/ai/metrics'), async () => {
    return ok(
      {
        circuit: {
          state: 'CLOSED',
          failureCount: 0,
        },
        latencyMs: 380,
        totalCalls: 1542,
      },
      'OK'
    );
  }),
];
