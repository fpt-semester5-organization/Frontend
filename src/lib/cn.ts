import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Cỡ chữ của design system (@theme --text-* trong styles/index.css). tailwind-merge không biết các tên này nên mặc định coi
 * `text-label-md` là màu chữ và bỏ mất nó khi gộp với `text-on-surface`; khai báo để hai nhóm không đè nhau.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'display-lg',
            'display-lg-mobile',
            'headline-lg',
            'headline-lg-mobile',
            'headline-md',
            'headline-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'label-lg',
            'label-md',
            'label-sm',
          ],
        },
      ],
    },
  },
});

/** Ghép class Tailwind, class sau ghi đè class trước cùng nhóm. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
