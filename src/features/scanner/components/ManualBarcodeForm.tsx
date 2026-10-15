import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS, LABEL_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { barcodeSchema, type BarcodeFormValues } from '../types/scanner.schemas';

interface ManualBarcodeFormProps {
  onSubmit: (barcode: string) => void;
  submitting: boolean;
  disabled?: boolean;
  /** Mã điền sẵn (mở lại từ lịch sử). */
  initialBarcode?: string;
  /** Lỗi 400 của server cho trường barcode. */
  serverError?: string | null;
  autoFocus?: boolean;
}

/** Nhập mã vạch bằng tay: dùng khi từ chối camera hoặc mã khó quét (method = MANUAL_INPUT). */
export const ManualBarcodeForm: React.FC<ManualBarcodeFormProps> = ({
  onSubmit,
  submitting,
  disabled,
  initialBarcode,
  serverError,
  autoFocus,
}) => {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<BarcodeFormValues>({
    resolver: zodResolver(barcodeSchema),
    defaultValues: { barcode: initialBarcode ?? '' },
  });

  useEffect(() => {
    if (initialBarcode) setValue('barcode', initialBarcode);
  }, [initialBarcode, setValue]);

  useEffect(() => {
    if (serverError) setError('barcode', { type: 'server', message: serverError });
  }, [serverError, setError]);

  const error = errors.barcode?.message;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.barcode))} noValidate className="flex flex-col gap-space-xs">
      <label htmlFor="manual-barcode" className={LABEL_CLASS}>
        Mã vạch
      </label>
      <div className="flex flex-col gap-space-sm sm:flex-row">
        <input
          id="manual-barcode"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          placeholder="Ví dụ: 8934563138165"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby="manual-barcode-hint"
          {...register('barcode', {
            // Chỉ giữ chữ số khi dán mã có dấu cách hoặc gạch.
            onChange: (event) => setValue('barcode', String(event.target.value).replace(/\D/g, '')),
          })}
          className={cn(INPUT_CLASS, 'font-mono tracking-wider tabular-nums', error && INPUT_ERROR_CLASS)}
        />
        <Button type="submit" loading={submitting} disabled={disabled} className="h-auto py-2.5">
          <Icon name="search" className="text-[18px]" />
          Kiểm tra
        </Button>
      </div>
      <p id="manual-barcode-hint" className="font-body-sm text-body-sm text-outline">
        Nhập 8–14 chữ số in bên dưới vạch đen (EAN-8, EAN-13, UPC-A).
      </p>
      <FieldError>{error}</FieldError>
    </form>
  );
};
