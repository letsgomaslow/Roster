'use client';

import Link from 'next/link';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import { Badge } from '@/app/components/control-plane/primitives';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';

const LIBRARY_PREVIEW = [
  {
    title: 'Proposal drafter',
    purpose: 'Turn discovery notes into a client-ready proposal.',
    team: 'Client delivery',
    trust: 'Team approved',
  },
  {
    title: 'Account research brief',
    purpose: 'Prepare a useful brief before a first client conversation.',
    team: 'Business development',
    trust: 'Team approved',
  },
  {
    title: 'Campaign outline',
    purpose: 'Shape a campaign from a goal, audience, and source material.',
    team: 'Marketing',
    trust: 'Ready for review',
  },
] as const;

const USE_STEPS = [
  {
    title: 'Find trusted work',
    description: 'Search by the outcome you need and see which exact version your team reviewed.',
  },
  {
    title: 'Add the details',
    description: 'Fill in friendly fields for the client, audience, notes, or other changing context.',
  },
  {
    title: 'Use it anywhere',
    description: 'Copy the finished prompt into the AI tool you already use—without hidden rewriting.',
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
    <div className="space-y-12 pb-12">
      <section className="grid gap-8 border-b border-[var(--line)] pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Badge tone="brand">Roster · AI Work Library</Badge>
          <h1 className="mt-6 max-w-3xl font-heading text-balance text-4xl tracking-[-0.055em] text-[var(--ink)] md:text-6xl">
            Your team’s best AI work, ready when you need it.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
            Save useful prompts once, review the exact version as a team, and reuse it without
            digging through documents or notes.
          </p>
          <AuthCtas
            authSurfaceState={authSurfaceState}
            className="pt-7"
            signInLabel="Sign in"
            signUpLabel="Create workspace"
          />
          {authSurfaceState === 'failed' || authSurfaceState === 'disabled' ? (
            <div className="mt-6">
              <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
            </div>
          ) : null}
          <p className="mt-6 text-sm leading-7 text-[var(--muted)]">
            Works with the AI tools your team already uses. No connection is required to start.
          </p>
        </div>

        <div className="border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--strategy-strong)]">
                Team library
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]">
                Work worth reusing
              </h2>
            </div>
            <span className="text-sm text-[var(--muted)]">3 examples</span>
          </div>
          <div className="mt-4 space-y-3">
            {LIBRARY_PREVIEW.map((item) => (
              <article className="border border-[var(--line)] bg-[var(--panel-soft)] p-4" key={item.title}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                  <Badge tone={item.trust === 'Team approved' ? 'strategy' : 'info'}>
                    {item.trust}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.purpose}</p>
                <p className="mt-3 text-xs font-medium text-[var(--ink-soft)]">{item.team}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-roster-works">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--strategy-strong)]">
          One simple flow
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-[var(--ink)] md:text-3xl" id="how-roster-works">
            From scattered notes to dependable team work
          </h2>
          <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--ink)] underline underline-offset-4" href="/getting-started">
            See the first-use experience
          </Link>
        </div>
        <ol className="mt-6 grid gap-4 lg:grid-cols-3">
          {USE_STEPS.map((step, index) => (
            <li className="border border-[var(--line)] bg-[var(--panel)] p-5" key={step.title}>
              <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line-strong)] text-sm font-semibold text-[var(--ink)]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-[var(--ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
