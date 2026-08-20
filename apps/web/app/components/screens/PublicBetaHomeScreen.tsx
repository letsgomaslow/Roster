'use client';

import Link from 'next/link';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import { Badge } from '@/app/components/control-plane/primitives';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';

const TRUST_MODEL = [
  {
    label: 'Workflow',
    title: 'Renewal brief builder',
    description: 'Produces the handoff an account team already needs.',
  },
  {
    label: 'Owner',
    title: 'Revenue operations',
    description: 'A named team keeps the reusable work current.',
  },
  {
    label: 'Human decision',
    title: 'Account lead approves',
    description: 'The judgment point stays explicit before use.',
  },
  {
    label: 'Evidence',
    title: 'Version 4 approved',
    description: 'Approval, source, and update history travel with the work.',
  },
] as const;

const LIBRARY_PREVIEW = [
  {
    title: 'Proposal drafter',
    purpose: 'Turn discovery notes into a client-ready proposal.',
    team: 'Client delivery',
    trust: 'Approved',
  },
  {
    title: 'Account research brief',
    purpose: 'Prepare a useful brief before a first client conversation.',
    team: 'Business development',
    trust: 'Approved',
  },
  {
    title: 'Campaign outline',
    purpose: 'Shape a campaign from a goal, audience, and source material.',
    team: 'Marketing',
    trust: 'Ready for review',
  },
] as const;

export function PublicBetaHomeScreen({
  authSurfaceState,
  diagnostic,
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  return (
    <div className="space-y-14 pb-12">
      <section className="grid overflow-hidden border border-[var(--line)] bg-[var(--panel)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-center px-6 py-12 md:px-10 md:py-16 lg:px-14 lg:py-20">
          <p className="font-brand-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--strategy-strong)]">
            AI employees for the work that waits on your busiest people.
          </p>
          <h1 className="mt-7 max-w-3xl font-heading text-balance text-4xl leading-[1.05] tracking-[-0.055em] text-[var(--ink)] md:text-6xl">
            Turn waiting work into trusted team workflows.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
            Capture what already works, assign a clear owner, keep the human decision visible, and reuse the approved version with evidence attached.
          </p>
          <AuthCtas
            authSurfaceState={authSurfaceState}
            className="pt-8"
            signInLabel="Sign in"
            signUpLabel="Start a working session"
          />
          <Link
            className="mt-5 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--maslow-action-link)] underline underline-offset-4 hover:text-[var(--maslow-action-link-hover)]"
            href="/getting-started"
          >
            See how governance works
          </Link>
          {authSurfaceState === 'failed' || authSurfaceState === 'disabled' ? (
            <div className="mt-6">
              <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
            </div>
          ) : null}
        </div>

        <aside className="relative border-t border-[var(--line)] bg-[var(--panel-strong)] px-6 py-10 text-white md:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-16" aria-label="Illustrative workflow trust model">
          <span aria-hidden="true" className="absolute left-0 top-12 h-14 w-1 bg-[var(--accent)]" />
          <p className="font-brand-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--maslow-color-dark-text)]">
            Illustrative workflow
          </p>
          <div className="mt-5">
            {TRUST_MODEL.map((item, index) => (
              <div className="border-b border-[var(--maslow-color-dark-line)] py-5 last:border-b-0" key={item.label}>
                <p className="font-brand-mono text-[11px] uppercase tracking-[0.12em] text-[var(--maslow-color-dark-text)]">
                  {String(index + 1).padStart(2, '0')} · {item.label}
                </p>
                <h2 className="mt-2 font-heading text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--maslow-color-dark-text)]">{item.description}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section aria-labelledby="library-preview-title">
        <p className="font-brand-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--strategy-strong)]">
          Work worth reusing
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]" id="library-preview-title">
          Start from a trusted version
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Every example is labeled with its current review state. These examples are illustrative.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {LIBRARY_PREVIEW.map((item) => (
            <article className="border border-[var(--line)] bg-[var(--panel)] p-5" key={item.title}>
              <Badge tone={item.trust === 'Approved' ? 'strategy' : 'info'}>{item.trust}</Badge>
              <h3 className="mt-4 font-heading text-xl font-semibold text-[var(--ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.purpose}</p>
              <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs font-medium text-[var(--ink-soft)]">Owner: {item.team}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
