import { forwardRef, useImperativeHandle, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export const OTP_LENGTH = 6;

export interface OtpInputHandle {
  /** Đưa con trỏ vào ô thứ `index` (mặc định ô đầu) và bôi đen số trong ô. */
  focus: (index?: number) => void;
}

interface OtpInputProps {
  /** Đúng 6 phần tử, mỗi phần tử là một chữ số hoặc chuỗi rỗng. */
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Lấy mã từ chuỗi dán hoặc tự điền: ưu tiên cụm đúng 6 số (vd. "Mã của bạn: 123456"), nếu không có thì lấy mọi chữ số. */
function extractDigits(text: string): string {
  const code = text.match(/(?<!\d)\d{6}(?!\d)/);
  return code ? code[0] : text.replace(/\D/g, '');
}

/**
 * Ô nhập mã OTP 6 số (SCR-03).
 * - Gõ đè: ô đã có số thì số mới thay số cũ, dù con trỏ đứng trước hay sau số cũ.
 * - Backspace: ô có số thì xóa số đó; ô trống thì lùi về ô trước và xóa luôn số ở đó.
 * - Dán hoặc tự điền mã (iOS/Android gửi cả chuỗi qua sự kiện nhập, không qua sự kiện dán): đủ 6 số thì điền từ ô đầu,
 *   ít hơn thì điền từ ô đang đứng. Vì vậy không đặt maxLength=1, nếu không trình duyệt di động sẽ cắt mã chỉ còn 1 số.
 */
export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput({ value, onChange, disabled, autoFocus }, ref) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    const box = inputs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    box?.focus();
    box?.select();
  };
  useImperativeHandle(ref, () => ({ focus: (index = 0) => focusBox(index) }));

  const setAt = (index: number, digit: string) => onChange(value.map((current, k) => (k === index ? digit : current)));

  const fill = (start: number, text: string) => {
    const digits = extractDigits(text);
    if (!digits) return;
    const from = digits.length >= OTP_LENGTH ? 0 : start;
    const next = [...value];
    digits
      .slice(0, OTP_LENGTH - from)
      .split('')
      .forEach((digit, k) => {
        next[from + k] = digit;
      });
    onChange(next);
    focusBox(Math.min(from + digits.length, OTP_LENGTH - 1));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAt(index, '');
      return;
    }
    const old = value[index];
    if (digits.length === 1) {
      setAt(index, digits);
      if (index < OTP_LENGTH - 1) focusBox(index + 1);
      return;
    }
    if (digits.length === 2 && old && (digits[0] === old || digits[1] === old)) {
      setAt(index, digits[0] === old ? digits[1] : digits[0]);
      if (index < OTP_LENGTH - 1) focusBox(index + 1);
      return;
    }
    fill(index, digits);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (value[index]) setAt(index, '');
      else if (index > 0) {
        setAt(index - 1, '');
        focusBox(index - 1);
      }
    } else if (event.key === 'Delete') {
      event.preventDefault();
      setAt(index, '');
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(index, event.clipboardData.getData('text'));
  };

  return (
    <div role="group" aria-label="Mã OTP 6 chữ số" className="flex w-full items-center justify-between gap-2">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus && index === 0}
          aria-label={`Chữ số thứ ${index + 1}`}
          disabled={disabled}
          className="h-14 w-12 min-w-0 select-all rounded-lg border border-surface-container-high bg-surface-container-low text-center font-headline-md text-[22px] text-on-surface shadow-sm transition-colors focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container disabled:opacity-60"
        />
      ))}
    </div>
  );
});
