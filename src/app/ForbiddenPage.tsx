import React from 'react';
import { StatusPage } from '@/app/NotFoundPage';

/**
 * Trạng thái 403: đã đăng nhập nhưng vai trò không đủ quyền (ví dụ Thành viên mở /admin).
 * Hiện tại chỗ thay vì chuyển hướng im lặng, để người dùng biết vì sao không vào được.
 */
export const ForbiddenPage: React.FC = () => (
  <StatusPage
    icon="lock"
    code="LỖI 403"
    title="Bạn không có quyền truy cập"
    description="Trang này chỉ dành cho Quản trị viên. Nếu cần quyền truy cập, hãy liên hệ quản trị viên hệ thống."
  />
);
