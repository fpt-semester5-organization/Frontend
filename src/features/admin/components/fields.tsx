import { forwardRef, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { INPUT_CLASS } from '@/components/ui/forms';

function FieldShell({ id, label, error, hint, required, children }: { id: string; label: string; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface">
        {label} {required && <span className="text-secondary">*</span>}
      </label>
      {children}
      {hint && <p className="font-label-sm text-label-sm text-on-surface-variant">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, error, hint, required, id, name, ...rest }, ref) {
  const fid = id ?? name ?? label;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required}>
      <textarea ref={ref} id={fid} name={name} rows={3} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} className={`${INPUT_CLASS} resize-y ${error ? 'ring-1 ring-error' : ''}`} {...rest} />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
}
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, error, hint, required, id, name, children, ...rest }, ref) {
  const fid = id ?? name ?? label;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} required={required}>
      <select ref={ref} id={fid} name={name} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} className={`${INPUT_CLASS} ${error ? 'ring-1 ring-error' : ''}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

export const CheckField = forwardRef<HTMLInputElement, { label: string; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>>(function CheckField({ label, hint, id, name, ...rest }, ref) {
  const fid = id ?? name ?? label;
  return (
    <label htmlFor={fid} className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface">
      <input ref={ref} id={fid} name={name} type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-container" {...rest} />
      <span>
        {label}
        {hint && <span className="block font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
});
