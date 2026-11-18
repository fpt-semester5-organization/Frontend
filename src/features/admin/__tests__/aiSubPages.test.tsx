import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mockApi, type MockHandler } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import { AdminAiLayout } from '../layouts/AdminAiLayout';
import { AiOverviewPage } from '../pages/ai/AiOverviewPage';
import { Route, Routes, useLocation } from 'react-router-dom';
import { RedirectWithSearch } from '@/routes/RedirectWithSearch';
import { AiKnowledgeSection } from '../components/AiKnowledgeSection';
import { AiLogsPage } from '../pages/ai/AiLogsPage';
import { AiQualityPage } from '../pages/ai/AiQualityPage';

const LocationProbe = () => {
  const { pathname, search, hash } = useLocation();
  return <p data-testid="location">{`${pathname}${search}${hash}`}</p>;
};

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

const SAMPLE_DOCS = [
  {
    id: 'DOC_BOOK_1',
    title: 'Becoming Vegan (Comprehensive Edition)',
    author: 'Brenda Davis, RD',
    fileName: 'Becoming_Vegan.pdf',
    fileType: 'PDF' as const,
    chunks: 1113,
    isActive: true,
    updatedAt: '2026-10-20T08:00:00Z',
  },
];

const SAMPLE_SURVEYS = {
  surveys: {
    items: [
      {
        surveyId: 8001,
        userId: 2,
        userFullName: 'Trần Văn Nam',
        userEmail: 'nam@gmail.com',
        userAvatarUrl: null,
        sessionId: 501,
        sessionTitle: 'Tư vấn thực đơn chay',
        ratingScore: 5,
        contextQuestion: 'Tư vấn thực đơn giảm cân ăn chay có hữu ích không?',
        feedbackContent: 'Bot tư vấn rất chi tiết, có con số calo rõ ràng và giải thích dễ hiểu!',
        createdAt: '2026-10-30T10:00:00Z',
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
};

const handler = (): MockHandler => (req) => {
  if (req.url === '/admin/llmops/dashboard') return { data: LLMOPS };
  if (req.url === '/admin/llmops/logs') return { data: LOGS };
  if (req.url === '/admin/ai/metrics') return { data: METRICS };
  if (req.url === '/admin/ai/surveys') return { data: SAMPLE_SURVEYS };
  if (req.url === '/admin/knowledge/status') return { data: KNOWLEDGE };
  if (req.url === '/admin/knowledge/documents') return { data: SAMPLE_DOCS };
  if (req.url === '/admin/knowledge/documents/upload') return { status: 201, data: SAMPLE_DOCS[0] };
  if (req.url?.startsWith('/admin/knowledge/documents/') && req.method === 'PUT') return { data: { ...SAMPLE_DOCS[0], isActive: false } };
  if (req.url?.startsWith('/admin/knowledge/documents/') && req.method === 'DELETE') return { data: null };
  if (req.url === '/admin/knowledge/reindex') return { status: 202, message: 'Đã xếp job đồng bộ.', data: { jobId: 'job_123' } };
  return undefined;
};

describe('Phân hệ Giám sát AI - Sub-pages & Navigation', () => {
  it('1. AdminAiLayout hiển thị thanh điều hướng Sub-Nav gộp còn 3 mục', () => {
    renderWithProviders(<AdminAiLayout />, '/admin/ai');
    expect(screen.getByText('Quản lý & Giám sát AI')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Điều hướng phân hệ AI' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
    expect(within(nav).getByText('Tổng quan')).toBeInTheDocument();
    expect(within(nav).getByText('Chi phí & Nhật ký API AI')).toBeInTheDocument();
    expect(within(nav).getByText('Chất lượng & Tri thức Chatbot')).toBeInTheDocument();
  });

  it('2. AiOverviewPage hiển thị các thẻ KPI tổng quan và khối Tiêu thụ theo Người dùng', async () => {
    mockApi(handler());
    renderWithProviders(<AiOverviewPage />, '/admin/ai');

    expect(await screen.findByText(/Chi phí hôm nay/)).toBeInTheDocument();
    expect(screen.getByText('Chi phí 30 ngày qua')).toBeInTheDocument();
    expect(screen.getByText('Tiêu thụ theo Người dùng')).toBeInTheDocument();
    expect(screen.getByText('Phân bổ theo Hạng Hội viên')).toBeInTheDocument();
    expect(screen.getByText('Top 5 tài khoản tiêu thụ')).toBeInTheDocument();
  });

  it('3. Phần Phân tích Chi phí (trong AiLogsPage) hiển thị biểu đồ, nút xem bảng số liệu, không có Top 5', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AiLogsPage />, '/admin/ai/logs?from=2026-10-05&to=2026-10-06');

    expect(screen.getByRole('heading', { name: 'Phân tích Chi phí' })).toBeInTheDocument();
    // Một thanh lọc ngày dùng chung cho cả chi phí và nhật ký
    expect(screen.getAllByRole('group', { name: 'Khoảng thời gian' })).toHaveLength(1);
    await waitFor(() => {
      const dashboard = calls.find((c) => c.url === '/admin/llmops/dashboard');
      const logs = calls.find((c) => c.url === '/admin/llmops/logs');
      expect(dashboard?.params).toMatchObject({ from: '2026-10-05', to: '2026-10-06' });
      expect(logs?.params).toMatchObject({ from: '2026-10-05', to: '2026-10-06' });
    });

    expect(await screen.findByRole('button', { name: 'Xem bảng số liệu' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cách xem' })).toBeInTheDocument();
    expect(screen.queryByText('Phân bổ theo Hạng Hội viên')).not.toBeInTheDocument();
    expect(screen.queryByText('Top 5 tài khoản tiêu thụ')).not.toBeInTheDocument();

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

  it('4. AiLogsPage hiển thị bảng tra cứu truy vấn API AI toàn màn hình', async () => {
    mockApi(handler());
    renderWithProviders(<AiLogsPage />, '/admin/ai/logs');

    expect(await screen.findByText(/Nhật ký truy vấn API AI/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo tên, email hoặc lỗi...')).toBeInTheDocument();
    expect(await screen.findByText('Trần Văn VIP')).toBeInTheDocument();
  });

  it('5. AiKnowledgeSection hiển thị trạng thái Qdrant, danh sách tài liệu và thao tác ẩn/xóa', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AiKnowledgeSection />, '/admin/ai/quality#rag');

    expect(screen.getByRole('heading', { name: 'Kho tri thức Chatbot (Qdrant Vector DB)' })).toBeInTheDocument();
    // Chỉ đếm đoạn tài liệu dinh dưỡng đang dùng (chatbot chỉ trích NUTRITION_DOC), không lấy tổng mọi nguồn
    expect(await screen.findByText('1.200')).toBeInTheDocument();
    expect(screen.getAllByText('Tài liệu dinh dưỡng').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Danh sách Tài liệu Dinh dưỡng PDF trong Vector DB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Làm mới' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đồng bộ lại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Tải lên tài liệu PDF mới' })).toBeInTheDocument();

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'GET' && c.url === '/admin/knowledge/documents')).toBe(true);
    });

    // Thao tác ẩn tài liệu: gọi PUT /admin/knowledge/documents/:id/status
    const hideBtn = await screen.findByTitle('Ẩn tài liệu khỏi Chatbot');
    await userEvent.click(hideBtn);
    expect(await screen.findByText(/Ẩn tài liệu khỏi Chatbot\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn tài liệu' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'PUT' && c.url === '/admin/knowledge/documents/DOC_BOOK_1/status')).toBe(true);
    });

    // Thao tác xóa tài liệu: gọi DELETE /admin/knowledge/documents/:id
    const deleteBtn = screen.getByTitle('Xóa khỏi Vector DB');
    await userEvent.click(deleteBtn);
    expect(await screen.findByText(/Xác nhận xóa tài liệu khỏi Vector DB\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa tài liệu' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'DELETE' && c.url === '/admin/knowledge/documents/DOC_BOOK_1')).toBe(true);
    });
  });

  it('6. AiQualityPage hiển thị 4 KPI cốt lõi và danh sách Khảo sát người dùng', async () => {
    mockApi(handler());
    renderWithProviders(<AiQualityPage />, '/admin/ai/quality');

    expect(await screen.findByText('Tổng lượt trò chuyện')).toBeInTheDocument();
    expect(screen.getByText('Độ trễ TB')).toBeInTheDocument();
    expect(screen.getByText('Điểm đánh giá TB')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá hài lòng')).toBeInTheDocument();

    // Khảo sát người dùng
    expect(await screen.findByText('Trần Văn Nam')).toBeInTheDocument();
    expect(screen.getByText(/Tư vấn thực đơn giảm cân ăn chay có hữu ích không\?/)).toBeInTheDocument();
    expect(screen.getByText('5 sao', { selector: 'span' })).toBeInTheDocument();

    // Kho tri thức RAG nằm trong cùng trang
    expect(screen.getByRole('heading', { name: 'Kho tri thức Chatbot (Qdrant Vector DB)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Tải lên tài liệu PDF mới' })).toBeInTheDocument();
  });

  it('7. AiKnowledgeSection gửi tệp PDF lên POST /admin/knowledge/documents/upload', async () => {
    const calls = mockApi(handler());
    renderWithProviders(<AiKnowledgeSection />, '/admin/ai/quality#rag');

    await userEvent.click(screen.getByRole('button', { name: '+ Tải lên tài liệu PDF mới' }));
    expect(await screen.findByText('Tải lên Tài liệu Dinh dưỡng PDF')).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Tiêu đề tài liệu/);
    const authorInput = screen.getByLabelText(/Tác giả/);
    const fileInput = screen.getByLabelText('Chọn file PDF');

    await userEvent.type(titleInput, 'Cẩm nang dinh dưỡng chay');
    await userEvent.type(authorInput, 'Chuyên gia WHO');

    const file = new File(['Nội dung kiểm thử pdf'], 'cam-nang.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, file);

    await userEvent.click(screen.getByRole('button', { name: 'Tải lên & Vector hoá' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url === '/admin/knowledge/documents/upload')).toBe(true);
    });
  });

  it.each([
    ['/admin/ai/analytics?from=2026-10-05&to=2026-10-06', '/admin/ai/logs?from=2026-10-05&to=2026-10-06#cost'],
    ['/admin/ai/rag', '/admin/ai/quality#rag'],
  ])('8. Địa chỉ cũ %s chuyển hướng sang %s, giữ bộ lọc', (from, expected) => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/ai/analytics" element={<RedirectWithSearch to="/admin/ai/logs" hash="cost" />} />
        <Route path="/admin/ai/rag" element={<RedirectWithSearch to="/admin/ai/quality" hash="rag" />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>,
      from
    );
    expect(screen.getByTestId('location')).toHaveTextContent(expected);
  });
});
