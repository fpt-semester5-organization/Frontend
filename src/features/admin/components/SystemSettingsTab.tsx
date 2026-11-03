import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { notifyError, notifySuccess } from '@/lib/notify';
import { AdminQueryError, CARD, CONTROL, TableSkeleton } from './AdminUi';
import { LegalPdfPreviewModal, type LegalDocumentPreview } from './LegalPdfPreviewModal';
import { uploadAdminNutritionDocument } from '../api/admin.api';
import { useAdminSettings, useResetSetting, useUpdateSetting } from '../hooks/useAdminSettings';
import { handleWriteError } from '../lib/writeError';
import type { SystemSetting } from '../types/admin.types';

interface SettingMeta {
  label: string;
  unit?: string;
  icon?: string;
  min?: number;
  max?: number;
  step?: number;
}

const SETTING_METAS: Record<string, SettingMeta> = {
  MEAL_SWAP_LIMIT_DRAFT: {
    label: 'Đổi món khi Dự thảo',
    unit: 'lần',
    icon: 'shuffle',
    min: 1,
    max: 100,
  },
  MEAL_SWAP_LIMIT_ACTIVE: {
    label: 'Đổi món khi Đang áp dụng',
    unit: 'lần',
    icon: 'change_circle',
    min: 1,
    max: 100,
  },
  MEAL_PLAN_WEEKLY_LIMIT_FREE: {
    label: 'Thực đơn tuần (Miễn phí)',
    unit: 'thực đơn',
    icon: 'date_range',
    min: 1,
    max: 10,
  },
  MEAL_PLAN_WEEKLY_LIMIT_VIP: {
    label: 'Thực đơn tuần (VIP)',
    unit: 'thực đơn',
    icon: 'workspace_premium',
    min: 1,
    max: 20,
  },
  MEAL_SWAP_CALORIE_TOLERANCE_PERCENT: {
    label: 'Sai số Calo khi đổi món',
    unit: '%',
    icon: 'percent',
    min: 0,
    max: 100,
  },
  CHAT_LIMIT_DAILY_GUEST: {
    label: 'Chatbot / ngày (Khách vãng lai)',
    unit: 'câu',
    icon: 'chat',
    min: 0,
    max: 50,
  },
  CHAT_LIMIT_DAILY_FREE: {
    label: 'Chatbot / ngày (Miễn phí)',
    unit: 'câu',
    icon: 'chat_bubble',
    min: 0,
    max: 200,
  },
  CHAT_LIMIT_DAILY_VIP: {
    label: 'Chatbot / ngày (VIP)',
    unit: 'câu',
    icon: 'forum',
    min: 10,
    max: 1000,
  },
  FRIDGE_SCAN_LIMIT_DAILY_FREE: {
    label: 'Quét tủ lạnh / ngày (Miễn phí)',
    unit: 'lần',
    icon: 'kitchen',
    min: 0,
    max: 50,
  },
  FRIDGE_SCAN_LIMIT_DAILY_VIP: {
    label: 'Quét tủ lạnh / ngày (VIP)',
    unit: 'lần',
    icon: 'camera_alt',
    min: 1,
    max: 200,
  },
  LLMOPS_DAILY_BUDGET_USD: {
    label: 'Ngân sách AI tối đa / ngày',
    unit: 'USD',
    icon: 'payments',
    min: 0.1,
    step: 0.5,
  },
  LLMOPS_ALERT_THRESHOLD_PERCENT: {
    label: 'Ngưỡng cảnh báo chi phí khẩn cấp',
    unit: '%',
    icon: 'warning',
    min: 1,
    max: 100,
  },
  COMMUNITY_REPORT_LIMIT: {
    label: 'Ngưỡng báo cáo tự động ẩn bài',
    unit: 'lượt',
    icon: 'flag',
    min: 1,
    max: 100,
  },
  LEGAL_USER_AGREEMENT_URL: {
    label: 'Thỏa thuận đăng ký người dùng',
    icon: 'description',
  },
  LEGAL_PRIVACY_POLICY_URL: {
    label: 'Chính sách bảo mật dữ liệu',
    icon: 'security',
  },
  LEGAL_TERMS_OF_SERVICE_URL: {
    label: 'Điều khoản dịch vụ & Quy chuẩn cộng đồng',
    icon: 'gavel',
  },
  LEGAL_VEGAN_DISCLAIMER_URL: {
    label: 'Quy chuẩn ăn chay & Miễn trừ y tế',
    icon: 'health_and_safety',
  },
};

