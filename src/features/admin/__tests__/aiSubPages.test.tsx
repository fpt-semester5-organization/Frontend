import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mockApi, type MockHandler } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import { AdminAiLayout } from '../layouts/AdminAiLayout';
import { AiOverviewPage } from '../pages/ai/AiOverviewPage';
import { AiAnalyticsPage } from '../pages/ai/AiAnalyticsPage';
import { AiLogsPage } from '../pages/ai/AiLogsPage';
import { AiRagPage } from '../pages/ai/AiRagPage';
import { AiQualityPage } from '../pages/ai/AiQualityPage';

const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 }));
afterAll(() => widthDescriptor && Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor));

const LLMOPS = {
  todayCostUsd: 10.6,
  dailyBudgetUsd: 12.5,
  usagePercent: 84.8,
  alertLevel: 'NONE',
  totalTokens: 230000,
  totalCostUsd: 8.15,
  totalPromptTokens: 150000,
  totalCompletionTokens: 80000,
  promptCostUsd: 0.0112,
  completionCostUsd: 0.024,
  userTierDistribution: {
    vipTokens: 160000,
    vipCostUsd: 0.0245,
    memberTokens: 60000,
    memberCostUsd: 0.0092,
    systemTokens: 10000,
    systemCostUsd: 0.0015,
  },
  topSpenders: [
    {
      userId: 101,
      fullName: 'Trần Văn VIP',
      email: 'tranvanvip@gmail.com',
      role: 'VIP',
      totalTokens: 120000,
      totalCostUsd: 0.0184,
      requestCount: 42,
    },
  ],
  series: [
    { date: '2026-10-05', feature: 'AI_CHAT', tokens: 120000, costUsd: 4.2 },
    { date: '2026-10-05', feature: 'MEAL_PLAN_GEN', tokens: 30000, costUsd: 1.2 },
  ],
};

