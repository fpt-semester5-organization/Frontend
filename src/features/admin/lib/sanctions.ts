import { formatDateTime } from '@/lib/format';
import type { AccountStatus, SanctionAction, UserRole } from '../types/admin.types';
import { ACCOUNT_STATUS } from './labels';

// Xem trước hậu quả của mức phạt (SCR-39) — mô tả đúng việc Backend làm trong AdminUserService.UpdateUserStatusAsync
// (develop 45999c2), để Admin biết chính xác điều gì xảy ra trước khi bấm xác nhận.

export const SANCTION_ACTIONS: SanctionAction[] = ['WARN', 'RESTRICT_COMMENT', 'SUSPEND', 'BAN', 'REACTIVATE'];

export const SANCTION_LABEL: Record<SanctionAction, string> = {
  WARN: 'Cảnh cáo',
  RESTRICT_COMMENT: 'Hạn chế bình luận',
  SUSPEND: 'Tạm khóa tài khoản',
  BAN: 'Cấm vĩnh viễn',
  REACTIVATE: 'Mở lại tài khoản',
};

/** Mức cần nhập số ngày (Backend bắt buộc durationDays > 0). */
export const needsDuration = (action: SanctionAction) => action === 'SUSPEND' || action === 'RESTRICT_COMMENT';

/** Mức nặng cần hộp xác nhận nút đỏ. */
export const isSevere = (action: SanctionAction) => action === 'SUSPEND' || action === 'BAN' || action === 'RESTRICT_COMMENT';

export interface SanctionTarget {
  userId: number;
  email?: string;
  role?: UserRole;
  accountStatus: AccountStatus;
  countViolationReports?: number;
}

export interface Recommendation {
  action: SanctionAction;
  durationDays?: number;
  /** Bậc trong thang BR-ADM-USR-002 để Admin đối chiếu. */
  rule: string;
}

/**
 * Thang lũy tiến BR-ADM-USR-002 theo số vi phạm đã xác nhận (Users.Count_ViolationReports):
 * 1–3 cảnh cáo; 4–6 tạm khóa 03 ngày; 7–9 tạm khóa 10 ngày; 10–12 tạm khóa 30 ngày; từ 13 cấm vĩnh viễn.
 * Chưa có vi phạm nào thì không đề xuất.
 */
export function recommendSanction(violations: number | undefined): Recommendation | null {
  const count = violations ?? 0;
  if (count <= 0) return null;
  if (count <= 3) return { action: 'WARN', rule: 'Vi phạm lần 1–3: cảnh cáo' };
  if (count <= 6) return { action: 'SUSPEND', durationDays: 3, rule: 'Vi phạm lần 4–6: tạm khóa 03 ngày' };
  if (count <= 9) return { action: 'SUSPEND', durationDays: 10, rule: 'Vi phạm lần 7–9: tạm khóa 10 ngày' };
  if (count <= 12) return { action: 'SUSPEND', durationDays: 30, rule: 'Vi phạm lần 10–12: tạm khóa 30 ngày' };
  return { action: 'BAN', rule: 'Từ lần vi phạm thứ 13: cấm vĩnh viễn' };
}

/** Số ngày mặc định khi chọn mức: theo thang kỷ luật; hạn chế bình luận 07 ngày (BR-ADM-SOC-001). */
export function defaultDuration(action: SanctionAction, violations: number | undefined): number | undefined {
  if (action === 'RESTRICT_COMMENT') return 7;
  if (action !== 'SUSPEND') return undefined;
  return recommendSanction(violations)?.durationDays ?? 3;
}

/**
 * Lý do không được chọn một mức với tài khoản này; `null` là chọn được.
 * Trùng các luật Backend trả 409 (ERR_ADM_INVALID_TRANSITION), thêm BR-ADM-USR-001 (không tự xử phạt) và
 * BR-ADM-USR-003 (tài khoản đã ẩn danh không khôi phục được).
 */
