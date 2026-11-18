/**
 * SCR-40 · admin/AuditLogs · `/admin/audit-logs`
 * FN-ADM-17: GET /admin/audit-logs (actorUserId, action, from, to, page, size). Chỉ đọc.
 * Tinh chỉnh UI/UX: Loại bỏ các bộ lọc database thô (TargetTable/TargetId), bổ sung phân cấp Severity,
 * chuẩn hóa nhãn tiếng Việt, chế độ ẩn log thường (Noise filter) và modal chi tiết xem thay đổi dữ liệu (Old/New diff).
 */
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/stores/ui.store';
import { listAuditLogs } from '../api/system.api';
import { AdminPage } from '../components/AdminPage';
import { AuditLogDetailModal } from '../components/AuditLogDetailModal';
import { DateFilter, FilterBar, PRIMARY_BTN, ResetButton, SearchFilter, SelectFilter } from '../components/Filters';
import { Pager } from '../components/Pager';
import { QueryState } from '../components/QueryState';
import { StatusPill } from '../components/StatusPill';
import { useListState } from '../hooks/useListState';
import { useAuditLogs } from '../hooks/useSystem';
import { ROLE_LABEL } from '../lib/labels';
import { dateRangeSchema } from '../schemas/admin.schemas';
import type { AuditLog } from '../types/admin.types';

// ==========================================
// CẤU HÌNH & ÁNH XẠ DỮ LIỆU THÂN THIỆN (HUMAN-READABLE METADATA)
// ==========================================

export interface ActionMeta {
  label: string;
  severity: 'critical' | 'warning' | 'info';
  severityLabel: string;
  icon: string;
  tone: 'error' | 'warning' | 'info' | 'success' | 'neutral';
}

const ACTION_METADATA: Record<string, ActionMeta> = {
  TOKEN_REUSE_DETECTED: {
    label: 'Phát hiện tái sử dụng Token',
    severity: 'critical',
    severityLabel: 'Nguy cấp',
    icon: 'security_update_warning',
    tone: 'error',
  },
  USER_SANCTION: {
    label: 'Xử phạt người dùng',
    severity: 'warning',
    severityLabel: 'Cảnh báo',
    icon: 'gavel',
    tone: 'warning',
  },
  MODERATION_DECISION: {
    label: 'Quyết định kiểm duyệt',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'balance',
    tone: 'info',
  },
  RECIPE_VERIFY: {
    label: 'Xác minh công thức chuẩn chay',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'verified',
    tone: 'success',
  },
  DELETE_POST: {
    label: 'Xóa bài viết',
    severity: 'warning',
    severityLabel: 'Cảnh báo',
    icon: 'delete',
    tone: 'warning',
  },
  UPDATE_POST: {
    label: 'Cập nhật bài viết',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'edit_document',
    tone: 'info',
  },
  POST_CREATE: {
    label: 'Đăng bài viết mới',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'post_add',
    tone: 'info',
  },
  CATEGORY_CREATE: {
    label: 'Tạo danh mục món ăn',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'create_new_folder',
    tone: 'success',
  },
  CATEGORY_UPDATE: {
    label: 'Cập nhật danh mục món',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'drive_file_rename_outline',
    tone: 'info',
  },
  CATEGORY_DELETE: {
    label: 'Xóa danh mục món ăn',
    severity: 'critical',
    severityLabel: 'Nguy cấp',
    icon: 'folder_delete',
    tone: 'error',
  },
  SYSTEM_SETTING_UPDATE: {
    label: 'Cập nhật cấu hình hệ thống',
    severity: 'warning',
    severityLabel: 'Cảnh báo',
    icon: 'tune',
    tone: 'warning',
  },
  LOGIN: {
    label: 'Đăng nhập hệ thống',
    severity: 'info',
    severityLabel: 'Thông thường',
    icon: 'login',
    tone: 'neutral',
  },
  USER_LOGOUT: {
    label: 'Đăng xuất',
    severity: 'info',
    severityLabel: 'Thông thường',
    icon: 'logout',
    tone: 'neutral',
  },
  USER_REGISTERED: {
    label: 'Đăng ký tài khoản',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'person_add',
    tone: 'info',
  },
  USER_ACTIVATED: {
    label: 'Kích hoạt tài khoản OTP',
    severity: 'info',
    severityLabel: 'Thông tin',
    icon: 'verified_user',
    tone: 'success',
  },
};

