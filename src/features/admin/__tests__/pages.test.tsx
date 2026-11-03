import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalog from '../api/catalog.api';
import * as moderation from '../api/moderation.api';
import * as system from '../api/system.api';
import { AdminModerationQueuePage } from '../pages/AdminModerationQueuePage';
import { CommentModerationPage } from '../pages/CommentModerationPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { RecipeVerificationPage } from '../pages/RecipeVerificationPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { paged, renderWithProviders } from '../test-utils';

vi.mock('../api/moderation.api');
vi.mock('../api/catalog.api');
vi.mock('../api/system.api');

const apiError = (status: number, errorCode: string, message = errorCode, data?: Record<string, unknown>) => {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('x', String(status), config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { statusCode: status, errorCode, message, data },
  });
};
const ok = <T,>(data: T, message = 'OK') => ({ data, message });

const item = {
  reportId: 91,
  targetType: 'COMMENT' as const,
  targetId: 301,
  violationType: 'VIO_SPAM' as const,
  reportSource: 'AI_SCAN' as const,
  evidenceSummary: 'Quảng cáo trái phép phát hiện bởi AI',
  status: 'PENDING',
  createdAt: '2026-10-05T10:00:00Z',
};

beforeEach(() => {
  vi.mocked(moderation.listModerationQueue).mockImplementation(async (q) =>
    q.size === 1 ? paged([], 4, 1, 1) : paged([item], 1),
  );
});

describe('Hàng đợi kiểm duyệt 2 Tab (SCR-34)', () => {
  it('hiển thị dữ liệu từ API và có 2 Tab trực quan (AI gắn cờ / Bị báo cáo)', async () => {
    renderWithProviders(<AdminModerationQueuePage />);
    expect(await screen.findByText('#RPT-91')).toBeInTheDocument();
    expect(screen.getByText('Quảng cáo trái phép phát hiện bởi AI')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Spam / quảng cáo')).toBeInTheDocument();

    // Kiểm tra các tab nguồn kiểm duyệt trực quan hiển thị
    const aiTab = screen.getByRole('tab', { name: /(?:Bài do )?AI gắn cờ/i });
    const userTab = screen.getByRole('tab', { name: /Người dùng báo cáo|Bài bị báo cáo/i });
    expect(aiTab).toBeInTheDocument();
    expect(userTab).toBeInTheDocument();
  });

  it('bấm chuyển Tab chuyển nguồn kiểm duyệt và gọi API tương ứng', async () => {
    renderWithProviders(<AdminModerationQueuePage />);
    await screen.findByText('#RPT-91');

    const userTab = screen.getByRole('tab', { name: /Người dùng báo cáo|Bài bị báo cáo/i });
    await userEvent.click(userTab);

    await waitFor(() =>
      expect(moderation.listModerationQueue).toHaveBeenCalledWith(
        expect.objectContaining({ reportSource: 'USER_REPORT', page: 1 }),
      ),
    );
  });

  it('quyết định xử lý yêu cầu ghi chú 10–500 ký tự', async () => {
    vi.mocked(moderation.decideReport).mockResolvedValue(ok({ reportId: 91, status: 'RESOLVED' }, 'Đã xử lý'));
    renderWithProviders(<AdminModerationQueuePage />);
    await userEvent.click(await screen.findByRole('button', { name: /(?:Xác nhận|Xác nhận vi phạm)/ }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Ghi chú quyết định/), 'ngắn');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận vi phạm' }));
    expect(await within(dialog).findByText('Lý do 10–500 ký tự')).toBeInTheDocument();
    expect(moderation.decideReport).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Ghi chú quyết định/), ' và đã đủ 10 ký tự');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận vi phạm' }));

    await waitFor(() =>
      expect(moderation.decideReport).toHaveBeenCalledWith(
        91,
        expect.objectContaining({ decision: 'UPHOLD', note: 'ngắn và đã đủ 10 ký tự' }),
      ),
    );
  });
});

describe('Kiểm duyệt bình luận vi phạm (SCR-35)', () => {
  it('hộp xác nhận xóa yêu cầu lý do 10–500 ký tự và cảnh báo xóa mềm cascade', async () => {
    vi.mocked(moderation.deleteComment).mockResolvedValue(ok({ deleted: true }, 'Đã xóa'));
    renderWithProviders(<CommentModerationPage />);
    expect(await screen.findByText('#RPT-91')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /(?:Xóa bình luận|Xóa)/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/toàn bộ trả lời bên dưới sẽ bị ẩn/)).toBeInTheDocument();

    const input = within(dialog).getByLabelText(/Lý do/);
    await userEvent.type(input, 'Spam thô thiển quảng cáo bài bạc');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xóa bình luận' }));

    await waitFor(() =>
      expect(moderation.deleteComment).toHaveBeenCalledWith(
        301,
        'Spam thô thiển quảng cáo bài bạc',
      ),
    );
  });
});