interface SettingGroup {
  id: string;
  title: string;
  icon: string;
  note?: string;
  filter: (s: SystemSetting) => boolean;
}

const GROUPS: SettingGroup[] = [
  {
    id: 'MEAL_PLAN',
    title: 'Hạn mức Thực đơn & Đổi món',
    icon: 'restaurant_menu',
    filter: (s) => (s.category || (s as any).Category) === 'MEAL_PLAN',
  },
  {
    id: 'AI_QUOTA',
    title: 'Hạn mức AI Chatbot & Quét tủ lạnh',
    icon: 'smart_toy',
    filter: (s) => (s.category || (s as any).Category) === 'AI_QUOTA',
  },
  {
    id: 'LLMOPS',
    title: 'Vận hành AI & Ngân sách chi phí',
    icon: 'account_balance_wallet',
    filter: (s) => (s.category || (s as any).Category) === 'LLMOPS',
  },
  {
    id: 'COMMUNITY',
    title: 'Kiểm duyệt Cộng đồng & Báo cáo',
    icon: 'shield',
    filter: (s) => (s.category || (s as any).Category) === 'COMMUNITY',
  },
  {
    id: 'GENERAL',
    title: 'Tài liệu Pháp lý & Chính sách',
    icon: 'policy',
    filter: (s) => {
      const cat = s.category || (s as any).Category;
      const key = s.settingKey || (s as any).SettingKey;
      return cat === 'GENERAL' && key !== 'LEGAL_DOCUMENTS';
    },
  },
];

function getFileNameFromUrl(url: string): string {
  if (!url) return 'Chưa có tệp';
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last.split('?')[0]);
  } catch {
    return 'Tài liệu đính kèm';
  }
}

