'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import { Badge, SurfaceNotice } from '@/app/components/control-plane/primitives';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import { convexEnabled } from '@/lib/convex-client';
import {
  resolveGettingStartedAudience,
  resolveGettingStartedViewState,
} from '@/lib/getting-started';
import {
  buildOwnerSetupSteps,
  getFirstUseChoices,
  getOwnerPrimaryStep,
} from '@/lib/onboarding';

type SeedState = 'idle' | 'saving' | 'saved' | 'error';

const CONVEX_AUTH_HANDOFF_TIMEOUT_MS = 8_000;

type HandoffTimerSetter = (callback: () => void, timeoutMs: number) => number;
type HandoffTimerClearer = (timerId: number) => void;

export function startConvexAuthHandoffTimer(
  onTimeout: () => void,
  setTimer: HandoffTimerSetter = (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
  clearTimer: HandoffTimerClearer = (timerId) => window.clearTimeout(timerId),
): () => void {
  const timerId = setTimer(onTimeout, CONVEX_AUTH_HANDOFF_TIMEOUT_MS);
  return () => clearTimer(timerId);
}

type GettingStartedScreenProps = {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
  signedIn: boolean;
  displayName?: string;
  organizationName?: string;
  hasTeammates?: boolean;
  onInvite?: () => void;
};

function StableOpeningState({ title }: { title: string }) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-5xl place-items-center py-12">
      <section
        aria-busy="true"
        aria-live="polite"
        className="w-full border border-[var(--line)] bg-[var(--panel)] p-6 md:p-10"
      >
        <Badge tone="brand">Roster</Badge>
        <h1 className="mt-6 max-w-2xl font-heading text-balance text-4xl tracking-[-0.055em] text-[var(--ink)] md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted)]">
          We’ll keep this page steady while your team’s Library becomes available.
        </p>
        <div aria-hidden="true" className="mt-8 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="min-h-32 border border-[var(--line)] bg-[var(--panel-soft)]" key={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ConvexHandoffRecovery() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="font-heading text-4xl tracking-[-0.05em] text-[var(--ink)]">
        Your sign-in needs one more try
      </h1>
      <div className="mt-6">
        <SurfaceNotice
          action={
            <a
              className="inline-flex min-h-11 items-center justify-center border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
              href="/getting-started"
            >
              Reload and try again
            </a>
          }
          description="Your browser session is ready, but Roster could not connect it to your workspace in time. Reloading starts a fresh connection."
          title="Roster could not finish signing you in"
          tone="error"
        />
      </div>
    </div>
  );
}

function SignedOutStart({
  authSurfaceState,
  diagnostic,
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  return (
    <div className="mx-auto max-w-5xl py-8 md:py-14">
      <div className="grid overflow-hidden border border-[var(--line)] bg-[var(--panel)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 md:p-10 lg:p-12">
          <Badge tone="brand">Roster AI Work Library</Badge>
          <h1 className="mt-6 max-w-2xl font-heading text-balance text-4xl tracking-[-0.055em] text-[var(--ink)] md:text-6xl">
            Your team’s best AI work, ready when you are.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--muted)]">
            Sign in to find trusted work, reuse it with friendly inputs, or save something your team
            should not have to rebuild.
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
        </div>
        <aside className="border-t border-[var(--line)] bg-[var(--strategy-wash)] p-6 md:p-10 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--strategy-strong)]">
            Start with value
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            No setup lesson before useful work
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
            <li>Find work your team has already reviewed.</li>
            <li>Fill in only the details that change.</li>
            <li>Keep your own work private until it is ready.</li>
          </ul>
          <Link className="mt-8 inline-flex min-h-11 items-center font-semibold text-[var(--ink)] underline underline-offset-4" href="/">
            Return to Roster
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TeammateStart({
  canSave,
  displayName,
  firstTrustedHref,
  onChoose,
}: {
  canSave: boolean;
  displayName?: string;
  firstTrustedHref: string;
  onChoose: () => void;
}) {
  const choices = getFirstUseChoices().filter(
    (choice) => canSave || choice.id !== 'save_my_work',
  );

  return (
    <div className="mx-auto max-w-6xl py-6 md:py-10">
      <div className="grid overflow-hidden border border-[var(--line)] bg-[var(--panel)] lg:grid-cols-[0.9fr_1.1fr]">
        <header className="border-b border-[var(--line)] bg-[var(--strategy-wash)] p-6 md:p-10 lg:border-b-0 lg:border-r">
          <Badge tone="brand">Welcome{displayName ? `, ${displayName}` : ''}</Badge>
          <h1 className="mt-6 max-w-xl font-heading text-balance text-4xl tracking-[-0.055em] text-[var(--ink)] md:text-6xl">
            Your team’s best AI work, ready to use.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-[var(--muted)]">
            Roster keeps useful prompts and playbooks together, so you can spend less time finding
            the right version and more time using it.
          </p>
          <p className="mt-8 text-sm leading-7 text-[var(--ink-soft)]">
            You can explore connections and other advanced settings later. They are not required to
            get value from the Library.
          </p>
        </header>

        <section className="p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--strategy-strong)]">
            Your first step
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--ink)] md:text-3xl">
            Start with something useful
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Pick one. You can change direction at any time.
          </p>

          <div className="mt-7 grid gap-3">
            {choices.map((choice, index) => {
              const href = choice.id === 'use_trusted_work' ? firstTrustedHref : choice.href;
              return (
                <Link
                  className="group grid min-h-28 grid-cols-[auto_1fr_auto] items-center gap-4 border border-[var(--line)] bg-[var(--panel)] p-4 hover:border-[var(--line-strong)] hover:bg-[var(--panel-soft)] md:p-5"
                  href={href}
                  key={choice.id}
                  onClick={onChoose}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--background-soft)] text-sm font-semibold text-[var(--ink)]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-[var(--ink)]">{choice.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                      {choice.description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-xl text-[var(--ink)]">→</span>
                </Link>
              );
            })}
          </div>

          <Link
            className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]"
            href="/"
            onClick={onChoose}
          >
            I’ll explore on my own
          </Link>
        </section>
      </div>
    </div>
  );
}

