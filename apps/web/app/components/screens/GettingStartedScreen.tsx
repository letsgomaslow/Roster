'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@convex/_generated/api';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { OnboardingChecklist } from '@/app/components/control-plane/OnboardingChecklist';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import { ActionButton, Badge, Panel } from '@/app/components/control-plane/primitives';
import { convexEnabled } from '@/lib/convex-client';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import { resolveGettingStartedViewState } from '@/lib/getting-started';
import { useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { DashboardApiPayload, DashboardSnapshot } from '@/lib/roster-types';

function SetupChecklistSkeleton({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Panel subtitle={subtitle} title={title} tone="tech">
      <div aria-live="polite" className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <section
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-card)]"
            key={`setup-skeleton-${index + 1}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 animate-pulse rounded-full border border-[var(--line)] bg-[var(--panel-soft)]" />
                <div className="space-y-3">
                  <div className="h-5 w-44 animate-pulse rounded-full bg-[var(--panel-soft)]" />
                  <div className="h-3 w-72 max-w-full animate-pulse rounded-full bg-[var(--panel-soft)]" />
                  <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-[var(--panel-soft)]" />
                </div>
              </div>
              <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--panel-soft)]" />
            </div>
            <div className="mt-5 h-11 w-36 animate-pulse rounded-full bg-[var(--panel-soft)]" />
          </section>
        ))}
      </div>
    </Panel>
  );
}

export function GettingStartedScreen({
  authSurfaceState,
  diagnostic,
  signedIn,
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [convexHandoffTimedOut, setConvexHandoffTimedOut] = useState(false);
  const convexSessionReady = convexEnabled ? Boolean(isAuthenticated) : true;
  const onboarding = useQuery(
    api.onboarding.getUserOnboardingState,
    convexEnabled && isAuthenticated ? {} : 'skip',
  );
  const snapshot = useQuery(
    api.prompts.dashboardSnapshot,
    convexEnabled && isAuthenticated ? { promptLimit: 4, agentLimit: 2 } : 'skip',
  );
  const dashboard = useRosterResource<RosterEnvelope<DashboardApiPayload>>(
    '/api/roster/dashboard',
    signedIn,
  );

  useEffect(() => {
    if (authSurfaceState !== 'ready' || !signedIn || convexSessionReady) {
      setConvexHandoffTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setConvexHandoffTimedOut(true);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [authSurfaceState, convexSessionReady, signedIn]);

  useEffect(() => {
    if (signedIn && onboarding?.onboardingCompletedAt) {
      router.replace('/');
    }
  }, [onboarding?.onboardingCompletedAt, router, signedIn]);

  const viewState = resolveGettingStartedViewState({
    authSurfaceState,
    signedIn,
    convexAuthenticated: convexSessionReady,
    convexHandoffTimedOut,
  });

  if (viewState === 'clerk_loading') {
    return (
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <Badge tone="brand">Getting started</Badge>
          <h1 className="font-heading text-balance text-4xl tracking-[-0.06em] text-[var(--ink)] md:text-5xl">
            Checking your beta session
          </h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            Verifying your Clerk session before setup loads. The checklist will appear once the
            account handoff finishes.
          </p>
        </div>

        <SetupChecklistSkeleton
          subtitle="Keeping setup visible while authentication resolves prevents the new-account flicker into an empty screen."
          title="Loading authenticated setup"
        />
      </div>
    );
  }

  if (viewState === 'signed_out') {
    return (
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <Badge tone="brand">Getting started</Badge>
          <h1 className="font-heading text-balance text-4xl tracking-[-0.06em] text-[var(--ink)] md:text-5xl">
            Sign in to continue setup
          </h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            Your beta account lands on a setup checklist first so you can connect a host, verify
            readiness, create a prompt, and run an orchestration before the dashboard becomes the
            default surface.
          </p>
          <AuthCtas
            authSurfaceState={authSurfaceState}
            className="pt-2"
            signInLabel="Sign in to continue"
            signUpLabel="Create beta account"
          />
          {authSurfaceState !== 'ready' ? (
            <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel
            subtitle="Every new account should leave setup with a proven path into the actual product."
            title="What setup covers"
            tone="strategy"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {[
                'Connect an MCP host',
                'Verify health and tool discovery',
                'Create the first prompt',
                'Open the first run',
              ].map((item) => (
                <div
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm font-medium text-[var(--ink)]"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="Need product context before you sign in?"
            title="Public beta entry"
            tone="tech"
          >
            <p className="text-sm leading-7 text-[var(--muted)]">
              The public home explains who Roster is for, what beta users should expect, and how
              support works during onboarding.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
              href="/"
            >
              Return to public beta entry
            </Link>
          </Panel>
        </div>
      </div>
    );
  }

  if (viewState === 'clerk_failed') {
    return (
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <Badge tone="brand">Getting started</Badge>
          <h1 className="font-heading text-balance text-4xl tracking-[-0.06em] text-[var(--ink)] md:text-5xl">
            Hosted auth needs attention before setup can continue
          </h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            Clerk did not finish bootstrapping in this browser session, so Roster fell back to the
            signed-out setup entry instead of leaving a broken authenticated checklist on screen.
          </p>
          <AuthCtas
            authSurfaceState={authSurfaceState}
            className="pt-2"
            signInLabel="Sign in to continue"
            signUpLabel="Create beta account"
          />
          <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <Badge tone="brand">Authenticated setup</Badge>
        <h1 className="font-heading text-balance text-4xl tracking-[-0.06em] text-[var(--ink)] md:text-5xl">
          Finish setup before the dashboard takes over
        </h1>
        <p className="text-base leading-8 text-[var(--muted)]">
          The checklist keeps the first beta session honest. It should end with a connected host,
          visible tools, at least one prompt, and at least one orchestration run.
        </p>
      </div>

      {viewState === 'convex_loading' ? (
        <SetupChecklistSkeleton
          subtitle="Roster is waiting for the Clerk session to become a Convex-backed product session before the checklist can hydrate."
          title="Finishing authenticated setup"
        />
      ) : null}

      {viewState === 'convex_error' ? (
        <Panel
          subtitle="The page kept its signed-in shell, but the Convex-backed setup session never arrived. That blocks the checklist from loading."
          title="Authenticated setup stalled"
          tone="attention"
        >
          <div className="space-y-4">
            <p className="text-sm leading-7 text-[var(--muted)]">
              This route now stays visible instead of collapsing to blank space. In local
              development, the most common cause is a Clerk session handoff issue such as a
              mismatched publishable and secret key pair or a missing `convex` JWT template.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={() => window.location.reload()} tone="dark">
                Reload setup
              </ActionButton>
              <ActionButton href="/integrations" tone="ghost">
                Open integrations
              </ActionButton>
            </div>
          </div>
        </Panel>
      ) : null}

      {viewState === 'ready' ? (
        <OnboardingChecklist
          dashboard={dashboard.data?.data}
          forceVisible
          showContinue
          snapshot={(snapshot as DashboardSnapshot | undefined) ?? null}
        />
      ) : null}
    </div>
  );
}