export function blockedReason(action: SanctionAction, target: SanctionTarget, currentUserId?: number): string | null {
  if (target.accountStatus === 'ANONYMIZED_DELETED')
    return 'Tài khoản đã bị xóa và ẩn danh hóa vĩnh viễn, không thể xử phạt hay khôi phục.';
  if (action === 'REACTIVATE') return target.accountStatus === 'ACTIVE' ? 'Tài khoản đang hoạt động, không cần mở lại.' : null;
  if (currentUserId !== undefined && target.userId === currentUserId)
    return 'Quản trị viên không được tự xử phạt tài khoản của chính mình.';
  if (action === 'BAN' && target.accountStatus === 'BANNED') return 'Tài khoản đã bị cấm vĩnh viễn từ trước.';
  return null;
}

export interface Consequences {
  nextStatus: AccountStatus;
  /** Hạn khóa mới; `null` là không có hạn (không khóa hoặc khóa vĩnh viễn). */
  lockedUntil: Date | null;
  effects: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Những gì sẽ xảy ra với tài khoản khi Admin xác nhận mức phạt (đúng hành vi Backend). */
export function sanctionConsequences(
  action: SanctionAction,
  target: SanctionTarget,
  durationDays: number | undefined,
  now: Date = new Date()
): Consequences {
  const email = target.email ? ` tới ${target.email}` : '';
  const audit = 'Ghi nhật ký kiểm toán (USER_SANCTION) kèm lý do.';
  const until = (days: number) => new Date(now.getTime() + days * DAY_MS);
  const days = durationDays && durationDays > 0 ? durationDays : undefined;

  switch (action) {
    case 'WARN': {
      const nextStatus = target.accountStatus === 'PENDING_ACTIVATION' ? 'ACTIVE' : target.accountStatus;
      return {
        nextStatus,
        lockedUntil: null,
        effects: [
          `Gửi email cảnh cáo vi phạm tiêu chuẩn cộng đồng${email}.`,
          nextStatus === target.accountStatus
            ? 'Tài khoản vẫn dùng bình thường, không bị khóa.'
            : 'Tài khoản chưa kích hoạt sẽ được chuyển sang Hoạt động.',
          audit,
        ],
      };
    }
    case 'RESTRICT_COMMENT': {
      const lockedUntil = days ? until(days) : null;
      return {
        nextStatus: 'QUARANTINED',
        lockedUntil,
        effects: [
          lockedUntil ? `Hạn chế tới ${formatDateTime(lockedUntil)} (${days} ngày).` : 'Cần nhập số ngày hạn chế.',
          'Đăng xuất khỏi mọi thiết bị ngay.',
          'Lưu ý: hệ thống hiện chặn đăng nhập khi tài khoản ở trạng thái này, không chỉ chặn bình luận.',
          'Hết hạn, tài khoản chưa tự mở lại: cần chọn "Mở lại tài khoản".',
          `Gửi email thông báo${email}.`,
          audit,
        ],
      };
    }
    case 'SUSPEND': {
      const lockedUntil = days ? until(days) : null;
      return {
        nextStatus: 'SUSPENDED',
        lockedUntil,
        effects: [
          lockedUntil ? `Tạm khóa tới ${formatDateTime(lockedUntil)} (${days} ngày).` : 'Cần nhập số ngày tạm khóa.',
          'Đăng xuất khỏi mọi thiết bị và không đăng nhập được.',
          'Hết hạn, tài khoản chưa tự mở lại: cần chọn "Mở lại tài khoản".',
          `Gửi email thông báo tạm khóa${email}.`,
          audit,
        ],
      };
    }
    case 'BAN':
      return {
        nextStatus: 'BANNED',
        lockedUntil: null,
        effects: [
          'Cấm vĩnh viễn: đăng xuất khỏi mọi thiết bị và không bao giờ đăng nhập lại được.',
          'Chỉ gỡ được bằng thao tác "Mở lại tài khoản".',
          `Gửi email thông báo đình chỉ${email}.`,
          audit,
        ],
      };
    case 'REACTIVATE':
      return {
        nextStatus: 'ACTIVE',
        lockedUntil: null,
        effects: [
          'Tài khoản hoạt động lại ngay, xóa hạn khóa và số lần đăng nhập sai.',
          `Gửi email thông báo khôi phục${email}.`,
          audit,
        ],
      };
  }
}

export const statusTransitionText = (from: AccountStatus, to: AccountStatus) =>
  from === to ? `${ACCOUNT_STATUS[from].label} (giữ nguyên)` : `${ACCOUNT_STATUS[from].label} → ${ACCOUNT_STATUS[to].label}`;
