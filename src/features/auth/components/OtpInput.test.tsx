import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { OtpInput } from './OtpInput';

function Harness({ initial = '' }: { initial?: string }) {
  const [digits, setDigits] = useState(() => Array.from({ length: 6 }, (_, k) => initial[k] ?? ''));
  return (
    <>
      <OtpInput value={digits} onChange={setDigits} />
      <output data-testid="code">{digits.map((d) => d || '_').join('')}</output>
    </>
  );
}

const box = (n: number) => screen.getByLabelText(`Chữ số thứ ${n}`) as HTMLInputElement;
const code = () => screen.getByTestId('code').textContent;

describe('OtpInput', () => {
  it('gõ lần lượt 6 số thì tự chuyển ô', async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.keyboard('123456');
    expect(code()).toBe('123456');
    expect(box(6)).toHaveFocus();
  });

  it('bỏ qua ký tự không phải số', async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.keyboard('a1b2');
    expect(code()).toBe('12____');
  });

  it('gõ đè số mới lên ô đã có số, dù con trỏ đứng trước hay sau số cũ', () => {
    render(<Harness initial="111111" />);
    fireEvent.change(box(2), { target: { value: '19' } });
    expect(code()).toBe('191111');
    expect(box(3)).toHaveFocus();
    fireEvent.change(box(4), { target: { value: '71' } });
    expect(code()).toBe('191711');
  });

  it('gõ đè bằng bàn phím: bấm vào ô đã có số rồi gõ số khác', async () => {
    render(<Harness initial="123456" />);
    await userEvent.click(box(3));
    await userEvent.keyboard('9');
    expect(code()).toBe('129456');
    expect(box(4)).toHaveFocus();
  });

  it('Backspace: ô có số thì xóa tại chỗ; ô trống thì lùi về ô trước và xóa luôn', async () => {
    render(<Harness initial="123456" />);
    await userEvent.click(box(6));
    await userEvent.keyboard('{Backspace}');
    expect(code()).toBe('12345_');
    expect(box(6)).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    expect(code()).toBe('1234__');
    expect(box(5)).toHaveFocus();
    await userEvent.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}');
    expect(code()).toBe('______');
    expect(box(1)).toHaveFocus();
  });

  it('dán đủ 6 số vào bất kỳ ô nào thì điền từ ô đầu', async () => {
    render(<Harness />);
    await userEvent.click(box(3));
    await userEvent.paste('987654');
    expect(code()).toBe('987654');
    expect(box(6)).toHaveFocus();
  });

  it('dán đoạn văn bản có mã: lấy đúng cụm 6 số, bỏ phần chữ và khoảng trắng', async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.paste('Mã OTP của bạn: 482913 (hết hạn sau 5 phút)');
    expect(code()).toBe('482913');
    await userEvent.click(box(1));
    await userEvent.paste('123 456');
    expect(code()).toBe('123456');
  });

  it('dán ít hơn 6 số thì điền từ ô đang đứng', async () => {
    render(<Harness />);
    await userEvent.click(box(3));
    await userEvent.paste('45');
    expect(code()).toBe('__45__');
    expect(box(5)).toHaveFocus();
  });

  it('tự điền mã của điện thoại (cả chuỗi đi vào một ô qua sự kiện nhập) vẫn điền đủ 6 ô', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: '246810' } });
    expect(code()).toBe('246810');
  });

  it('phím mũi tên chuyển ô', async () => {
    render(<Harness initial="123456" />);
    await userEvent.click(box(3));
    await userEvent.keyboard('{ArrowLeft}');
    expect(box(2)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(box(4)).toHaveFocus();
  });
});
