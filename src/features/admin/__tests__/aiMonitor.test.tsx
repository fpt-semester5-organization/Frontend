import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mockApi, type MockHandler } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminAiPage from '../pages/AdminAiPage';

// jsdom không đo layout: cho khung biểu đồ bề rộng cố định để SVG được vẽ.
const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 }));
afterAll(() => widthDescriptor && Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor));

const ROUTE = '/admin/ai?from=2026-10-05&to=2026-10-06';

const LLMOPS = {
  todayCostUsd: 10.6,
  dailyBudgetUsd: 12.5,
  usagePercent: 84.8,
  alertLevel: 'NONE',
  series: [
    { date: '2026-10-05', feature: 'AI_CHAT', tokens: 120000, costUsd: 4.2 },
    { date: '2026-10-05', feature: 'MEAL_PLAN_GEN', tokens: 30000, costUsd: 1.2 },
    { date: '2026-10-06', feature: 'AI_CHAT', tokens: 80000, costUsd: 2.75 },
  ],
};
const METRICS = {
  modules: [
    { module: 'CHATBOT', negativeRate: 0.25, errorRate: 0.02, avgLatencyMs: 2300 },
    { module: 'MEAL_PLANNER', negativeRate: 0.05, errorRate: 0.01, avgLatencyMs: 4100 },
  ],
  modelDriftAlert: true,
  circuit: { state: 'OPEN' },
};
const KNOWLEDGE = {
  collection: 'veggielife_knowledge',
  totalPoints: 1842,
  bySource: { RECIPE: 1200, POST: 310 },
  lastIndexedAt: '2026-10-20T09:00:00Z',
  pending: 0,
  failed: 2,
};

const handler =
  (overrides: Partial<Record<'llmops' | 'metrics' | 'knowledge' | 'reindex', ReturnType<MockHandler>>> = {}): MockHandler =>
  (req) => {
    if (req.url === '/admin/llmops/dashboard') return overrides.llmops ?? { data: LLMOPS };
    if (req.url === '/admin/ai/metrics') return overrides.metrics ?? { data: METRICS };
    if (req.url === '/admin/knowledge/status') return overrides.knowledge ?? { data: KNOWLEDGE };
    if (req.url === '/admin/knowledge/reindex') return overrides.reindex ?? { status: 202, message: 'Đã xếp job đồng bộ kho tri thức.', data: { jobId: 'kb_20261023_01' } };
    return undefined;
  };

describe('SCR-41 Giám sát AI', () => {
  it('Backend chưa có API: cả ba phần báo "Máy chủ chưa hỗ trợ"', async () => {
    mockApi(() => ({ status: 404 }));
    renderWithProviders(<AdminAiPage />, ROUTE);
    await waitFor(() => expect(screen.getAllByText('Máy chủ chưa hỗ trợ chức năng này')).toHaveLength(3));
  });

  it('biểu đồ và bảng số liệu khớp đúng series Backend trả; gửi from/to của bộ lọc', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AdminAiPage />, ROUTE);

    // Mỗi cột ngày = tổng các điểm của ngày đó: 05/10 = 4,2 + 1,2; 06/10 = 2,75
    expect(await screen.findByLabelText('05/10/2026: $5,4')).toBeInTheDocument();
    expect(screen.getByLabelText('06/10/2026: $2,75')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chú giải' })).toHaveTextContent(/Trợ lý dinh dưỡng.*Lập thực đơn/);
    expect(calls.find((c) => c.url === '/admin/llmops/dashboard')?.params).toEqual({ from: '2026-10-05', to: '2026-10-06' });

    await userEvent.click(screen.getByRole('button', { name: 'Xem bảng số liệu' }));
    const table = screen.getByRole('region', { name: 'Bảng số liệu chi phí AI' });
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(rows).toEqual([
      '05/10/2026Trợ lý dinh dưỡng120.000$4,2',
      'Lập thực đơn30.000$1,2',
      '06/10/2026Trợ lý dinh dưỡng80.000$2,75',
      'Tổng cả kỳ230.000$8,15',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Theo tính năng' }));
    expect(screen.getByRole('list', { name: 'Chi phí AI theo tính năng' })).toHaveTextContent(/Trợ lý dinh dưỡng\$6,95/);
  });

  it('dùng ≥ 80% ngân sách ngày: cảnh báo kèm chữ, đồng hồ đo đúng phần trăm', async () => {
    mockApi(handler());
    renderWithProviders(<AdminAiPage />, ROUTE);
    expect(await screen.findByText('Đã dùng từ 80% ngân sách ngày')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Mức dùng ngân sách ngày' })).toHaveAttribute('aria-valuenow', '85');
  });

  it('cờ chất lượng: tiêu cực > 20% bị gắn cờ, cảnh báo Model Drift, mạch AI đang ngắt', async () => {
    mockApi(handler());
    renderWithProviders(<AdminAiPage />, ROUTE);
    const row = (await screen.findByText('Trợ lý dinh dưỡng', { selector: 'td' })).closest('tr')!;
    expect(within(row).getByText('Đánh giá tiêu cực vượt 20%')).toBeInTheDocument();
    expect(within(row).getByText('25%')).toBeInTheDocument();
    expect(within(screen.getByText('Lập thực đơn', { selector: 'td' }).closest('tr')!).getByText('Ổn định')).toBeInTheDocument();
    expect(screen.getByText('Cảnh báo suy giảm độ chính xác (Model Drift)')).toBeInTheDocument();
    expect(screen.getByText('Đang ngắt')).toBeInTheDocument();
  });

  it('kho tri thức: hiện trạng thái Qdrant; "Đồng bộ lại" hỏi xác nhận rồi POST đúng phạm vi', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AdminAiPage />, ROUTE);
    expect(await screen.findByText('veggielife_knowledge')).toBeInTheDocument();
    expect(screen.getByText('1.842')).toBeInTheDocument();
    expect(screen.getByText(/2 mục đồng bộ lỗi/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Phạm vi'), 'RECIPE');
    await userEvent.click(screen.getByRole('button', { name: 'Đồng bộ lại' }));
    expect(screen.getByText(/tốn token/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu đồng bộ' }));
    expect(await screen.findByText('kb_20261023_01')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ url: '/admin/knowledge/reindex', body: { scope: 'RECIPE' } });
  });

  it('409 ERR_KNOWLEDGE_REINDEX_RUNNING: hộp thoại với message của server', async () => {
    mockApi(handler({ reindex: { status: 409, errorCode: 'ERR_KNOWLEDGE_REINDEX_RUNNING', message: 'Đang có job đồng bộ chạy.' } }));
    renderWithProviders(<AdminAiPage />, ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Đồng bộ lại' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu đồng bộ' }));
    expect(await screen.findByText('Đang có job đồng bộ chạy.')).toBeInTheDocument();
  });

  it('không có lượt gọi AI trong kỳ: trạng thái rỗng thay cho biểu đồ', async () => {
    mockApi(handler({ llmops: { data: { ...LLMOPS, usagePercent: 0, todayCostUsd: 0, series: [] } } }));
    renderWithProviders(<AdminAiPage />, ROUTE);
    expect(await screen.findByText('Chưa có dữ liệu chi phí')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem bảng số liệu' })).not.toBeInTheDocument();
  });
});
