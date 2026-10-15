/** Thuật ngữ vai trò chuẩn (D115). `GUEST` chỉ là claim của Anonymous JWT, không lưu DB; VIP = role VIP + claim `isVip` (D104). */
export const ROLES = { GUEST: 'GUEST', MEMBER: 'MEMBER', VIP: 'VIP', ADMIN: 'ADMIN' } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABEL: Record<Role, string> = {
  GUEST: 'Khách',
  MEMBER: 'Thành viên',
  VIP: 'VIP',
  ADMIN: 'Quản trị viên',
};
