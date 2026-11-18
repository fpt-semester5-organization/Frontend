import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import * as system from '../api/system.api';
import { AuditLogsPage } from '../pages/AuditLogsPage';

function paged<T>(items: T[], total: number) {
  return { items, meta: { page: 1, size: 20, total } };
}

describe('AuditLogsPage Redesign (SCR-40 · 5-column refined layout)', () => {
  it('hiển thị đầy đủ Avatar, Tên người thực hiện, Tên đối tượng và cấu trúc 5 cột', async () => {
    vi.spyOn(system, 'listAuditLogs').mockResolvedValue(
      paged(
        [
          {
            auditId: 101,
            actorUserId: 1,
            actorName: 'Nguyễn Văn Quản Trị',
            actorAvatarUrl: 'https://cdn.veggielife.vn/avatars/admin.png',
            actorRole: 'ADMIN',
            action: 'LOGIN',
            targetTable: 'Users',
            targetId: '1',
            targetName: 'Nguyễn Văn Quản Trị',
            targetAvatarUrl: 'https://cdn.veggielife.vn/avatars/admin.png',
            note: 'Đăng nhập từ IP 192.168.1.1',
            createdAt: '2026-11-18T14:15:00Z',
          },
          {
            auditId: 102,
            actorUserId: 100000,
            actorName: 'Trần Thị VIP',
            actorAvatarUrl: null,
            actorRole: 'VIP',
            action: 'USER_SANCTION',
            targetTable: 'Posts',
            targetId: '303',
            targetName: 'Cách nấu lẩu nấm chay thanh ngọt',
            targetAvatarUrl: 'https://cdn.veggielife.vn/posts/launam.jpg',
            note: 'Xử phạt bài viết có dấu hiệu quảng cáo sai lệch',
            createdAt: '2026-11-18T14:13:00Z',
          },
          {
            auditId: 103,
            actorUserId: null,
            actorName: null,
            actorRole: 'SYSTEM',
            action: 'SYSTEM_SETTING_UPDATE',
            targetTable: 'SystemSettings',
            targetId: 'BARCODE_SCAN_LIMIT_DAILY_GUEST',
            targetName: 'Hạn mức quét mã vạch khách vãng lai',
            targetAvatarUrl: null,
            note: 'Đồng bộ cấu hình từ hệ thống tự động',
            createdAt: '2026-11-18T14:10:00Z',
          },
        ],
        3,
      ),
    );

    renderWithProviders(<AuditLogsPage />);

    // 1. Kiểm tra 5 tiêu đề cột
    expect(await screen.findByRole('columnheader', { name: 'Thời điểm' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Người thực hiện' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hành động' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nội dung & Mục tiêu' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Chi tiết' })).toBeInTheDocument();

    // Cột "Mức độ" riêng biệt và "Ghi chú" không còn trong thead
    expect(screen.queryByRole('columnheader', { name: 'Mức độ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Ghi chú' })).not.toBeInTheDocument();

    // 2. Kiểm tra Người thực hiện hiển thị tên (không bị nhân đôi avatar/tên khi là self-action)
    expect(screen.getByText('Nguyễn Văn Quản Trị')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị VIP')).toBeInTheDocument();
    expect(screen.getByText('Hệ thống')).toBeInTheDocument();

    // 3. Kiểm tra cột "Nội dung & Mục tiêu"
    // Khi thao tác tự thân (Login): hiển thị ngữ cảnh thao tác, không lặp avatar
    expect(screen.getByText('Đăng nhập từ IP 192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản cá nhân')).toBeInTheDocument();

    // Khi tác động lên đối tượng khác: hiển thị tên bài viết / cấu hình
    expect(screen.getByText('Cách nấu lẩu nấm chay thanh ngọt')).toBeInTheDocument();
    expect(screen.getByText('Hạn mức quét mã vạch khách vãng lai')).toBeInTheDocument();
    expect(screen.getByText('Bài viết')).toBeInTheDocument();
    expect(screen.getByText('Cấu hình hệ thống')).toBeInTheDocument();

    // 4. Kiểm tra huy hiệu mức độ gộp vào cột Hành động khi là Cảnh báo
    expect(screen.getByText('Xử phạt người dùng')).toBeInTheDocument();
    expect(screen.getAllByText('Cảnh báo').length).toBe(2);
  });

  it('bấm nút Chi tiết mở modal hiển thị đầy đủ avatar, tên đối tượng và ghi chú', async () => {
    const user = userEvent.setup();
    vi.spyOn(system, 'listAuditLogs').mockResolvedValue(
      paged(
        [
          {
            auditId: 999,
            actorUserId: 10001,
            actorName: 'Lê Quản Trị Viên',
            actorRole: 'ADMIN',
            action: 'DELETE_POST',
            targetTable: 'Posts',
            targetId: '500',
            targetName: 'Bài viết vi phạm quy chuẩn cộng đồng',
            targetAvatarUrl: 'https://cdn.veggielife.vn/posts/500.jpg',
            note: 'Đã xóa bài viết do chứa từ ngữ công kích thành viên khác.',
            createdAt: '2026-11-18T14:00:00Z',
          },
        ],
        1,
      ),
    );

    renderWithProviders(<AuditLogsPage />);

    expect(await screen.findByText('Lê Quản Trị Viên')).toBeInTheDocument();

    const detailBtn = screen.getByRole('button', { name: /Chi tiết/i });
    await user.click(detailBtn);

    // Modal xuất hiện
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Modal hiển thị tên đối tượng và ghi chú đầy đủ
    expect(screen.getByText('Đã xóa bài viết do chứa từ ngữ công kích thành viên khác.')).toBeInTheDocument();
    expect(screen.getAllByText('Bài viết vi phạm quy chuẩn cộng đồng').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Mã kỹ thuật (Action Enum):')).toBeInTheDocument();
  });
});