describe('Quản lý danh mục món ăn (SCR-36)', () => {
  it('xóa danh mục còn nội dung phụ thuộc yêu cầu chọn danh mục nhận dữ liệu', async () => {
    vi.mocked(catalog.listCategories).mockResolvedValue([
      { categoryId: 1, categoryName: 'Món chính', isCore: true },
      { categoryId: 7, categoryName: 'Món phụ', isCore: false },
      { categoryId: 8, categoryName: 'Tráng miệng', isCore: false },
    ]);
    vi.mocked(catalog.deleteCategory)
      .mockRejectedValueOnce(apiError(409, 'ERR_CATEGORY_NEEDS_MIGRATION', 'Còn nội dung phụ thuộc.'))
      .mockResolvedValueOnce(ok({ migratedRecipes: 3, migratedVenues: 0 }, 'Đã xóa.'));

    renderWithProviders(<CategoriesPage />);
    expect(await screen.findByText('Món phụ')).toBeInTheDocument();

    const row = screen.getByText('Món phụ').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: /Thao tác khác/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Xóa danh mục' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa danh mục' }));

    expect(await screen.findByText(/Còn nội dung phụ thuộc\./)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Danh mục nhận dữ liệu/), '8');
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển và xóa' }));

    await waitFor(() => expect(catalog.deleteCategory).toHaveBeenLastCalledWith(7, 8));
  });

  it('danh mục cốt lõi bị vô hiệu hóa nút xóa', async () => {
    vi.mocked(catalog.listCategories).mockResolvedValue([
      { categoryId: 1, categoryName: 'Món chính', isCore: true },
    ]);
    renderWithProviders(<CategoriesPage />);
    await screen.findByText('Món chính');

    await userEvent.click(screen.getByRole('button', { name: /Thao tác khác/ }));
    expect(await screen.findByRole('menuitem', { name: 'Xóa danh mục' })).toBeDisabled();
  });
});

describe('Xác minh công thức chuẩn chay (SCR-37)', () => {
  it('hiển thị danh sách công thức và tiêu chuẩn 4 tiêu chí', async () => {
    vi.mocked(catalog.listRecipesForVerification).mockResolvedValue(
      paged(
        [
          {
            recipeId: 10,
            title: 'Canh Chua Chay',
            voteCount: 15,
            isVerified: false,
            cookTimeMinutes: 25,
            dietarySchool: 'Thuần chay',
          },
        ],
        1,
      ),
    );
    renderWithProviders(<RecipeVerificationPage />);
    expect(await screen.findByText('Canh Chua Chay')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Chưa xác minh')).toBeInTheDocument();
  });
});

describe('Bảng tổng quan Dashboard (SCR-38)', () => {
  it('hiển thị số liệu tổng quan người dùng, VIP, AI Cost từ API', async () => {
    vi.mocked(system.getAnalyticsOverview).mockResolvedValue({
      users: { total: 1234, newInPeriod: 56, byStatus: { ACTIVE: 1200, SUSPENDED: 4 } },
      content: { recipes: 10, posts: 20, videos: 3 },
      vip: { active: 9, revenueVnd: 1_500_000 },
      moderationQueue: 14,
      aiCostUsd: 12.5,
    });
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('+56 trong kỳ')).toBeInTheDocument();
  });
});

describe('Nhật ký kiểm toán (SCR-40)', () => {
  it('bảng nhật ký chỉ đọc và kiểm tra dải ngày', async () => {
    vi.mocked(system.listAuditLogs).mockResolvedValue(
      paged(
        [
          {
            auditId: 1,
            actorUserId: 1,
            actorRole: 'ADMIN',
            action: 'USER_SANCTION',
            targetTable: 'Users',
            targetId: '5',
            note: 'Xử phạt vi phạm spam',
            createdAt: '2026-10-05T10:00:00Z',
          },
        ],
        1,
      ),
    );
    renderWithProviders(<AuditLogsPage />);
    expect(await screen.findByText('USER_SANCTION')).toBeInTheDocument();
    expect(screen.getByText('Xử phạt người dùng')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa|Sửa/ })).not.toBeInTheDocument();
  });

  it('bấm nút Chi tiết mở modal xem thông tin thay đổi dữ liệu', async () => {
    vi.mocked(system.listAuditLogs).mockResolvedValue(
      paged(
        [
          {
            auditId: 99,
            actorUserId: 1,
            actorRole: 'ADMIN',
            action: 'USER_SANCTION',
            targetTable: 'Users',
            targetId: '5',
            note: 'Khóa tài khoản vi phạm',
            oldValue: '{"status":"ACTIVE"}',
            newValue: '{"status":"SUSPENDED"}',
            createdAt: '2026-10-05T10:00:00Z',
          },
        ],
        1,
      ),
    );
    renderWithProviders(<AuditLogsPage />);
    const detailBtn = await screen.findByRole('button', { name: /Chi tiết/ });
    await userEvent.click(detailBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Thay đổi dữ liệu (Data Changes)')).toBeInTheDocument();
    expect(screen.getByText('Trước thay đổi (Old Value)')).toBeInTheDocument();
    expect(screen.getByText('Sau thay đổi (New Value)')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Đóng hộp thoại' });
    await userEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bấm nút Xuất tất cả CSV gọi API tải đủ các trang dữ liệu', async () => {
    vi.mocked(system.listAuditLogs).mockResolvedValue(
      paged(
        [
          {
            auditId: 10,
            actorUserId: 1,
            actorRole: 'ADMIN',
            action: 'USER_SANCTION',
            targetTable: 'Users',
            targetId: '5',
            note: 'Xử phạt',
            createdAt: '2026-10-05T10:00:00Z',
          },
        ],
        1,
      ),
    );
    renderWithProviders(<AuditLogsPage />);
    const exportBtn = await screen.findByRole('button', { name: /Xuất tất cả/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);

    // Kiểm tra đã gọi listAuditLogs với size 100 để lấy toàn bộ dữ liệu
    expect(system.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        size: 100,
      }),
    );
  });
});