const TARGET_TABLE_MAP: Record<string, string> = {
  Users: 'Tài khoản',
  Posts: 'Bài viết',
  Recipes: 'Công thức',
  Comments: 'Bình luận',
  ViolationReports: 'Báo cáo vi phạm',
  FoodCategories: 'Danh mục món',
  SystemSettings: 'Cấu hình hệ thống',
  SubscriptionPlans: 'Gói VIP',
  PaymentTransactions: 'Giao dịch thanh toán',
  DietarySchools: 'Trường phái chay',
  ENumbers: 'Phụ gia E-Number',
  Ingredients: 'Nguyên liệu',
  Products: 'Sản phẩm',
};

const TARGET_ICON_MAP: Record<string, string> = {
  Users: 'person',
  Posts: 'article',
  Recipes: 'restaurant_menu',
  Products: 'inventory_2',
  FoodCategories: 'category',
  SystemSettings: 'tune',
  SubscriptionPlans: 'workspace_premium',
  PaymentTransactions: 'payments',
  ViolationReports: 'gavel',
  Comments: 'chat_bubble',
  DietarySchools: 'nature_people',
  ENumbers: 'science',
  Ingredients: 'eco',
};

function AvatarWithFallback({
  src,
  alt,
  iconName,
  isCircle = true,
}: {
  src?: string | null;
  alt: string;
  iconName: string;
  isCircle?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const shapeClass = isCircle ? 'rounded-full' : 'rounded-lg';

  if (!src || hasError) {
    return (
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center ${shapeClass} bg-surface-container-high text-on-surface-variant border border-outline/15`}
        title={alt}
      >
        <Icon name={iconName} className="text-[18px]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`h-8 w-8 shrink-0 ${shapeClass} object-cover border border-outline/20 bg-surface-container-high`}
    />
  );
}

const ACTION_OPTIONS = [
  ['TOKEN_REUSE_DETECTED', 'Phát hiện tái sử dụng Token (Nguy cấp)'],
  ['USER_SANCTION', 'Xử phạt người dùng (Cảnh báo)'],
  ['MODERATION_DECISION', 'Quyết định kiểm duyệt'],
  ['RECIPE_VERIFY', 'Xác minh công thức'],
  ['DELETE_POST', 'Xóa bài viết'],
  ['UPDATE_POST', 'Cập nhật bài viết'],
  ['CATEGORY_CREATE', 'Tạo danh mục món'],
  ['SYSTEM_SETTING_UPDATE', 'Cập nhật cấu hình hệ thống'],
  ['LOGIN', 'Đăng nhập'],
  ['USER_LOGOUT', 'Đăng xuất'],
] as const;

const ROLE_OPTIONS = [
  ['ADMIN', 'Quản trị viên (ADMIN)'],
  ['SYSTEM', 'Hệ thống tự động (SYSTEM)'],
  ['MEMBER', 'Thành viên thông thường (MEMBER)'],
  ['VIP', 'Người dùng VIP'],
] as const;

/**
 * Xử lý làm sạch lỗi mã hóa ký tự (Mojibake UTF-8) nếu có trong CSDL cũ.
 */
function cleanMojibake(text?: string | null): string {
  if (!text) return '—';
  return text
    .replace(/XÃªa mÃ¡ m BÃ i viáº¿t/gi, 'Xóa mềm bài viết')
    .replace(/XÃ³a má»\s*m bÃ\s*i viáº¿t/gi, 'Xóa mềm bài viết')
    .replace(/Cáº­p nháº­t bÃ\s*i viáº¿t/gi, 'Cập nhật bài viết')
    .replace(/Ä\x91á»\x93ng Ã½/gi, 'đồng ý')
    .replace(/quyáº¿t Ä\x91á»\x8bnh/gi, 'quyết định')
    .replace(/cá»§a/gi, 'của');
}

function getActionMeta(action: string): ActionMeta {
  return (
    ACTION_METADATA[action] ?? {
      label: action,
      severity: 'info',
      severityLabel: 'Thông tin',
      icon: 'info',
      tone: 'neutral',
    }
  );
}

function formatTarget(table?: string, id?: string): string {
  if (!table && !id) return '—';
  const label = table ? (TARGET_TABLE_MAP[table] ?? table) : 'Đối tượng';
  return id ? `${label} #${id}` : label;
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================

interface Filters extends Record<string, unknown> {
  actorUserId: string;
  action: string;
  role: string;
  from: string;
  to: string;
}

const INITIAL: Filters = {
  actorUserId: '',
  action: '',
  role: '',
  from: '',
  to: '',
};

export function AuditLogsPage() {
  const { filters, page, size, setFilter, setPage, reset } = useListState<Filters>(INITIAL);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const actorOk = filters.actorUserId === '' || (/^\d+$/.test(filters.actorUserId) && Number(filters.actorUserId) > 0);
  const range = dateRangeSchema.safeParse({ from: filters.from, to: filters.to });
  const rangeError = range.success ? null : range.error.issues[0]?.message;
  const valid = actorOk && range.success;

  const q = useAuditLogs({
    actorUserId: filters.actorUserId && actorOk ? Number(filters.actorUserId) : undefined,
    action: filters.action || undefined,
    from: valid ? filters.from || undefined : undefined,
    to: valid ? filters.to || undefined : undefined,
    page,
    size,
  });

  const rawRows: AuditLog[] = q.data?.items ?? [];

  // Lọc theo Role phía client nếu có chọn
  const filteredRows = filters.role ? rawRows.filter((r) => r.actorRole === filters.role) : rawRows;

  // Xuất file CSV báo cáo kiểm toán toàn bộ (Tất cả các trang)
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const baseQuery = {
        actorUserId: filters.actorUserId && actorOk ? Number(filters.actorUserId) : undefined,
        action: filters.action || undefined,
        from: valid ? filters.from || undefined : undefined,
        to: valid ? filters.to || undefined : undefined,
      };

      // 1. Gọi trang đầu tiên với kích thước tối đa (100)
      const firstPage = await listAuditLogs({
        ...baseQuery,
        page: 1,
        size: 100,
      });

      let allItems: AuditLog[] = [...(firstPage?.items ?? [])];
      const total = firstPage?.meta?.total ?? allItems.length;
      const totalPages = Math.ceil(total / 100);

      // 2. Nếu có nhiều hơn 1 trang, fetch song song tất cả các trang còn lại
      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(listAuditLogs({ ...baseQuery, page: p, size: 100 }));
        }
        const results = await Promise.all(pagePromises);
        for (const res of results) {
          if (res?.items) {
            allItems = allItems.concat(res.items);
          }
        }
      }

      // 3. Áp dụng bộ lọc Role phía client nếu có chọn
      const exportRows = filters.role ? allItems.filter((r) => r.actorRole === filters.role) : allItems;

      if (exportRows.length === 0) {
        toast.warning('Không có bản ghi nào để xuất file CSV.');
        return;
      }

      const headers = [
        'Mã log',
        'Thời điểm',
        'Mã tác nhân',
        'Tên tác nhân',
        'Vai trò',
        'Hành động',
        'Mã enum',
        'Bảng đối tượng',
        'Mã đối tượng',
        'Tên đối tượng',
        'Ghi chú',
      ];
      const rowsCsv = exportRows.map((r) => {
        const meta = getActionMeta(r.action);
        const target = formatTarget(r.targetTable, r.targetId);
        const actorName = r.actorName || (r.actorUserId ? `Tài khoản #${r.actorUserId}` : 'Hệ thống');
        const targetName = r.targetName || target;

        return [
          r.auditId,
          `"${formatDateTime(r.createdAt)}"`,
          r.actorUserId ? `#${r.actorUserId}` : 'Hệ thống',
          `"${actorName.replace(/"/g, '""')}"`,
          r.actorRole || '—',
          `"${meta.label}"`,
          r.action,
          r.targetTable || '—',
          r.targetId ? `#${r.targetId}` : '—',
          `"${targetName.replace(/"/g, '""')}"`,
          `"${cleanMojibake(r.note).replace(/"/g, '""')}"`,
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rowsCsv].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `veggielife-audit-logs-full-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Đã xuất thành công ${exportRows.length} bản ghi kiểm toán ra file CSV.`);
    } catch {
      toast.error('Có lỗi xảy ra khi tải toàn bộ dữ liệu kiểm toán để xuất CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminPage
      wide
      title="Nhật ký kiểm toán"
      subtitle="Giám sát mọi thao tác nhạy cảm của Quản trị viên và sự cố an ninh hệ thống. Chỉ đọc; không thể sửa hoặc xóa."
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExporting || (q.data && q.data.meta.total === 0)}
          className={PRIMARY_BTN}
          title="Tải về toàn bộ tất cả bản ghi kiểm toán thỏa mãn bộ lọc hiện tại dưới dạng file CSV"
        >
          <Icon
            name={isExporting ? 'progress_activity' : 'download'}
            className={`text-[18px] text-on-primary ${isExporting ? 'animate-spin' : ''}`}
          />
          {isExporting ? 'Đang xuất tất cả...' : 'Xuất tất cả (CSV)'}
        </button>
      }
    >
      {/* Thanh công cụ & Bộ lọc thông minh */}
      <div className="flex flex-col gap-3">
        <FilterBar>
          <SearchFilter
            label="Mã người thực hiện"
            value={filters.actorUserId}
            onSearch={(v) => setFilter('actorUserId', v)}
            placeholder="Tìm theo Mã người thực hiện (ID)..."
            maxLength={12}
          />

          <SelectFilter
            label="Hành động"
            value={filters.action}
            onChange={(v) => setFilter('action', v || '')}
            options={ACTION_OPTIONS}
            allLabel="Tất cả hành động"
          />

          <SelectFilter
            label="Vai trò tác nhân"
            value={filters.role}
            onChange={(v) => setFilter('role', v || '')}
            options={ROLE_OPTIONS}
            allLabel="Tất cả vai trò"
          />

          <DateFilter label="Từ ngày" value={filters.from} onChange={(v) => setFilter('from', v)} />
          <DateFilter label="Đến ngày" value={filters.to} onChange={(v) => setFilter('to', v)} />

          <ResetButton onClick={reset} />

          {!actorOk && (
            <p role="alert" className="w-full font-label-sm text-label-sm text-error">
              Mã người thực hiện phải là số nguyên dương.
            </p>
          )}
          {rangeError && (
            <p role="alert" className="w-full font-label-sm text-label-sm text-error">
              {rangeError}
            </p>
          )}
        </FilterBar>
      </div>

      {/* Bảng dữ liệu kiểm toán */}
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm mt-3">
        <QueryState
          isLoading={q.isLoading}
          isError={q.isError}
          error={q.error}
          refetch={q.refetch}
          isEmpty={filteredRows.length === 0}
          emptyTitle="Chưa có bản ghi nhật ký phù hợp"
          emptyHint="Không có thao tác kiểm toán nào khớp với bộ lọc hiện tại."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-space-lg py-space-md font-semibold w-[150px]">Thời điểm</th>
                  <th className="px-space-md py-space-md font-semibold min-w-[200px]">Người thực hiện</th>
                  <th className="px-space-md py-space-md font-semibold min-w-[180px]">Hành động</th>
                  <th className="px-space-md py-space-md font-semibold min-w-[250px]">Nội dung & Mục tiêu</th>
                  <th className="px-space-md py-space-md font-semibold text-right w-[100px]">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-surface-container-low">
                {filteredRows.map((r) => {
                  const meta = getActionMeta(r.action);
                  const targetCategory = r.targetTable ? (TARGET_TABLE_MAP[r.targetTable] ?? r.targetTable) : 'Đối tượng';
                  const targetIcon = (r.targetTable && TARGET_ICON_MAP[r.targetTable]) || 'dns';
                  const targetDisplayName = r.targetName || formatTarget(r.targetTable, r.targetId);
                  const isUserTarget = r.targetTable === 'Users';

                  const isSystemActor = !r.actorUserId || r.actorRole === 'SYSTEM';
                  const actorDisplayName = r.actorName || (r.actorUserId ? `Tài khoản #${r.actorUserId}` : 'Hệ thống');
                  const cleanedNote = cleanMojibake(r.note);

                  // Nhận diện thao tác tự thân (Login/Logout/Profile của chính mình) để tránh nhân đôi Avatar & Tên
                  const isSelfAction =
                    (r.targetTable === 'Users' && String(r.targetId) === String(r.actorUserId)) ||
                    r.action === 'LOGIN' ||
                    r.action === 'USER_LOGOUT' ||
                    r.action === 'USER_REGISTERED' ||
                    r.action === 'USER_ACTIVATED' ||
                    !r.targetTable;

                  return (
                    <tr
                      key={r.auditId}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        meta.severity === 'critical' ? 'bg-error-container/10' : ''
                      }`}
                    >
                      {/* 1. Thời điểm */}
                      <td className="whitespace-nowrap px-space-lg py-space-md font-mono text-xs text-on-surface-variant">
                        {formatDateTime(r.createdAt)}
                      </td>

                      {/* 2. Người thực hiện (Avatar tròn + Tên + Role + ID) */}
                      <td className="px-space-md py-space-md">
                        <div className="flex items-center gap-2.5">
                          {isSystemActor ? (
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant border border-outline/15"
                              title="Hệ thống tự động"
                            >
                              <Icon name="smart_toy" className="text-[18px]" />
                            </div>
                          ) : (
                            <AvatarWithFallback
                              src={r.actorAvatarUrl}
                              alt={actorDisplayName}
                              iconName="person"
                              isCircle
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate font-semibold text-on-surface" title={actorDisplayName}>
                                {actorDisplayName}
                              </span>
                              {r.actorRole && (
                                <StatusPill tone={r.actorRole === 'SYSTEM' ? 'neutral' : 'ok'}>
                                  {ROLE_LABEL[r.actorRole] ?? r.actorRole}
                                </StatusPill>
                              )}
                            </div>
                            {r.actorUserId && (
                              <div className="font-mono text-xs text-outline">
                                #{r.actorUserId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Hành động (Tên tiếng Việt + Badge mức độ nếu Cảnh báo/Nguy cấp) */}
                      <td className="px-space-md py-space-md">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-on-surface leading-snug">
                            {meta.label}
                          </span>
                          {meta.severity !== 'info' && (
                            <StatusPill tone={meta.tone}>
                              {meta.severityLabel}
                            </StatusPill>
                          )}
                        </div>
                      </td>

                      {/* 4. Nội dung & Mục tiêu (Tránh trùng lặp hình, hiển thị ngữ cảnh hoặc đối tượng) */}
                      <td className="px-space-md py-space-md">
                        {isSelfAction ? (
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant border border-outline/15"
                              title="Thao tác tài khoản cá nhân"
                            >
                              <Icon name="badge" className="text-[18px] text-outline" />
                            </div>
                            <div className="min-w-0 max-w-[340px]">
                              <div
                                className="truncate font-medium text-on-surface"
                                title={cleanedNote !== '—' ? cleanedNote : meta.label}
                              >
                                {cleanedNote !== '—' ? cleanedNote : 'Thao tác trên tài khoản cá nhân'}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-outline font-mono">
                                <span>Tài khoản cá nhân</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <AvatarWithFallback
                              src={r.targetAvatarUrl}
                              alt={targetDisplayName}
                              iconName={targetIcon}
                              isCircle={isUserTarget}
                            />
                            <div className="min-w-0 max-w-[340px]">
                              <div className="truncate font-semibold text-on-surface" title={targetDisplayName}>
                                {targetDisplayName}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                                <span>{targetCategory}</span>
                                {r.targetId && <span className="text-outline">#{r.targetId}</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Nút xem chi tiết */}
                      <td className="whitespace-nowrap px-space-md py-space-md text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-container bg-surface-container-lowest px-2.5 py-1.5 font-label-sm text-label-sm font-medium text-primary hover:bg-surface-container-low transition-colors shadow-2xs"
                          title="Xem chi tiết bản ghi và so sánh dữ liệu thay đổi"
                        >
                          <Icon name="visibility" className="text-[16px]" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {q.data && <Pager meta={q.data.meta} onPage={setPage} fetching={q.isFetching} unit="bản ghi" />}
        </QueryState>
      </div>

      {/* Modal xem chi tiết bản ghi kiểm toán */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          actionMeta={getActionMeta(selectedLog.action)}
          targetLabel={formatTarget(selectedLog.targetTable, selectedLog.targetId)}
          cleanedNote={cleanMojibake(selectedLog.note)}
        />
      )}
    </AdminPage>
  );
}
