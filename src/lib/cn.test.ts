import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('giữ cỡ chữ của design system khi gộp với màu chữ', () => {
    expect(cn('font-label-md text-label-md', 'text-on-surface')).toBe('font-label-md text-label-md text-on-surface');
    expect(cn('px-2 text-label-sm', 'bg-success-container text-success')).toBe('px-2 text-label-sm bg-success-container text-success');
  });

  it('class sau vẫn ghi đè class trước cùng nhóm', () => {
    expect(cn('text-label-sm', 'text-body-md')).toBe('text-body-md');
    expect(cn('text-primary', 'text-on-surface')).toBe('text-on-surface');
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
