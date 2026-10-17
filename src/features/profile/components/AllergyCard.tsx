import React, { useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { useAllergens, useReplaceAllergies } from '../hooks/useProfile';
import { ALLERGENS_MAX, NOTE_MAX, allergiesFormSchema } from '../types/profile.schemas';
import type { UserAllergen } from '../types/profile.types';

/**
 * Khai báo dị ứng (SCR-09, FN-PROF-05): chọn từ danh mục GET /allergens, mỗi mục có ghi chú ≤ 255 ký tự, tối đa 20 mục.
 * UNSPECIFIED: GET /users/me chỉ trả {allergenId, name}, không có notes, nên ghi chú đã lưu trước đó không hiện lại được
 * và PUT (thay toàn bộ) sẽ ghi đè bằng ghi chú đang nhập.
 */
export const AllergyCard: React.FC<{ current: UserAllergen[]; isMember: boolean }> = ({ current, isMember }) => {
  const { requireMember } = useRequireMember();
  const catalog = useAllergens();
  const replace = useReplaceAllergies();
  const [selected, setSelected] = useState<Map<number, string>>(() => new Map(current.map((item) => [item.allergenId, ''])));
  const [notFound, setNotFound] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const full = selected.size >= ALLERGENS_MAX;

  const toggle = (allergenId: number) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(allergenId)) next.delete(allergenId);
      else if (next.size < ALLERGENS_MAX) next.set(allergenId, '');
      return next;
    });

  const setNote = (allergenId: number, notes: string) => {
    setSelected((prev) => new Map(prev).set(allergenId, notes));
    // Kiểm tra ngay khi gõ (ô đã giới hạn maxLength, phòng trường hợp dán chuỗi dài).
    setErrors((prev) => {
      const next = { ...prev };
      if (notes.trim().length > NOTE_MAX) next[allergenId] = `Ghi chú tối đa ${NOTE_MAX} ký tự.`;
      else delete next[allergenId];
      return next;
    });
  };

  const save = () =>
    requireMember(() => {
      const body = { allergens: [...selected].map(([allergenId, notes]) => ({ allergenId, notes: notes.trim() })) };
      const parsed = allergiesFormSchema.safeParse(body);
      if (!parsed.success) return;
      setNotFound(null);
      replace.mutate(
        { allergens: parsed.data.allergens.map(({ allergenId, notes }) => (notes ? { allergenId, notes } : { allergenId })) },
        {
          onSuccess: (res) => notifySuccess(res.message || 'Đã lưu dị ứng.'),
          onError: (error) => {
            if (toApiError(error).status === 404) {
              // ERR_ALLERGEN_NOT_FOUND: danh mục đã đổi, tải lại để người dùng chọn lại.
              setNotFound(getErrorMessage(error));
              catalog.refetch();
            } else notifyApiError(error);
          },
        }
      );
    });

  return (
    <section aria-labelledby="allergy-title" className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="allergy-title" className="font-headline-sm text-headline-sm text-on-surface">
            Dị ứng thực phẩm
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Thực đơn tuần, gợi ý tủ lạnh và quét mã vạch sẽ loại trừ các chất này.</p>
        </div>
        <span role="status" className={cn('rounded-full px-2.5 py-0.5 font-label-md text-label-md tabular-nums', full ? 'bg-warning-container text-warning' : 'bg-surface-container text-on-surface')}>
          Đã chọn {selected.size}/{ALLERGENS_MAX}
        </span>
      </div>

      {notFound && (
        <FormAlert tone="error" title="Không tìm thấy chất dị ứng">
          {notFound} Danh mục đã được tải lại, vui lòng chọn lại.
        </FormAlert>
      )}
      {full && <p className="font-label-sm text-label-sm text-warning">Bạn đã chọn tối đa {ALLERGENS_MAX} chất dị ứng.</p>}

      {catalog.isPending ? (
        <div className="grid gap-2 sm:grid-cols-2" role="status" aria-label="Đang tải danh mục dị ứng">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : catalog.isError ? (
        <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} retrying={catalog.isRefetching} className="py-space-md" />
      ) : catalog.data.length === 0 ? (
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Chưa có dữ liệu danh mục dị ứng.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {catalog.data.map((allergen) => {
            const checked = selected.has(allergen.allergenId);
            const noteId = `allergy-note-${allergen.allergenId}`;
            return (
              <li key={allergen.allergenId} className={cn('rounded-xl p-space-sm transition-colors', checked ? 'bg-primary-fixed' : 'bg-surface-container-low')}>
                <label className="flex cursor-pointer items-center gap-space-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggle(allergen.allergenId)}
                    className="accent-primary"
                  />
                  <span className="font-label-md text-label-md text-on-surface">{allergen.allergenName}</span>
                </label>
                {checked && (
                  <div className="mt-2 flex flex-col gap-1">
                    <label htmlFor={noteId} className="sr-only">
                      Ghi chú cho {allergen.allergenName}
                    </label>
                    <input
                      id={noteId}
                      type="text"
                      maxLength={NOTE_MAX}
                      value={selected.get(allergen.allergenId)}
                      onChange={(event) => setNote(allergen.allergenId, event.target.value)}
                      placeholder="Ghi chú (không bắt buộc), ví dụ: phản ứng nặng"
                      aria-invalid={!!errors[allergen.allergenId] || undefined}
                      className={cn(INPUT_CLASS, 'h-9 bg-surface-container-lowest py-1 text-body-sm', errors[allergen.allergenId] && INPUT_ERROR_CLASS)}
                    />
                    <FieldError>{errors[allergen.allergenId]}</FieldError>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-space-sm">
        <Button onClick={save} loading={replace.isPending} disabled={Object.keys(errors).length > 0}>
          {!replace.isPending && <Icon name="save" className="text-[18px]" />}
          Lưu dị ứng
        </Button>
        {isMember && selected.size === 0 && (
          <span className="font-label-sm text-label-sm text-on-surface-variant">Lưu khi không chọn mục nào nghĩa là bạn không dị ứng chất nào.</span>
        )}
      </div>
    </section>
  );
};