const LOGS = {
  items: [
    {
      logId: 1001,
      featureCode: 'AI_CHAT',
      modelUsed: 'gemini-2.5-flash',
      userId: 101,
      userFullName: 'Trần Văn VIP',
      userEmail: 'tranvanvip@gmail.com',
      promptTokens: 1200,
      completionTokens: 350,
      totalTokens: 1550,
      estimatedCostUsd: 0.00015,
      latencyMs: 1420,
      requestStatus: 'SUCCESS',
      userRole: 'VIP',
      createdAt: '2026-10-06T14:30:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
};

const METRICS = {
  windowDays: 30,
  circuit: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null },
  modelDriftAlert: false,
  modules: [
    { module: 'CHATBOT', negativeRate: 0.05, errorRate: 0.01, avgLatencyMs: 1200 },
    { module: 'MEAL_PLANNER', negativeRate: 0.02, errorRate: 0.0, avgLatencyMs: 2500 },
  ],
};

const KNOWLEDGE = {
  collection: 'veggielife_nutrition_kb',
  totalPoints: 2450,
  lastIndexedAt: '2026-10-20T08:00:00Z',
  pending: 0,
  failed: 0,
  bySource: {
    NUTRITION_DOC: 1200,
    RECIPE: 850,
    POST: 300,
    E_NUMBER: 100,
  },
};

const handler = (): MockHandler => (req) => {
  if (req.url === '/admin/llmops/dashboard') return { data: LLMOPS };
  if (req.url === '/admin/llmops/logs') return { data: LOGS };
  if (req.url === '/admin/ai/metrics') return { data: METRICS };
  if (req.url === '/admin/knowledge/status') return { data: KNOWLEDGE };
  if (req.url === '/admin/knowledge/reindex') return { status: 202, message: 'Đã xếp job đồng bộ.', data: { jobId: 'job_123' } };
  return undefined;
};

describe('Phân hệ Giám sát AI - Sub-pages & Navigation', () => {
  it('1. AdminAiLayout hiển thị thanh điều hướng Sub-Nav với đầy đủ 5 mục', () => {
    renderWithProviders(<AdminAiLayout />, '/admin/ai');
    expect(screen.getByText('Quản lý & Giám sát AI')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Điều hướng phân hệ AI' });
    expect(within(nav).getByText('Tổng quan')).toBeInTheDocument();
    expect(within(nav).getByText('Phân tích Chi phí')).toBeInTheDocument();
    expect(within(nav).getByText('Nhật ký cuộc gọi')).toBeInTheDocument();
    expect(within(nav).getByText('Kho tri thức RAG')).toBeInTheDocument();
    expect(within(nav).getByText('Chất lượng & SLA')).toBeInTheDocument();
  });

  it('2. AiOverviewPage hiển thị các thẻ KPI tổng quan và khối Tiêu thụ theo Người dùng', async () => {
    mockApi(handler());
    renderWithProviders(<AiOverviewPage />, '/admin/ai');

    expect(await screen.findByText('Chi phí hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Chi phí 30 ngày qua')).toBeInTheDocument();
    expect(screen.getByText('Tiêu thụ theo Người dùng')).toBeInTheDocument();
    expect(screen.getByText('Phân bổ theo Hạng Hội viên')).toBeInTheDocument();
    expect(screen.getByText('Top 5 tài khoản tiêu thụ')).toBeInTheDocument();
  });

  it('3. AiAnalyticsPage hiển thị bộ lọc, biểu đồ, nút xem bảng số liệu và top spenders', async () => {
    mockApi(handler());
    renderWithProviders(<AiAnalyticsPage />, '/admin/ai/analytics?from=2026-10-05&to=2026-10-06');

    expect(await screen.findByRole('button', { name: 'Xem bảng số liệu' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cách xem' })).toBeInTheDocument();
    expect(screen.getByText('Phân bổ theo Hạng Hội viên')).toBeInTheDocument();
    expect(screen.getByText('Top 5 tài khoản tiêu thụ')).toBeInTheDocument();

    // Kiểm tra chuyển đổi các loại biểu đồ
    const switcher = screen.getByRole('group', { name: 'Cách xem' });

    // 1. Chuyển sang Vùng xu hướng (Stacked Area)
    await userEvent.click(within(switcher).getByRole('button', { name: /Vùng xu hướng/ }));
    expect(screen.getByLabelText('Biểu đồ vùng chi phí AI theo ngày')).toBeInTheDocument();

    // 2. Chuyển sang Biểu đồ tròn % (Pie Chart)
    await userEvent.click(within(switcher).getByRole('button', { name: /Biểu đồ tròn %/ }));
    expect(screen.getByLabelText('Biểu đồ tròn tỷ trọng chi phí')).toBeInTheDocument();

    // 3. Chuyển sang Phân rã Token (Input vs Output)
    await userEvent.click(within(switcher).getByRole('button', { name: /Phân rã Token/ }));
    expect(screen.getByLabelText('Biểu đồ phân rã Token Input và Output')).toBeInTheDocument();

    // 4. Chuyển sang Theo tính năng (Feature Bars)
    await userEvent.click(within(switcher).getByRole('button', { name: /Theo tính năng/ }));
    expect(screen.getByLabelText('Chi phí AI theo tính năng')).toBeInTheDocument();

    // 5. Quay về Cột chồng (Daily Stacked Bar)
    await userEvent.click(within(switcher).getByRole('button', { name: /Cột chồng/ }));
    expect(screen.getByLabelText('Biểu đồ chi phí AI theo ngày')).toBeInTheDocument();
  });

  it('4. AiLogsPage hiển thị bảng tra cứu cuộc gọi toàn màn hình', async () => {
    mockApi(handler());
    renderWithProviders(<AiLogsPage />, '/admin/ai/logs');

    expect(await screen.findByText(/Nhật ký cuộc gọi AI/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo tên, email hoặc lỗi...')).toBeInTheDocument();
    expect(await screen.findByText('Trần Văn VIP')).toBeInTheDocument();
  });

  it('5. AiRagPage hiển thị trạng thái Qdrant, phân bổ nguồn và form reindex', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AiRagPage />, '/admin/ai/rag');

    expect(await screen.findByText('veggielife_nutrition_kb')).toBeInTheDocument();
    expect(screen.getByText('2.450')).toBeInTheDocument();
    expect(screen.getAllByText('Tài liệu dinh dưỡng').length).toBeGreaterThanOrEqual(1);

    await userEvent.click(screen.getByRole('button', { name: 'Đồng bộ lại' }));
    expect(await screen.findByText(/Xác nhận đồng bộ lại/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu đồng bộ' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url === '/admin/knowledge/reindex')).toBe(true);
    });
  });

  it('6. AiQualityPage hiển thị Circuit Breaker và ma trận SLA theo tính năng', async () => {
    mockApi(handler());
    renderWithProviders(<AiQualityPage />, '/admin/ai/quality');

    expect(await screen.findByText('Cơ chế Ngắt mạch AI (Circuit Breaker)')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Chất lượng theo tính năng AI' })).toBeInTheDocument();
    expect(screen.getByText('Trợ lý dinh dưỡng', { selector: 'td' })).toBeInTheDocument();
  });
});
