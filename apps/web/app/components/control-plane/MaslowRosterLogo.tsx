'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

type MaslowRosterLogoProps = {
  variant?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
  rosterSuffix?: ReactNode;
};

export function MaslowRosterLogo({
  variant = 'light',
  compact = false,
  className,
  rosterSuffix,
}: MaslowRosterLogoProps) {
  const dark = variant === 'dark';
  return (
    <div className={cx('inline-flex items-center', compact ? 'gap-3' : 'gap-4', className)}>
      <Image
        alt="Maslow AI"
        className={cx('h-auto shrink-0', compact ? 'w-[7.25rem]' : 'w-[9rem]')}
        height={270}
        priority
        src={dark ? '/assets/logos/maslow-complete-white.png' : '/assets/logos/maslow-complete-black.png'}
        width={1700}
      />
      <span aria-hidden="true" className={cx('h-7 w-px', dark ? 'bg-white/30' : 'bg-[var(--line)]')} />
      <span className={cx('font-heading font-semibold', compact ? 'text-lg' : 'text-2xl', dark ? 'text-white' : 'text-[var(--ink)]')}>
        Roster
      </span>
      {rosterSuffix ? (
        <span className={cx('border px-2 py-1 font-brand-mono text-[0.58rem] font-medium uppercase tracking-[0.2em]', dark ? 'border-white/30 text-white' : 'border-[var(--line)] text-[var(--muted)]')}>
          {rosterSuffix}
        </span>
      ) : null}
    </div>
  );
}