function OwnerStart({
  organizationName,
  usefulWorkReady,
  hasTeammates,
  seedState,
  seedMessage,
  onSeed,
  onInvite,
  onFinish,
}: {
  organizationName?: string;
  usefulWorkReady: boolean;
  hasTeammates: boolean;
  seedState: SeedState;
  seedMessage?: string;
  onSeed: () => void;
  onInvite?: () => void;
  onFinish: () => void;
}) {
  const steps = buildOwnerSetupSteps({
    workspaceReady: true,
    usefulWorkReady,
    teammateReady: hasTeammates,
  });
  const primaryStep = getOwnerPrimaryStep(steps);

  return (
    <div className="mx-auto max-w-6xl py-6 md:py-10">
      <header className="max-w-3xl">
        <Badge tone="brand">{organizationName ?? 'Your workspace'}</Badge>
        <h1 className="mt-6 font-heading text-balance text-4xl tracking-[-0.055em] text-[var(--ink)] md:text-6xl">
          Build a useful library with your team.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
          Put useful work in the Library before asking anyone else to learn a new tool. Invitation is
          optional and can wait until there is something worth sharing.
        </p>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <section
            className="flex min-h-64 flex-col border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6"
            key={step.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--background-soft)] text-sm font-semibold text-[var(--ink)]">
                {index + 1}
              </span>
              <Badge tone={step.complete ? 'success' : step.optional ? 'default' : 'strategy'}>
                {step.complete ? 'Ready' : step.optional ? 'Optional' : 'Next'}
              </Badge>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--ink)]">{step.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-[var(--muted)]">{step.description}</p>

            {step.id === 'workspace' ? (
              <p className="mt-5 text-sm font-semibold text-[var(--success-strong,#1c6d31)]">
                Workspace created
              </p>
            ) : null}

            {step.id === 'starter' && !step.complete ? (
              <div className="mt-5 space-y-3">
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)] disabled:cursor-wait disabled:opacity-60"
                  disabled={seedState === 'saving'}
                  onClick={onSeed}
                  type="button"
                >
                  {seedState === 'saving' ? 'Adding examples…' : 'Start with useful examples'}
                </button>
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
                  href="/library/new"
                >
                  Save my own work
                </Link>
              </div>
            ) : null}

            {step.id === 'starter' && step.complete ? (
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
                href="/library"
              >
                Review the Library
              </Link>
            ) : null}

            {step.id === 'invite' && !step.complete && onInvite ? (
              <button
                className="mt-5 inline-flex min-h-11 items-center justify-center border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!usefulWorkReady}
                onClick={onInvite}
                type="button"
              >
                Invite a teammate
              </button>
            ) : null}

            {step.id === 'invite' && !step.complete && !onInvite ? (
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                Invitations become available in an organization workspace.
              </p>
            ) : null}

            {step.id === 'invite' && step.complete ? (
              <p className="mt-5 text-sm font-semibold text-[var(--success-strong,#1c6d31)]">
                A teammate can join you
              </p>
            ) : null}
          </section>
        ))}
      </div>

      {seedMessage ? (
        <div className="mt-5">
          <SurfaceNotice
            description={seedMessage}
            live
            title={seedState === 'error' ? 'Examples could not be added' : 'Your Library is ready'}
            tone={seedState === 'error' ? 'error' : 'success'}
          />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-6">
        {primaryStep ? (
          <p className="text-sm leading-7 text-[var(--muted)]">
            Complete “{primaryStep.title}” to make Home useful.
          </p>
        ) : (
          <Link
            className="inline-flex min-h-12 items-center justify-center bg-[var(--button-primary)] px-5 py-3 text-sm font-semibold text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)]"
            href="/"
            onClick={onFinish}
          >
            Go to Home
          </Link>
        )}
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]" href="/library">
          {usefulWorkReady ? 'Browse the Library' : 'Browse the empty Library'}
        </Link>
      </div>
    </div>
  );
}

