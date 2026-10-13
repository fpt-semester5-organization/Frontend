import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError } from '@/lib/apiError';

/**
 * 400 ERR_VALIDATION: hiện lỗi dưới từng trường từ details[] và giữ dữ liệu đã nhập (UI Spec 1.1).
 * Trả về true nếu đã gắn được ít nhất một lỗi vào form.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[]
): boolean {
  const apiError = toApiError(error);
  if (apiError.status !== 400 || apiError.details.length === 0) return false;

  let applied = false;
  for (const detail of apiError.details) {
    const field = fields.find((name) => name === detail.field);
    if (field) {
      setError(field, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}
