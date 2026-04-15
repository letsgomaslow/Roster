'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

type MaslowRosterLogoProps = {
  variant?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
  rosterSuffix?: ReactNode;
};

function MaslowSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 36 23"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="maslow-roster-logo-gradient" x1="2" x2="33" y1="4" y2="20">
          <stop offset="0%" stopColor="#6DC4AD" />
          <stop offset="48.6%" stopColor="#A9A1B0" />
          <stop offset="100%" stopColor="#F377B3" />
        </linearGradient>
      </defs>
      <path
        d="M2.5 19.6V4.8c0-1.6 1.9-2.4 3.1-1.3l5.4 5.3 5.4-5.3c1.1-1.1 3.1-.3 3.1 1.3v14.8c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3V10.5l-2.4 2.4c-.9.9-2.4.9-3.3 0l-2.4-2.4v9.1c0 1.3-1 2.3-2.3 2.3s-2.5-1-2.5-2.3Z"
        fill="url(#maslow-roster-logo-gradient)"
      />
      <path
        d="M20.8 19.6V4.8c0-1.6 1.9-2.4 3.1-1.3L29.3 9l5.4-5.5c1.1-1.1 3.1-.3 3.1 1.3v14.8c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3V10.4l-2.5 2.5c-.9.9-2.4.9-3.3 0l-2.3-2.4v9.1c0 1.3-1.1 2.3-2.4 2.3s-2.3-1-2.3-2.3Z"
        fill="url(#maslow-roster-logo-gradient)"
        opacity="0.92"
      />
    </svg>
  );
}

export function MaslowRosterLogo({
  variant = 'light',
  compact = false,
  className,
  rosterSuffix,
}: MaslowRosterLogoProps) {
  const dark = variant === 'dark';

  return (
    <div
      className={cx(
        'inline-flex items-center gap-3',
        compact ? 'gap-2.5' : 'gap-3.5',
        className,
      )}
    >
      <MaslowSymbol className={cx('shrink-0', compact ? 'h-[1.1rem] w-[1.7rem]' : 'h-[1.45rem] w-[2.2rem]')} />
      <div className="min-w-0">
        <div
          className={cx(
            'flex items-center gap-1 whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.28em]',
            dark ? 'text-white/78' : 'text-[var(--muted)]',
          )}
        >
          <span>Maslow</span>
          <span className={dark ? 'text-white/42' : 'text-[var(--line-strong)]'}>|</span>
          <span className="font-brand-mono text-[0.58rem] tracking-[0.34em]">AI</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cx(
              'max-w-[12rem] truncate font-display text-[1.7rem] leading-none tracking-[-0.05em]',
              dark ? 'text-white' : 'text-[var(--ink)]',
              compact && 'text-[1.2rem]',
            )}
          >
            Roster
          </span>
          {rosterSuffix ? (
            <span
              className={cx(
                'mb-0.5 rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.24em]',
                dark
                  ? 'border-white/14 bg-white/8 text-white/72'
                  : 'border-[var(--line)] bg-white/75 text-[var(--muted)]',
              )}
            >
              {rosterSuffix}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