export const SystemSettingsTab: React.FC = () => {
  const { data: settings = [], isPending, isError, error, refetch, isRefetching } = useAdminSettings();
  const updateMutation = useUpdateSetting();
  const resetMutation = useResetSetting();

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [resettingKey, setResettingKey] = useState<SystemSetting | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<LegalDocumentPreview | null>(null);

  if (isPending) {
    return <TableSkeleton rows={4} label="Đang tải cấu hình hệ thống" />;
  }

  if (isError) {
    return <AdminQueryError error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  }

  const getKey = (s: SystemSetting) => s.settingKey || (s as any).SettingKey;
  const getValue = (s: SystemSetting) => s.settingValue || (s as any).SettingValue;
  const getDefault = (s: SystemSetting) => s.defaultValue || (s as any).DefaultValue;
  const getDataType = (s: SystemSetting) => s.dataType || (s as any).DataType;
  const getDesc = (s: SystemSetting) => s.description || (s as any).Description;

  const handleValueChange = (key: string, val: string) => {
    setEditingValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = (setting: SystemSetting) => {
    const key = getKey(setting);
    const originalVal = getValue(setting);
    const valueToSave = editingValues[key] !== undefined ? editingValues[key] : originalVal;
    if (valueToSave === originalVal) return;

    updateMutation.mutate(
      { key, body: { settingValue: valueToSave } },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || `Đã cập nhật chỉ số ${SETTING_METAS[key]?.label || key}.`);
          setEditingValues((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        },
        onError: (err) => handleWriteError(err),
      }
    );
  };

  const confirmReset = () => {
    if (!resettingKey) return;
    const target = resettingKey;
    const key = getKey(target);
    const def = getDefault(target);
    resetMutation.mutate(key, {
      onSuccess: (res) => {
        notifySuccess(res.message || `Đã khôi phục ${SETTING_METAS[key]?.label || key} về mặc định.`);
        setEditingValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setResettingKey(null);
      },
      onError: (err) => {
        handleWriteError(err);
        setResettingKey(null);
      },
    });
  };

  // Xử lý upload tệp PDF/Ảnh cho Chính sách và Điều khoản
  const handleUploadFile = async (setting: SystemSetting, file: File) => {
    const key = getKey(setting);
    const meta = SETTING_METAS[key];
    setIsUploadingFile(true);
    try {
      const res = await uploadAdminNutritionDocument({
        file,
        title: meta?.label || key,
        author: 'Ban Quản Trị VeggieLife',
      });
      const newUrl = res.fileUrl || (res as any).url;
      if (!newUrl) {
        throw new Error('Máy chủ không trả về đường dẫn tệp sau khi tải lên.');
      }

      await updateMutation.mutateAsync({
        key,
        body: { settingValue: newUrl },
      });

      notifySuccess(`Đã tải lên tệp mới cho ${meta?.label || key}.`);
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      notifyError('Không thể tải tệp lên máy chủ. Vui lòng thử lại hoặc dán đường dẫn trực tiếp.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-space-md">
      <div className="flex items-center justify-end gap-space-sm pb-1">
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefetching} title="Làm mới toàn bộ chỉ số">
          <Icon name="refresh" className={cn('text-[18px]', isRefetching && 'animate-spin')} />
          Làm mới
        </Button>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-space-md lg:grid-cols-2">
        {GROUPS.map((group) => {
          const groupSettings = settings.filter(group.filter);
          if (groupSettings.length === 0) return null;

          const isLegalGroup = group.id === 'GENERAL';

          return (
            <div
              key={group.id}
              className={cn(CARD, 'w-full min-w-0 overflow-hidden p-space-md', isLegalGroup && 'lg:col-span-2')}
            >
              <div className="flex items-center gap-2.5 border-b border-surface-container pb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                  <Icon name={group.icon} className="text-[18px]" />
                </div>
                <h3 className="font-title-sm text-title-sm font-semibold text-on-surface truncate">
                  {group.title}
                </h3>
              </div>

              <div className="divide-y divide-surface-container/60 pt-1">
                {groupSettings.map((item) => {
                  const key = getKey(item);
                  const originalVal = getValue(item);
                  const defaultVal = getDefault(item);
                  const desc = getDesc(item);
                  const meta = SETTING_METAS[key];

                  const currentValue =
                    editingValues[key] !== undefined ? editingValues[key] : originalVal;
                  const hasChanged = currentValue !== originalVal;
                  const isDefault = originalVal === defaultVal;

                  // Khối hiển thị dành riêng cho Tài liệu pháp lý / Chính sách
                  if (isLegalGroup) {
                    const isPdf =
                      currentValue.toLowerCase().endsWith('.pdf') ||
                      currentValue.toLowerCase().includes('.pdf');
                    const fileName = getFileNameFromUrl(currentValue);

                    return (
                      <div
                        key={key}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between min-w-0 overflow-hidden"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md font-medium text-on-surface">
                              {meta?.label || desc || key}
                            </span>
                            {isPdf ? (
                              <span className="rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-bold text-error uppercase shrink-0">
                                PDF
                              </span>
                            ) : (
                              <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant uppercase shrink-0">
                                ẢNH
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-variant min-w-0">
                            <span className="shrink-0 text-[11px]">Tệp:</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewingDoc({
                                  title: meta?.label || desc || key,
                                  url: currentValue,
                                  fileName,
                                })
                              }
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline truncate max-w-[260px] sm:max-w-md text-left"
                              title="Nhấn để xem trước tài liệu trực tiếp trên màn hình"
                            >
                              <Icon name="visibility" className="text-[13px] shrink-0" />
                              <span className="truncate">{fileName}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                          {/* Nút Xem tệp trực tiếp trong modal */}
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            className="h-7 px-2 text-[11px] font-medium"
                            onClick={() =>
                              setPreviewingDoc({
                                title: meta?.label || desc || key,
                                url: currentValue,
                                fileName,
                              })
                            }
                            title="Xem trực tiếp trên màn hình"
                          >
                            <Icon name="visibility" className="text-[14px]" />
                            <span>Xem</span>
                          </Button>

                          {/* Nút chọn tải tệp PDF / Ảnh mới */}
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-[11px] font-medium text-on-surface hover:bg-surface-container transition-colors shadow-xs">
                              <Icon name="upload_file" className="text-[14px] text-primary" />
                              <span>Đổi tệp</span>
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              className="sr-only"
                              disabled={isUploadingFile}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleUploadFile(item, file);
                              }}
                            />
                          </label>

                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resetMutation.isPending}
                              onClick={() => setResettingKey(item)}
                              className="h-7 w-7 p-0 text-on-surface-variant hover:text-on-surface shrink-0"
                              title="Khôi phục tệp mặc định"
                            >
                              <Icon name="restart_alt" className="text-[14px]" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Khối hiển thị tinh gọn cho các chỉ số số / định lượng
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 py-2 min-w-0"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex flex-col min-w-0">
                          <label
                            htmlFor={`setting-${key}`}
                            className="font-label-md text-label-md font-medium text-on-surface truncate cursor-pointer"
                          >
                            {meta?.label || desc || key}
                          </label>
                          <span className="text-[11px] text-on-surface-variant/75 font-mono">
                            Mặc định: {defaultVal}{meta?.unit ? ` ${meta.unit}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Nút Lưu khi có thay đổi - nằm bên trái input để không xô lệch cột phải */}
                        {hasChanged && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={updateMutation.isPending}
                            onClick={() => handleSave(item)}
                            className="h-7 px-2 text-[11px] font-medium shrink-0 shadow-xs animate-in fade-in"
                            title="Lưu giá trị mới"
                          >
                            <Icon name="check" className="text-[13px]" />
                            Lưu
                          </Button>
                        )}

                        {/* Nút Khôi phục mặc định khi có giá trị tùy biến */}
                        {!isDefault && !hasChanged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={resetMutation.isPending}
                            onClick={() => setResettingKey(item)}
                            className="h-7 w-7 p-0 text-on-surface-variant hover:text-on-surface shrink-0"
                            title="Khôi phục về giá trị mặc định"
                          >
                            <Icon name="restart_alt" className="text-[15px]" />
                          </Button>
                        )}

                        {/* Cụm Input Group kích cỡ nhỏ gọn (h-7, w-[110px]), đồng nhất 100% thẳng hàng xuống */}
                        <div
                          className={cn(
                            'flex h-7 w-[110px] shrink-0 items-center rounded-lg border bg-surface-container-lowest transition-colors overflow-hidden',
                            hasChanged
                              ? 'border-primary ring-1 ring-primary/40 bg-primary/5'
                              : 'border-outline-variant hover:border-outline focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
                          )}
                        >
                          <input
                            id={`setting-${key}`}
                            type="number"
                            min={meta?.min}
                            max={meta?.max}
                            step={meta?.step || 1}
                            value={currentValue}
                            onChange={(e) => handleValueChange(key, e.target.value)}
                            className="w-full flex-1 min-w-0 bg-transparent px-2 py-0.5 text-xs font-mono text-right tabular-nums text-on-surface focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {meta?.unit && (
                            <span className="flex h-full w-[48px] shrink-0 items-center justify-center border-l border-outline-variant/60 bg-surface-container-low px-0.5 text-[11px] font-medium text-on-surface-variant select-none whitespace-nowrap text-center">
                              {meta.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {group.note && (
                <div className="mt-3 rounded-lg bg-surface-container-low p-2.5 text-[11px] text-on-surface-variant flex items-start gap-2">
                  <Icon name="info" className="text-[15px] text-primary shrink-0 mt-0.5" />
                  <span>{group.note}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog xác nhận khôi phục mặc định */}
      <ConfirmDialog
        show={!!resettingKey}
        title="Khôi phục giá trị mặc định?"
        message={
          resettingKey
            ? `Khôi phục chỉ số "${SETTING_METAS[getKey(resettingKey)]?.label || getKey(resettingKey)}" về giá trị gốc (${getDefault(resettingKey)})?`
            : ''
        }
        confirmLabel="Khôi phục"
        danger={false}
        loading={resetMutation.isPending}
        onConfirm={confirmReset}
        onCancel={() => !resetMutation.isPending && setResettingKey(null)}
      />

      {/* Modal xem trước tệp tài liệu pháp lý / chính sách PDF hoặc ảnh trực tiếp */}
      <LegalPdfPreviewModal
        show={!!previewingDoc}
        doc={previewingDoc}
        onHide={() => setPreviewingDoc(null)}
      />
    </div>
  );
};
