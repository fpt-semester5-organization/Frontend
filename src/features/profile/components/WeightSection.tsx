import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { toApiError } from '@/lib/apiError';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { useCreateWeightEntry, useWeightHistory } from '../hooks/useProfile';
import { WEIGHT_MAX, WEIGHT_MIN, parseDecimal, todayIso } from '../lib/healthMetrics';
import { NOTE_MAX, weightEntrySchema, type WeightEntryValues } from '../types/profile.schemas';
import type { HealthProfile } from '../types/profile.types';
import { WeightChart } from './WeightChart';

const CARD = 'rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg';
const LABEL = 'font-label-md text-label-md text-on-surface';
const PAGE_SIZE = 10;
/** Biểu đồ: các mốc trong 90 ngày gần nhất. */
const CHART_DAYS = 90;

const displayDate = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/** Ghi cân nặng và xem lịch sử (SCR-08, FN-PROF-06). Chưa có hồ sơ sức khỏe thì server trả 409. */
export const WeightSection: React.FC<{ health: HealthProfile | null }> = ({ health }) => {
  const [page, setPage] = useState(1);
  const [notCompleted, setNotCompleted] = useState<string | null>(null);
  const chartFrom = todayIso(new Date(Date.now() - CHART_DAYS * 86_400_000));
  const history = useWeightHistory({ page, size: PAGE_SIZE }, true);
  const chart = useWeightHistory({ from: chartFrom, page: 1, size: 100 }, true);
  const createEntry = useCreateWeightEntry();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<WeightEntryValues>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: { weightKg: '', loggedDate: todayIso(), note: '' },
    mode: 'onTouched',
  });
  const noteLength = watch('note')?.length ?? 0;

  const onSubmit = (values: WeightEntryValues) =>
    createEntry.mutate(
      {
        weightKg: parseDecimal(values.weightKg) as number,
        ...(values.loggedDate ? { loggedDate: values.loggedDate } : {}),
        ...(values.note ? { note: values.note } : {}),
      },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã ghi cân nặng.');
          reset({ weightKg: '', loggedDate: todayIso(), note: '' });
          setPage(1);
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (applyServerFieldErrors(error, setError, ['weightKg', 'loggedDate', 'note'])) return;
          if (apiError.status === 409) setNotCompleted(getErrorMessage(apiError));
          else notifyApiError(error);
        },
      }
    );

  const rows = history.data?.items ?? [];

  return (
    <section aria-labelledby="weight-title" className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn(CARD, 'flex flex-col gap-space-md lg:col-span-4')}>
        <h2 id="weight-title" className="flex items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
          <Icon name="scale" className="text-[22px] text-primary" />
          Ghi cân nặng
        </h2>
        {!health && (
          <p className="rounded-lg bg-surface-container-low p-space-sm font-body-sm text-body-sm text-on-surface-variant">
            Hãy lưu hồ sơ sức khỏe ở trên trước, sau đó bạn có thể ghi cân nặng hằng ngày.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="weight-kg" className={LABEL}>
            Cân nặng (kg) <span className="text-secondary">*</span>
          </label>
          <input
            id="weight-kg"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={`${WEIGHT_MIN}–${WEIGHT_MAX}`}
            aria-invalid={!!errors.weightKg || undefined}
            {...register('weightKg')}
            className={cn(INPUT_CLASS, 'h-11 tabular-nums', errors.weightKg && INPUT_ERROR_CLASS)}
          />
          <FieldError>{errors.weightKg?.message}</FieldError>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="weight-date" className={LABEL}>
            Ngày cân
          </label>
          <input
            id="weight-date"
            type="date"
            max={todayIso()}
            aria-invalid={!!errors.loggedDate || undefined}
            {...register('loggedDate')}
            className={cn(INPUT_CLASS, 'h-11', errors.loggedDate && INPUT_ERROR_CLASS)}
          />
          <FieldError>{errors.loggedDate?.message}</FieldError>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="weight-note" className={LABEL}>
              Ghi chú
            </label>
            <span className="font-label-sm text-label-sm text-outline tabular-nums">
              {noteLength}/{NOTE_MAX}
            </span>
          </div>
          <textarea
            id="weight-note"
            rows={2}
            maxLength={NOTE_MAX}
            placeholder="Ví dụ: cân buổi sáng, trước khi ăn"
            aria-invalid={!!errors.note || undefined}
            {...register('note')}
            className={cn(INPUT_CLASS, 'resize-none', errors.note && INPUT_ERROR_CLASS)}
          />
          <FieldError>{errors.note?.message}</FieldError>
        </div>
        <Button type="submit" loading={createEntry.isPending} className="w-full">
          {!createEntry.isPending && <Icon name="add" className="text-[18px]" />}
          Ghi cân nặng
        </Button>
      </form>

      <div className={cn(CARD, 'flex flex-col gap-space-md lg:col-span-8')}>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Lịch sử cân nặng</h2>
        {chart.data && chart.data.items.length >= 2 && (
          <WeightChart entries={chart.data.items} targetWeightKg={health?.targetWeightKg ?? null} />
        )}
        {history.isPending ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Đang tải lịch sử cân nặng">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isRefetching} className="py-space-lg" />
        ) : rows.length === 0 ? (
          <p role="status" className="rounded-xl bg-surface-container-low p-space-md text-center font-body-md text-body-md text-on-surface-variant">
            Chưa có dữ liệu cân nặng. Ghi cân nặng đầu tiên ở khung bên cạnh để bắt đầu theo dõi.
          </p>
        ) : (
          <>
            <table className="w-full font-body-md text-body-md">
              <caption className="sr-only">Các lần ghi cân nặng, mới nhất trước</caption>
              <thead>
                <tr className="text-left font-label-sm text-label-sm text-on-surface-variant">
                  <th scope="col" className="py-2">Ngày</th>
                  <th scope="col" className="py-2 text-right">Cân nặng</th>
                  <th scope="col" className="py-2 text-right">So với lần trước</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const previous = rows[index + 1];
                  const diff = previous ? Math.round((row.weightKg - previous.weightKg) * 10) / 10 : null;
                  return (
                    <tr key={row.logId} className="border-t border-surface-container">
                      <td className="py-2.5 tabular-nums">{displayDate(row.loggedDate)}</td>
                      <td className="py-2.5 text-right font-label-lg text-label-lg tabular-nums">{formatNumber(row.weightKg)} kg</td>
                      <td
                        className={cn(
                          'py-2.5 text-right tabular-nums',
                          diff === null || diff === 0 ? 'text-on-surface-variant' : diff < 0 ? 'text-success' : 'text-secondary'
                        )}
                      >
                        {diff === null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)} kg`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {history.data && (
              <Pagination page={history.data.meta.page} size={history.data.meta.size} total={history.data.meta.total} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      <Modal show={notCompleted !== null} onHide={() => setNotCompleted(null)} title="Chưa có hồ sơ sức khỏe" size="sm">
        <div className="flex flex-col gap-5 p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{notCompleted}</p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setNotCompleted(null);
                document.getElementById('health-heightCm')?.focus();
              }}
            >
              Lập hồ sơ sức khỏe
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};
