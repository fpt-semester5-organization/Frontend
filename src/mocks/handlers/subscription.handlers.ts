import { http } from 'msw';
import { QUOTA } from '@/constants/quota';
import { api, currentUser, fail, latency, ok, unauthorized, validationError } from '../utils';

interface MockPlan {
  planId: number;
  planName: string;
  durationDays: number;
  priceVnd: number;
  isActive: boolean;
}

interface MockTransaction {
  transactionId: number;
  userId: number;
  planId: number;
  gateway: string;
  amountVnd: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  orderCode: string;
  createdAt: string;
  expiresAt: string;
}

const mockPlans: MockPlan[] = [
  { planId: 1, planName: 'VIP 1 tháng', durationDays: 30, priceVnd: 49_000, isActive: true },
  { planId: 2, planName: 'VIP 3 tháng', durationDays: 90, priceVnd: 129_000, isActive: true },
  { planId: 3, planName: 'VIP 1 năm', durationDays: 365, priceVnd: 449_000, isActive: true },
];

let nextTxId = 3001;

const mockTransactions: MockTransaction[] = [
  {
    transactionId: 2999,
    userId: 1002, // User VIP mẫu
    planId: 2,
    gateway: 'VIETQR',
    amountVnd: 129_000,
    status: 'SUCCESS',
    orderCode: 'VL_2999',
    createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() - 15 * 86_400_000 + 300_000).toISOString(),
  },
];

export const subscriptionHandlers = [
  // FN-SUB-01: GET /subscription-plans (công khai; Khách dùng Anonymous JWT)
  http.get(api('/subscription-plans'), async () => {
    await latency();
    return ok(
      {
        plans: mockPlans,
        benefits: {
          free: {
            mealPlansPerWeek: QUOTA.mealPlanPerWeek.free,
            chatPerDay: QUOTA.chatPerDay.free,
            fridgePhotosPerDay: QUOTA.fridgeImagesPerDay.free,
          },
          vip: {
            mealPlansPerWeek: QUOTA.mealPlanPerWeek.vip,
            chatPerDay: null,
            fridgePhotosPerDay: QUOTA.fridgeImagesPerDay.vip,
          },
        },
      },
      'Lấy danh sách gói thành công.'
    );
  }),

  // FN-SUB-02: POST /subscriptions/checkout
  http.post(api('/subscriptions/checkout'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return unauthorized();

    const body = (await request.json()) as { planId?: unknown; gateway?: unknown };
    const planId = Number(body.planId);
    const plan = mockPlans.find((p) => p.planId === planId && p.isActive);

    if (!plan) {
      return fail(404, 'ERR_PLAN_NOT_FOUND', 'Gói không tồn tại hoặc đã ngừng bán.');
    }

    if (body.gateway !== 'VIETQR' && body.gateway !== 'MOMO') {
      return validationError([{ field: 'gateway', message: 'Cổng thanh toán không hợp lệ.' }]);
    }

    // Kiểm tra đơn chờ thanh toán chưa hết hạn
    const pending = mockTransactions.find(
      (t) => t.userId === user.userId && t.status === 'PENDING' && new Date(t.expiresAt).getTime() > Date.now()
    );
    if (pending) {
      return fail(409, 'ERR_PAYMENT_PENDING_EXISTS', 'Bạn đang có đơn thanh toán đang chờ xử lý.');
    }

    const txId = nextTxId++;
    const orderCode = `VL_${txId}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const tx: MockTransaction = {
      transactionId: txId,
      userId: user.userId,
      planId: plan.planId,
      gateway: body.gateway,
      amountVnd: plan.priceVnd,
      status: 'PENDING',
      orderCode,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    mockTransactions.push(tx);

    const payUrl =
      body.gateway === 'MOMO'
        ? `https://test-payment.momo.vn/v2/gateway/pay?orderId=${orderCode}`
        : `https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=${plan.priceVnd}&addInfo=${orderCode}`;

    return ok(
      {
        transactionId: txId,
        orderCode,
        amountVnd: plan.priceVnd,
        payUrl,
        expiresAt,
      },
      'Tạo đơn thanh toán thành công.'
    );
  }),

  // FN-SUB-04: GET /users/me/subscription
  http.get(api('/users/me/subscription'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return unauthorized();

    const userTxs = mockTransactions
      .filter((t) => t.userId === user.userId)
      .map(({ transactionId, gateway, amountVnd, status, createdAt }) => ({
        transactionId,
        gateway,
        amountVnd,
        status,
        createdAt,
      }));

    const isVip = user.isVip || user.role === 'VIP';
    const activePlan = isVip ? mockPlans[1] : null;
    const endsAt = isVip ? new Date(Date.now() + 75 * 86_400_000).toISOString() : null;

    return ok(
      {
        isVip,
        plan: activePlan,
        endsAt,
        transactions: userTxs,
      },
      'Lấy thông tin gói thành công.'
    );
  }),
];
