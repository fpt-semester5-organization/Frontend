import { useCallback, useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { apiErrorCode, apiErrorMessage, apiFieldErrors } from '@/api/http';

/**
 * Chuyển lỗi API sang form: `details[]` -> lỗi dưới từng trường; lỗi còn lại -> khung cảnh báo (`message` của server).
 * Dữ liệu người dùng đã nhập luôn được giữ nguyên.
 */
export function useApiFormErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const [formError, setFormError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const handle = useCallback(
    (err: unknown) => {
      const fields = apiFieldErrors(err);
      const keys = Object.keys(fields);
      keys.forEach((k) => setError(k as Path<T>, { type: 'server', message: fields[k] }));
      setErrorCode(apiErrorCode(err));
      setFormError(keys.length ? null : apiErrorMessage(err));
    },
    [setError],
  );
  const clear = useCallback(() => {
    setFormError(null);
    setErrorCode(undefined);
  }, []);
  return { formError, errorCode, setFormError, handle, clear };
}
