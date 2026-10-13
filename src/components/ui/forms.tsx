import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';

export const INPUT_CLASS =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  icon?: string;
}

/** Ô nhập có nhãn + lỗi dưới ô (spec 13 §1.1: lỗi hiện dưới từng trường, giữ nguyên dữ liệu đã nhập). */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, icon, required, id, className = '', ...rest }, ref) {
  const fid = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="flex items-center justify-between font-label-md text-label-md text-on-surface">
        <span>
          {label} {required && <span className="text-secondary">*</span>}
        </span>
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={`${INPUT_CLASS} ${icon ? 'pr-10' : ''} ${error ? 'ring-1 ring-error' : ''} ${className}`}
          {...rest}
        />
        {icon && <span className="material-symbols-outlined pointer-events-none absolute right-3 text-[18px] text-outline">{icon}</span>}
      </div>
      {hint}
      {error && (
        <p id={`${fid}-err`} role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
});

/** Ô mật khẩu có nút hiện/ẩn. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'icon'>>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  const { label, error, hint, required, id, className = '', ...rest } = props;
  const fid = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="flex items-center justify-between font-label-md text-label-md text-on-surface">
        <span>
          {label} {required && <span className="text-secondary">*</span>}
        </span>
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={fid}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          className={`${INPUT_CLASS} pr-10 ${error ? 'ring-1 ring-error' : ''} ${className}`}
          {...rest}
        />
        <button type="button" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow((v) => !v)} className="absolute right-3 flex items-center text-outline transition-colors hover:text-on-surface">
          <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {hint}
      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
});

/** Nút gửi: khóa + vòng chờ khi đang gửi (spec 13: "thao tác ghi đang gửi → khóa nút, hiện vòng chờ"). */
export function SubmitButton({ loading, children, icon = 'arrow_forward', disabled }: { loading?: boolean; children: ReactNode; icon?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-space-md py-3 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : null}
      <span>{children}</span>
      {!loading && <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">{icon}</span>}
    </button>
  );
}

/** Khung lỗi/nhắc nhở trong form (422/409 → khung nổi bật với `message` của server). */
export function FormAlert({ kind = 'error', children }: { kind?: 'error' | 'info'; children: ReactNode }) {
  const cls = kind === 'error' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant';
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-lg px-space-md py-space-sm font-body-sm text-body-sm ${cls}`}>
      <span className="material-symbols-outlined text-[18px]">{kind === 'error' ? 'error' : 'info'}</span>
      <span>{children}</span>
    </div>
  );
}

/** Thanh độ mạnh mật khẩu 4 nấc (SCR-02/05/06). */
export function StrengthBar({ score, label }: { score: number; label: string }) {
  const color = score <= 1 ? 'bg-error' : score === 2 ? 'bg-secondary' : 'bg-primary-container';
  return (
    <div className="mt-1 flex flex-col gap-1" role="status">
      <div className="flex w-full items-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? color : 'bg-surface-container-highest'}`} />
        ))}
      </div>
      <span className="sr-only">Độ bảo mật: {label}</span>
    </div>
  );
}
