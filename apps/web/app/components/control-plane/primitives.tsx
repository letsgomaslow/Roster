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
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--strategy-strong)]">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1 className="font-heading text-balance text-3xl tracking-[-0.045em] text-[var(--ink)] md:text-[2.6rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--ink-soft)] md:text-[15px]">
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
    neutral: 'border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]',
    dark: 'border-[var(--panel-strong)] bg-[var(--panel-strong)] text-white',
    tech: 'border-[var(--tech-soft)] bg-[var(--tech-wash)] text-[var(--ink)]',
    strategy: 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[var(--ink)]',
    attention: 'border-[var(--attention-soft)] bg-[var(--attention-wash)] text-[var(--ink)]',
  } satisfies Record<PanelTone, string>;

  return (
    <section
      className={cx(
        'border px-5 py-5',
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
                tone === 'dark' ? 'text-white/85' : 'text-[var(--muted)]',
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
        'min-h-[152px] border px-4 py-4',
        accent === 'strong'
          ? 'border-[rgba(255,255,255,0.14)] bg-white/8'
          : 'border-[var(--line)] bg-[var(--panel-soft)]',
      )}
    >
      <p
        className={cx(
          'text-[11px] font-semibold uppercase tracking-[0.22em]',
          accent === 'strong' ? 'text-white/85' : 'text-[var(--muted)]',
        )}
      >
        {label}
      </p>
      <p
        className={cx(
          'mt-3 font-heading text-3xl tracking-[-0.05em]',
          accent === 'strong' ? 'text-white' : 'text-[var(--ink)]',
        )}
      >
        {value}
      </p>
      {detail ? (
        <p
          className={cx(
            'mt-2 text-sm',
            accent === 'strong' ? 'text-white/90' : 'text-[var(--muted)]',
          )}
        >
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
    default: 'border-[var(--line)] bg-[var(--background-soft)] text-[var(--ink)]',
    brand: 'border-[var(--accent-soft)] bg-[var(--accent-wash)] text-[var(--accent-strong)]',
    success: 'border-[rgba(44,213,82,0.3)] bg-[var(--success-soft)] text-[#1c6d31]',
    info: 'border-[var(--tech-soft)] bg-[var(--tech-wash)] text-[#174f46]',
    warning: 'border-[var(--attention-soft)] bg-[var(--attention-wash)] text-[#6f4903]',
    error: 'border-[var(--error-soft)] bg-[rgba(213,44,44,0.08)] text-[var(--error-strong)]',
    strategy:
      'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[color:var(--label-purple,var(--strategy))]',
  };

  return (
    <span
      className={cx(
        'inline-flex min-h-8 items-center rounded-[var(--maslow-radius-capsule)] border px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em]',
        tones[tone],
      )}
    >
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
  tone?: 'primary' | 'secondary' | 'default' | 'ghost' | 'dark';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const classes = cx(
    'inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold transition-colors',
    tone === 'primary' &&
      'bg-[var(--button-primary)] text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)]',
    tone === 'secondary' &&
      'bg-[var(--button-secondary)] text-[var(--button-secondary-ink)] hover:bg-[var(--button-secondary-hover)]',
    tone === 'dark' && 'bg-[var(--ink)] text-white hover:bg-[var(--ink-soft)]',
    tone === 'ghost' &&
      'border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--panel-soft)]',
    tone === 'default' &&
      'border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--panel-soft)]',
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
    <div className="border border-dashed border-[var(--line-strong)] bg-[var(--panel-soft)] px-5 py-8 text-sm text-[var(--muted)]">
      <h2 className="font-semibold text-[var(--ink)]">{title}</h2>
      <p className="mt-2 max-w-xl leading-6">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SurfaceNotice({
  title,
  description,
  tone = 'neutral',
  action,
  live = false,
}: {
  title: string;
  description: string;
  tone?: 'neutral' | 'info' | 'warning' | 'error' | 'success';
  action?: ReactNode;
  live?: boolean;
}) {
  const toneClasses = {
    neutral: 'border-[var(--line)] bg-[var(--panel-soft)] text-[var(--ink)]',
    info: 'border-[var(--tech-soft)] bg-[var(--tech-wash)] text-[var(--ink)]',
    warning: 'border-[var(--attention-soft)] bg-[var(--attention-wash)] text-[var(--ink)]',
    error: 'border-[var(--error-soft)] bg-[rgba(213,44,44,0.08)] text-[var(--ink)]',
    success: 'border-[rgba(44,213,82,0.28)] bg-[var(--success-soft)] text-[var(--ink)]',
  } satisfies Record<'neutral' | 'info' | 'warning' | 'error' | 'success', string>;
  const role =
    tone === 'error' ? 'alert' : live && (tone === 'info' || tone === 'success') ? 'status' : undefined;

  return (
    <div className={cx('border px-4 py-4', toneClasses[tone])} role={role}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 4,
  detail = true,
}: {
  count?: number;
  detail?: boolean;
}) {
  return (
    <div aria-busy="true" aria-label="Loading library cards" role="status">
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: count }, (_, index) => (
        <div
          className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4"
          key={`skeleton-card-${index + 1}`}
        >
          <div className="h-3 w-24 bg-[var(--panel-muted)]" />
          <div className="mt-4 h-7 w-36 bg-[var(--panel-muted)]" />
          {detail ? (
            <>
              <div className="mt-4 h-3 w-full bg-[var(--panel-muted)]" />
              <div className="mt-2 h-3 w-3/4 bg-[var(--panel-muted)]" />
            </>
          ) : null}
        </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({
  rows = 4,
  dense = false,
}: {
  rows?: number;
  dense?: boolean;
}) {
  return (
    <div aria-busy="true" aria-label="Loading items" role="status">
      <div aria-hidden="true" className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
        <div
          className={cx(
            'border border-[var(--line)] bg-[var(--panel-soft)] px-4',
            dense ? 'py-3' : 'py-4',
          )}
          key={`skeleton-row-${index + 1}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 bg-[var(--panel-muted)]" />
              <div className="mt-3 h-3 w-full bg-[var(--panel-muted)]" />
              <div className="mt-2 h-3 w-2/3 bg-[var(--panel-muted)]" />
            </div>
            <div className="h-7 w-20 bg-[var(--panel-muted)]" />
          </div>
        </div>
        ))}
      </div>
    </div>
  );
}

export function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto border border-[rgba(255,255,255,0.14)] bg-[var(--panel-strong)] px-4 py-4 text-xs leading-6 text-[#d7e4ff]">
      <code>{value}</code>
    </pre>
  );
}
