import type { ReactNode } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/cx';

type PanelTone = 'neutral' | 'dark' | 'tech' | 'strategy' | 'attention';

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--strategy-strong)]">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h1 className="font-display text-balance text-3xl tracking-[-0.05em] text-[var(--ink)] md:text-[3.25rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-[15px]">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  tone = 'neutral',
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tone?: PanelTone;
  className?: string;
  action?: ReactNode;
}) {
  const toneClasses = {
    neutral:
      'border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-card)]',
    dark: 'border-[rgba(255,255,255,0.14)] bg-[var(--panel-strong)] text-white shadow-[var(--shadow-panel-strong)] [background-image:var(--panel-strong-gradient)]',
    tech:
      'border-[var(--tech-soft)] bg-[linear-gradient(180deg,rgba(115,193,174,0.12),rgba(255,255,255,0.88))] text-[var(--ink)] shadow-[var(--shadow-card)]',
    strategy:
      'border-[var(--strategy-soft)] bg-[linear-gradient(180deg,rgba(160,112,166,0.11),rgba(255,255,255,0.88))] text-[var(--ink)] shadow-[var(--shadow-card)]',
    attention:
      'border-[var(--attention-soft)] bg-[linear-gradient(180deg,rgba(235,169,61,0.14),rgba(255,255,255,0.9))] text-[var(--ink)] shadow-[var(--shadow-card)]',
  } satisfies Record<PanelTone, string>;

  return (
    <section
      className={cx(
        'group rounded-[28px] border px-5 py-5 transition duration-300 hover:-translate-y-0.5',
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            className={cx(
              'text-base font-semibold',
              tone === 'dark' ? 'text-white' : 'text-[var(--ink)]',
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cx(
                'text-sm leading-6',
                tone === 'dark' ? 'text-white/72' : 'text-[var(--muted)]',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent = 'default',
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: 'default' | 'strong';
}) {
  return (
    <div
      className={cx(
        'rounded-[24px] border px-4 py-4',
        accent === 'strong'
          ? 'border-[rgba(255,255,255,0.14)] bg-white/8'
          : 'border-[var(--line)] bg-[var(--panel-soft)]',
      )}
    >
      <p className={cx('text-[11px] font-semibold uppercase tracking-[0.22em]', accent === 'strong' ? 'text-white/68' : 'text-[var(--muted)]')}>
        {label}
      </p>
      <p className={cx('mt-3 font-display text-3xl tracking-[-0.05em]', accent === 'strong' ? 'text-white' : 'text-[var(--ink)]')}>
        {value}
      </p>
      {detail ? (
        <p className={cx('mt-2 text-sm', accent === 'strong' ? 'text-white/78' : 'text-[var(--muted)]')}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'info' | 'warning' | 'error' | 'strategy';
}) {
  const tones = {
    default: 'border-[var(--line)] bg-[var(--background-soft)] text-[var(--muted)]',
    brand: 'border-[var(--accent-soft)] bg-[var(--accent-wash)] text-[var(--accent-hover)]',
    success: 'border-[rgba(44,213,82,0.24)] bg-[var(--success-soft)] text-[color:var(--success)]',
    info: 'border-[var(--tech-soft)] bg-[var(--tech-wash)] text-[color:var(--ink)]',
    warning: 'border-[var(--attention-soft)] bg-[var(--attention-wash)] text-[color:var(--ink)]',
    error: 'border-[var(--error-soft)] bg-[rgba(213,44,44,0.08)] text-[color:var(--error)]',
    strategy: 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[color:var(--label-purple,var(--strategy))]',
  };

  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]', tones[tone])}>
      {children}
    </span>
  );
}

export function ActionButton({
  children,
  onClick,
  href,
  tone = 'default',
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: 'primary' | 'default' | 'ghost' | 'dark';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const classes = cx(
    'inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition',
    tone === 'primary' && 'bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--accent-hover)]',
    tone === 'dark' && 'bg-[var(--ink)] text-white hover:bg-[var(--ink-soft)]',
    tone === 'ghost' && 'border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--panel-soft)]',
    tone === 'default' && 'border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--panel-soft)]',
    disabled && 'pointer-events-none opacity-60',
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-5 py-8 text-sm text-[var(--muted)]">
      <p className="font-medium text-[var(--ink)]">{title}</p>
      <p className="mt-2 max-w-xl leading-6">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[var(--panel-strong)] px-4 py-4 text-xs leading-6 text-[#d7e4ff] [background-image:var(--panel-strong-gradient)]">
      <code>{value}</code>
    </pre>
  );
}