export function GettingStartedScreen({
  authSurfaceState,
  diagnostic,
  signedIn,
  displayName,
  organizationName,
  hasTeammates = false,
  onInvite,
}: GettingStartedScreenProps) {
  const router = useRouter();
  const workspace = useWorkspace();
  const { isAuthenticated } = useConvexAuth();
  const [convexHandoffTimedOut, setConvexHandoffTimedOut] = useState(false);
  const [seedState, setSeedState] = useState<SeedState>('idle');
  const [seedMessage, setSeedMessage] = useState<string>();
  const convexSessionReady = convexEnabled ? Boolean(isAuthenticated) : true;
  const onboarding = useQuery(
    api.onboarding.getUserOnboardingState,
    convexEnabled && isAuthenticated ? {} : 'skip',
  );
  const library = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready' ? { scope: 'library', limit: 12 } : 'skip',
  );
  const markOnboardingStep = useMutation(api.onboarding.markOnboardingStep);
  const seedStarterLibrary = useMutation(api.workLibrary.seedStarterLibrary);
  const waitingForConvexHandoff =
    convexEnabled && authSurfaceState === 'ready' && signedIn && !isAuthenticated;

  useEffect(() => {
    if (!waitingForConvexHandoff) return;
    return startConvexAuthHandoffTimer(() => setConvexHandoffTimedOut(true));
  }, [waitingForConvexHandoff]);

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
    return <StableOpeningState title="Opening Roster" />;
  }

  if (viewState === 'signed_out' || viewState === 'clerk_failed') {
    return <SignedOutStart authSurfaceState={authSurfaceState} diagnostic={diagnostic} />;
  }

  if (viewState === 'convex_error') {
    return <ConvexHandoffRecovery />;
  }

  if (workspace.status === 'error') {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="font-heading text-4xl tracking-[-0.05em] text-[var(--ink)]">
          Your workspace needs attention
        </h1>
        <div className="mt-6">
          <SurfaceNotice
            description={workspace.error ?? 'Ask a workspace owner to check your membership.'}
            title="Roster could not open this workspace"
            tone="error"
          />
        </div>
      </div>
    );
  }

  if (
    viewState !== 'ready' ||
    onboarding === undefined ||
    workspace.status === 'bootstrapping' ||
    workspace.status === 'idle' ||
    library === undefined
  ) {
    return <StableOpeningState title="Preparing your workspace" />;
  }

  const finishOnboarding = () => {
    void markOnboardingStep({ step: 'onboarding_complete', completed: true });
  };
  const audience = resolveGettingStartedAudience(workspace.role);
  const firstApproved = library.items.find((item) => item.reviewState.includes('approved'));
  const firstTrustedHref = firstApproved ? `/library/${firstApproved.assetId}` : '/library';

  if (audience === 'teammate') {
    return (
      <TeammateStart
        canSave={workspace.role !== 'viewer'}
        displayName={displayName}
        firstTrustedHref={firstTrustedHref}
        onChoose={finishOnboarding}
      />
    );
  }

  const addStarterWork = async () => {
    setSeedState('saving');
    setSeedMessage(undefined);
    try {
      const result = await seedStarterLibrary({});
      setSeedState('saved');
      setSeedMessage(
        result.created > 0
          ? `${result.created} starter examples were added. You can review, edit, or archive them at any time.`
          : 'Your starter examples were already in the Library.',
      );
    } catch (error) {
      setSeedState('error');
      setSeedMessage(error instanceof Error ? error.message : 'Please try again in a moment.');
    }
  };

  return (
    <OwnerStart
      hasTeammates={hasTeammates}
      onFinish={finishOnboarding}
      onInvite={onInvite}
      onSeed={() => void addStarterWork()}
      organizationName={organizationName ?? workspace.name}
      seedMessage={seedMessage}
      seedState={seedState}
      usefulWorkReady={library.items.length > 0}
    />
  );
}
