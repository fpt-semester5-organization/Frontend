import { http, HttpResponse } from 'msw';

import { chatMessages, chatSessions, nextId, surveys, type MockChatMessage, type MockChatSession, type MockSurvey } from '../db';
import { api, currentUser, fail, isPositiveInt, latency, ok } from '../utils';

export const chatHandlers = [
  // FN-CHAT-01: POST /api/v1/chat/sessions
  http.post(api('/chat/sessions'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    const body = ((await request.json().catch(() => ({}))) as {
      title?: string;
      contextType?: string;
    }) ?? {};

    const title = body.title?.trim() || 'Tư vấn dinh dưỡng mới';
    const contextType = body.contextType || 'NUTRITION_CONSULTATION';
    const sessionId = nextId('chatSession');
    const now = new Date().toISOString();

    const newSession: MockChatSession = {
      sessionId,
      userId: user?.userId ?? null,
      guestUuid: user ? null : 'guest-mock-uuid',
      title,
      contextType,
      startedAt: now,
      updatedAt: now,
    };
    chatSessions.unshift(newSession);

    return ok(
      {
        sessionId,
        title,
        contextType,
        startedAt: now,
      },
      'Đã tạo phiên hội thoại.',
      201
    );
  }),

  // FN-CHAT-03: GET /api/v1/chat/sessions (Chỉ Thành viên / VIP)
  http.get(api('/chat/sessions'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) {
      return fail(
        403,
        'ERR_GUEST_COMMUNITY_ACTION_DENIED',
        'Khách vãng lai thực hiện thao tác chỉ dành cho Thành viên (FN-AUTH-03).'
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const size = Math.min(50, Math.max(1, Number(url.searchParams.get('size')) || 20));

    const userSessions = chatSessions.filter((s) => s.userId === user.userId);
    const start = (page - 1) * size;
    const items = userSessions.slice(start, start + size).map((s) => {
      const lastMsg = chatMessages
        .filter((m) => m.sessionId === s.sessionId)
        .sort((a, b) => b.messageId - a.messageId)[0];
      return {
        sessionId: s.sessionId,
        title: s.title,
        lastMessagePreview: lastMsg ? lastMsg.content.slice(0, 80) : null,
        updatedAt: s.updatedAt,
      };
    });

    return ok(items, 'OK', 200, { page, size, total: userSessions.length });
  }),

  // FN-CHAT-02: POST /api/v1/chat/sessions/:id/messages
  http.post(api('/chat/sessions/:id/messages'), async ({ request, params }) => {
    await latency();
    const sessionId = Number(params.id);
    if (!isPositiveInt(sessionId)) {
      return fail(400, 'ERR_VALIDATION', 'Mã phiên hội thoại không hợp lệ.');
    }

    const session = chatSessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      return fail(404, 'ERR_CHAT_SESSION_NOT_FOUND', 'Phiên hội thoại không tồn tại hoặc không thuộc về bạn.');
    }

    const body = (await request.json().catch(() => ({}))) as { message?: string };
    const text = body.message?.trim();
    if (!text) {
      return fail(400, 'ERR_VALIDATION', 'Nội dung câu hỏi không được để trống.');
    }
    if (text.length > 1000) {
      return fail(400, 'ERR_VALIDATION', 'Nội dung câu hỏi tối đa 1000 ký tự.');
    }

    // Kiểm tra an toàn (nội dung có từ cấm cực đoan)
    if (text.toLowerCase().includes('độc hại') || text.toLowerCase().includes('thuốc kích dục')) {
      return fail(400, 'ERR_CHAT_UNSAFE_CONTENT', 'Nội dung vi phạm tiêu chuẩn an toàn.');
    }

    const user = currentUser(request);
    const now = new Date().toISOString();

    // 1. Thêm tin nhắn USER
    const userMsgId = nextId('chatMessage');
    chatMessages.push({
      messageId: userMsgId,
      sessionId,
      senderType: 'USER',
      content: text,
      createdAt: now,
    });

    // 2. Tạo phản hồi ASSISTANT có RAG
    const assistantMsgId = nextId('chatMessage');
    const assistantContent = `Dựa trên tri thức dinh dưỡng thuần chay [S1], câu hỏi "${text}" của bạn có thể giải quyết bằng chế độ bổ sung cân đối. Bạn có thể bổ sung đạm và vi chất từ đậu phụ, tempeh lên men và nấm [S2]. Hãy chú ý ngâm đậu kỹ để giảm axit phytic.`;
    const disclaimer =
      'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.';
    const sources = [
      { type: 'RECIPE', id: 512, title: 'Canh nấm đậu phụ rong biển' },
      { type: 'NUTRITION_DOC', id: 10, title: 'Cẩm nang dinh dưỡng thực vật (WHO & Viện Dinh Dưỡng)' },
    ];
    const recommendedRecipes = [
      { recipeId: 512, title: 'Canh nấm đậu phụ rong biển', cookTimeMinutes: 25 },
    ];

    const assistantMsg: MockChatMessage = {
      messageId: assistantMsgId,
      sessionId,
      senderType: 'ASSISTANT',
      content: assistantContent,
      disclaimer,
      sources,
      ragUsed: true,
      recommendedRecipes,
      createdAt: new Date().toISOString(),
    };
    chatMessages.push(assistantMsg);

    session.updatedAt = new Date().toISOString();

    // Tính quota
    const limit = user ? (user.isVip ? 200 : 20) : 3;
    const used = user ? 2 : 1;
    const remaining = limit - used;

    return ok(
      {
        message: {
          messageId: assistantMsg.messageId,
          senderType: assistantMsg.senderType,
          content: assistantMsg.content,
          disclaimer: assistantMsg.disclaimer,
          sources: assistantMsg.sources,
          ragUsed: assistantMsg.ragUsed,
          recommendedRecipes: assistantMsg.recommendedRecipes,
          createdAt: assistantMsg.createdAt,
        },
        quota: {
          used,
          limit,
          remaining,
          scope: user ? 'DAILY' : 'SESSION',
        },
      },
      'OK'
    );
  }),

  // FN-CHAT-04: GET /api/v1/chat/sessions/:id/messages
  http.get(api('/chat/sessions/:id/messages'), async ({ request, params }) => {
    await latency();
    const sessionId = Number(params.id);
    if (!isPositiveInt(sessionId)) {
      return fail(400, 'ERR_VALIDATION', 'Mã phiên hội thoại không hợp lệ.');
    }

    const session = chatSessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      return fail(404, 'ERR_CHAT_SESSION_NOT_FOUND', 'Phiên hội thoại không tồn tại hoặc không thuộc về bạn.');
    }

    const url = new URL(request.url);
    const before = url.searchParams.get('before') ? Number(url.searchParams.get('before')) : undefined;
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size')) || 20));

    let msgs = chatMessages.filter((m) => m.sessionId === sessionId);
    if (before && isPositiveInt(before)) {
      msgs = msgs.filter((m) => m.messageId < before);
    }
    msgs.sort((a, b) => b.messageId - a.messageId); // mới nhất trước để phân trang

    const slice = msgs.slice(0, size);
    const hasMore = msgs.length > size;

    return HttpResponse.json({
      statusCode: 200,
      message: 'OK',
      data: slice.reverse(), // trả về theo thứ tự cũ -> mới
      meta: { size, hasMore },
    });
  }),

  // FN-CHAT-05: DELETE /api/v1/chat/sessions/:id
  http.delete(api('/chat/sessions/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) {
      return fail(401, 'ERR_AUTH_INVALID_TOKEN', 'Yêu cầu đăng nhập để xóa phiên.');
    }

    const sessionId = Number(params.id);
    if (!isPositiveInt(sessionId)) {
      return fail(400, 'ERR_VALIDATION', 'Mã phiên hội thoại không hợp lệ.');
    }

    const idx = chatSessions.findIndex((s) => s.sessionId === sessionId);
    if (idx === -1) {
      return fail(404, 'ERR_CHAT_SESSION_NOT_FOUND', 'Phiên hội thoại không tồn tại hoặc không thuộc về bạn.');
    }

    chatSessions.splice(idx, 1);
    // Xóa các tin nhắn thuộc phiên
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].sessionId === sessionId) {
        chatMessages.splice(i, 1);
      }
    }

    return ok(null, 'Đã xóa phiên hội thoại.');
  }),

  // FN-CHAT-06: POST /api/v1/surveys
  http.post(api('/surveys'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) {
      return fail(
        403,
        'ERR_GUEST_COMMUNITY_ACTION_DENIED',
        'Khách vãng lai thực hiện thao tác chỉ dành cho Thành viên (FN-AUTH-03).'
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      chatSessionId?: number;
      contextQuestion?: string;
      ratingScore?: number;
      feedbackContent?: string;
    };

    if (!body.contextQuestion || body.contextQuestion.trim().length === 0) {
      return fail(400, 'ERR_VALIDATION', 'Thiếu câu hỏi được đánh giá.');
    }
    if (!body.ratingScore || body.ratingScore < 1 || body.ratingScore > 5) {
      return fail(400, 'ERR_VALIDATION', 'Điểm đánh giá phải từ 1 đến 5 sao.');
    }

    const surveyId = nextId('survey');
    const newSurvey: MockSurvey = {
      surveyId,
      chatSessionId: body.chatSessionId,
      userId: user.userId,
      contextQuestion: body.contextQuestion.trim(),
      ratingScore: body.ratingScore,
      feedbackContent: body.feedbackContent?.trim(),
      createdAt: new Date().toISOString(),
    };
    surveys.push(newSurvey);

    return ok({ surveyId }, 'Cảm ơn bạn đã đánh giá.', 201);
  }),
];
