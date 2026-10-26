import type { Tone } from '../lib/labels';

const TONE: Record<Tone, string> = {
  ok: 'bg-primary-fixed text-on-primary-fixed',
  wait: 'bg-secondary-fixed text-on-secondary-fixed',
  warn: 'bg-secondary-container/50 text-on-secondary-fixed',
  bad: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  success: 'bg-primary-fixed text-on-primary-fixed',
  warning: 'bg-secondary-container/50 text-on-secondary-fixed',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-secondary-fixed text-on-secondary-fixed',
};

export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${TONE[tone]}`}>{children}</span>;
}
