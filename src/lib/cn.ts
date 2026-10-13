import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Ghép class Tailwind, class sau ghi đè class trước cùng nhóm. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
