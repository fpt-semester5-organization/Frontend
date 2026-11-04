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
          standardMembers: 11060,
          vipMembers: 890,
          suspendedMembers: 37,
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

  // FN-ADM-15, FN-CHAT-06: Khảo sát phản hồi Chatbot AI
  http.get(api('/admin/ai/surveys'), async () => {
    return ok(
      {
        surveys: {
          items: [
            {
              surveyId: 8001,
              userId: 2,
              userFullName: 'Trần Văn Nam',
              userEmail: 'nam@gmail.com',
              userAvatarUrl: null,
              sessionId: 501,
              sessionTitle: 'Tư vấn thực đơn giảm cân',
              ratingScore: 5,
              contextQuestion: 'Tư vấn thực đơn giảm cân ăn chay có hữu ích không?',
              feedbackContent: 'Bot tư vấn rất chi tiết, có con số calo rõ ràng và giải thích dễ hiểu!',
              createdAt: new Date().toISOString(),
            },
          ],
          pageNumber: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        summary: {
          totalSurveys: 1,
          averageRating: 5.0,
          positiveCount: 1,
          positiveRate: 1.0,
          negativeCount: 0,
          negativeRate: 0.0,
          neutralCount: 0,
        },
      },
      'OK'
    );
  }),

  // FN-ADM-16: Giám sát LLMOps Dashboard
  http.get(api('/admin/llmops/dashboard'), async () => {
    return ok(
      {
        todayCostUsd: 0.15,
        dailyBudgetUsd: 12.5,
        usagePercent: 1.2,
        alertLevel: 'NONE',
        hourlyCosts: Array.from({ length: 24 }, (_, h) => ({
          hour: h,
          costUsd: [3, 6, 9, 12, 15, 18, 21].includes(h)
            ? Number(((h * 0.003) + 0.005).toFixed(4))
            : h > 7 && h < 22 ? 0.004 : 0.001,
          tokens: [3, 6, 9, 12, 15, 18, 21].includes(h) ? h * 250 + 400 : 120,
        })),
        series: [],
        dates: [],
        features: ['AI_CHAT', 'MEAL_PLAN_GEN', 'AI_FRIDGE', 'SUMMARIZE_VIDEO'],
        cells: {},
        dayTotals: {},
        featureTotals: {
          AI_CHAT: { costUsd: 0.07, tokens: 7100, promptTokens: 4800, completionTokens: 2300 },
          MEAL_PLAN_GEN: { costUsd: 0.04, tokens: 4100, promptTokens: 2800, completionTokens: 1300 },
          AI_FRIDGE: { costUsd: 0.03, tokens: 3000, promptTokens: 2100, completionTokens: 900 },
          SUMMARIZE_VIDEO: { costUsd: 0.01, tokens: 1000, promptTokens: 700, completionTokens: 300 },
        },
        total: { tokens: 15200, costUsd: 0.15, promptTokens: 10400, completionTokens: 4800 },
        totalPromptTokens: 10400,
        totalCompletionTokens: 4800,
        promptCostUsd: 0.05,
        completionCostUsd: 0.1,
        userTierDistribution: {
          vipTokens: 8500,
          vipCostUsd: 0.09,
          memberTokens: 6700,
          memberCostUsd: 0.06,
          systemTokens: 0,
          systemCostUsd: 0,
        },
        topSpenders: [],
        maxDayCost: 0.15,
      },
      'OK'
    );
  }),

  // FN-CHAT-07: Trạng thái kho tri thức Qdrant
  http.get(api('/admin/knowledge/status'), async () => {
    return ok(
      {
        healthy: true,
        totalVectors: 1250,
        pending: 0,
        lastIndexedAt: new Date().toISOString(),
      },
      'OK'
    );
  }),

  // FN-ADM-20: Cấu hình hệ thống (System Settings)
  http.get(api('/admin/settings'), async ({ request }) => {
    const url = new URL(request.url);
    const cat = url.searchParams.get('category');
    const settings = [
      { settingKey: 'MEAL_SWAP_LIMIT_DRAFT', settingValue: '21', defaultValue: '21', dataType: 'INT', category: 'MEAL_PLAN', description: 'Hạn mức đổi món khi dự thảo' },
      { settingKey: 'MEAL_SWAP_LIMIT_ACTIVE', settingValue: '21', defaultValue: '21', dataType: 'INT', category: 'MEAL_PLAN', description: 'Hạn mức đổi món khi đang áp dụng' },
      { settingKey: 'MEAL_PLAN_WEEKLY_LIMIT_FREE', settingValue: '1', defaultValue: '1', dataType: 'INT', category: 'MEAL_PLAN', description: 'Thực đơn tuần tối đa (Miễn phí)' },
      { settingKey: 'MEAL_PLAN_WEEKLY_LIMIT_VIP', settingValue: '3', defaultValue: '3', dataType: 'INT', category: 'MEAL_PLAN', description: 'Thực đơn tuần tối đa (VIP)' },
      { settingKey: 'MEAL_SWAP_CALORIE_TOLERANCE_PERCENT', settingValue: '15', defaultValue: '15', dataType: 'INT', category: 'MEAL_PLAN', description: 'Độ lệch calo cho phép (%)' },
      { settingKey: 'CHAT_LIMIT_DAILY_GUEST', settingValue: '3', defaultValue: '3', dataType: 'INT', category: 'AI_QUOTA', description: 'Lượt hỏi Chatbot/ngày (Khách)' },
      { settingKey: 'CHAT_LIMIT_DAILY_FREE', settingValue: '20', defaultValue: '20', dataType: 'INT', category: 'AI_QUOTA', description: 'Lượt hỏi Chatbot/ngày (Miễn phí)' },
      { settingKey: 'CHAT_LIMIT_DAILY_VIP', settingValue: '200', defaultValue: '200', dataType: 'INT', category: 'AI_QUOTA', description: 'Lượt hỏi Chatbot/ngày (VIP)' },
      { settingKey: 'FRIDGE_SCAN_LIMIT_DAILY_FREE', settingValue: '10', defaultValue: '10', dataType: 'INT', category: 'AI_QUOTA', description: 'Lượt quét tủ lạnh/ngày (Miễn phí)' },
      { settingKey: 'FRIDGE_SCAN_LIMIT_DAILY_VIP', settingValue: '30', defaultValue: '30', dataType: 'INT', category: 'AI_QUOTA', description: 'Lượt quét tủ lạnh/ngày (VIP)' },
      { settingKey: 'LLMOPS_DAILY_BUDGET_USD', settingValue: '12.5', defaultValue: '12.5', dataType: 'DECIMAL', category: 'LLMOPS', description: 'Ngân sách AI tối đa ngày (USD)' },
      { settingKey: 'LLMOPS_ALERT_THRESHOLD_PERCENT', settingValue: '80', defaultValue: '80', dataType: 'INT', category: 'LLMOPS', description: 'Ngưỡng cảnh báo chi phí khẩn cấp (%)' },
      { settingKey: 'COMMUNITY_REPORT_LIMIT', settingValue: '10', defaultValue: '10', dataType: 'INT', category: 'COMMUNITY', description: 'Số báo cáo vi phạm tự động ẩn bài' },
      { settingKey: 'LEGAL_USER_AGREEMENT_URL', settingValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.png', defaultValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.png', dataType: 'STRING', category: 'GENERAL', description: 'Thỏa thuận đăng ký người dùng' },
      { settingKey: 'LEGAL_PRIVACY_POLICY_URL', settingValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.png', defaultValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.png', dataType: 'STRING', category: 'GENERAL', description: 'Chính sách bảo mật dữ liệu' },
      { settingKey: 'LEGAL_TERMS_OF_SERVICE_URL', settingValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.png', defaultValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.png', dataType: 'STRING', category: 'GENERAL', description: 'Điều khoản sử dụng dịch vụ' },
      { settingKey: 'LEGAL_VEGAN_DISCLAIMER_URL', settingValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.png', defaultValue: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.png', dataType: 'STRING', category: 'GENERAL', description: 'Quy chuẩn ẩm thực chay & Miễn trừ y tế' },
    ];
    const filtered = cat ? settings.filter((s) => s.category === cat.toUpperCase()) : settings;
    return ok(filtered, 'OK');
  }),

  http.put(api('/admin/settings/:key'), async ({ params, request }) => {
    const key = params.key as string;
    const body = (await request.json()) as { settingValue: string };
    return ok(
      {
        settingKey: key,
        settingValue: body.settingValue,
        defaultValue: '21',
        dataType: 'INT',
        category: 'MEAL_PLAN',
        updatedAt: new Date().toISOString(),
      },
      'Đã cập nhật cấu hình hệ thống.'
    );
  }),

  http.post(api('/admin/settings/:key/reset'), async ({ params }) => {
    const key = params.key as string;
    return ok(
      {
        settingKey: key,
        settingValue: '21',
        defaultValue: '21',
        dataType: 'INT',
        category: 'MEAL_PLAN',
        updatedAt: new Date().toISOString(),
      },
      'Đã khôi phục cấu hình về giá trị mặc định.'
    );
  }),

  // GET /api/v1/system/settings/public
  http.get(api('/system/settings/public'), async () => {
    return ok({
      mealPlanWeeklyLimitFree: 1,
      mealPlanWeeklyLimitVip: 3,
      mealSwapLimitDraft: 21,
      mealSwapLimitActive: 21,
      mealSwapCalorieTolerancePercent: 15,
      chatLimitDailyGuest: 3,
      chatLimitDailyFree: 20,
      chatLimitDailyVip: 50,
      fridgeScanLimitDailyFree: 10,
      fridgeScanLimitDailyVip: 30,
      legalUserAgreementUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.png',
      legalPrivacyPolicyUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.png',
      legalTermsOfServiceUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.png',
      legalVeganDisclaimerUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.png',
    });
  }),

  // GET /api/v1/fridge/quota
  http.get(api('/fridge/quota'), async ({ request }) => {
    const user = currentUser(request);
    const isVip = user?.isVip || user?.role === 'VIP';
    const limit = isVip ? 30 : 10;
    return ok({
      used: 0,
      limit,
      remaining: limit,
      scope: 'daily',
    });
  }),

  // FN-ADM-13: Quản lý & tra cứu giao dịch thanh toán (Payments)
  http.get(api('/admin/payments'), async () => {
    const mockPayments = [
      {
        transactionId: 3001,
        partnerTransactionCode: 'MM20261103001',
        userId: 101,
        userFullName: 'Trần Văn An',
        userEmail: 'tranvanan@example.com',
        planId: 1,
        planName: 'Gói VIP 1 Tháng',
        planDurationDays: 30,
        gatewayProvider: 'MOMO',
        amountVnd: 49000,
        transactionStatus: 'SUCCESS',
        createdAt: '2026-11-03T08:00:00Z',
        startsAt: '2026-11-03T08:00:00Z',
        endsAt: '2026-12-03T08:00:00Z',
        canApprove: false,
        canReconcile: false,
      },
      {
        transactionId: 3002,
        partnerTransactionCode: 'VQR20261103002',
        userId: 102,
        userFullName: 'Lê Thị Bình',
        userEmail: 'binhle@example.com',
        planId: 2,
        planName: 'Gói VIP 3 Tháng',
        planDurationDays: 90,
        gatewayProvider: 'VIETQR',
        amountVnd: 129000,
        transactionStatus: 'PENDING',
        createdAt: '2026-11-03T10:15:00Z',
        startsAt: '2026-11-03T10:15:00Z',
        endsAt: '2027-02-01T10:15:00Z',
        canApprove: true,
        canReconcile: true,
      },
      {
        transactionId: 3003,
        partnerTransactionCode: 'MM20261102003',
        userId: 103,
        userFullName: 'Phạm Minh Châu',
        userEmail: 'chauminh@example.com',
        planId: 1,
        planName: 'Gói VIP 1 Tháng',
        planDurationDays: 30,
        gatewayProvider: 'MOMO',
        amountVnd: 49000,
        transactionStatus: 'FAILED',
        createdAt: '2026-11-02T14:30:00Z',
        startsAt: '2026-11-02T14:30:00Z',
        endsAt: '2026-12-02T14:30:00Z',
        canApprove: false,
        canReconcile: true,
      },
    ];
    return ok(
      {
        items: mockPayments,
        meta: { page: 1, size: 15, total: mockPayments.length },
      },
      'OK'
    );
  }),

  http.post(api('/admin/payments/:id/approve'), async ({ params }) => {
    const id = Number(params.id);
    return ok(
      {
        transactionId: id,
        partnerTransactionCode: `APR_${id}`,
        userId: 102,
        status: 'SUCCESS',
        planName: 'Gói VIP 3 Tháng',
        vipEndsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
      'Đã duyệt thanh toán thành công.'
    );
  }),

  // FN-ADM-13: Quản lý cấu hình gói VIP
  http.get(api('/admin/subscription-plans'), async () => {
    return ok(mockAdminPlans, 'OK');
  }),

  http.post(api('/admin/subscription-plans'), async ({ request }) => {
    const body = (await request.json()) as { planName: string; durationDays: number; priceVnd: number };
    const newId = Math.max(0, ...mockAdminPlans.map((p) => p.planId)) + 1;
    const newPlan = {
      planId: newId,
      planName: body.planName,
      durationDays: body.durationDays,
      priceVnd: body.priceVnd,
      isActive: true,
    };
    mockAdminPlans.push(newPlan);
    return ok({ planId: newId }, 'Đã tạo gói.');
  }),

  http.put(api('/admin/subscription-plans/:id'), async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as { planName?: string; durationDays?: number; priceVnd?: number; isActive?: boolean };
    const idx = mockAdminPlans.findIndex((p) => p.planId === id);
    if (idx >= 0) {
      if (body.planName) mockAdminPlans[idx].planName = body.planName;
      if (body.durationDays) mockAdminPlans[idx].durationDays = body.durationDays;
      if (body.priceVnd) mockAdminPlans[idx].priceVnd = body.priceVnd;
      if (typeof body.isActive === 'boolean') mockAdminPlans[idx].isActive = body.isActive;
      return ok({ planId: id, priceVnd: mockAdminPlans[idx].priceVnd }, 'Đã cập nhật gói.');
    }
    return fail(404, 'ERR_ADM_NOT_FOUND', 'Gói VIP không tồn tại.');
  }),

  http.delete(api('/admin/subscription-plans/:id'), async ({ params }) => {
    const id = Number(params.id);
    const idx = mockAdminPlans.findIndex((p) => p.planId === id);
    if (idx >= 0) {
      mockAdminPlans.splice(idx, 1);
      return ok(null, 'Đã xóa gói VIP thành công.');
    }
    return fail(404, 'ERR_ADM_NOT_FOUND', 'Gói VIP không tồn tại.');
  }),
];

const mockAdminPlans = [
  { planId: 1, planName: 'Gói VIP 1 Tháng - Mở Khóa AI Dinh Dưỡng', durationDays: 30, priceVnd: 49000, isActive: true },
  { planId: 2, planName: 'Gói VIP 3 Tháng - Lộ Trình Sống Khỏe', durationDays: 90, priceVnd: 129000, isActive: true },
  { planId: 3, planName: 'Gói VIP 1 Năm - Thuần Chay Bền Vững', durationDays: 365, priceVnd: 449000, isActive: true },
];
