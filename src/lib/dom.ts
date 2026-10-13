import type { MouseEvent } from 'react';

/** Dùng cho link chưa có màn hình trong spec: không điều hướng. */
export const preventDefault = (e: MouseEvent) => e.preventDefault();
