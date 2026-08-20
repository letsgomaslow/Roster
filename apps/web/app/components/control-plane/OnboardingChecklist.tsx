'use client';

import Link from 'next/link';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { convexEnabled } from '@/lib/convex-client';
import { getFirstUseChoices } from '@/lib/onboarding';
import type { DashboardApiPayload, DashboardSnapshot } from '@/lib/roster-types';
import { Badge, Panel } from './primitives';

type OnboardingChecklistProps = {
  snapshot?: DashboardSnapshot | null;
  dashboard?: DashboardApiPayload | null;
  forceVisible?: boolean;
  showDismiss?: boolean;
  showContinue?: boolean;
  title?: string;
  subtitle?: string;
};

export function OnboardingChecklist({
  forceVisible = false,
  showDismiss = false,
  showContinue = false,
  title = 'Start with something useful',
  subtitle = 'Choose the path that gets you to useful team work fastest. You can explore setup later.',
}: OnboardingChecklistProps) {
  const { isAuthenticated } = useConvexAuth();
  const onboarding = useQuery(
    api.onboarding.getUserOnboardingState,
    convexEnabled && isAuthenticated ? {} : 'skip',
  );
  const markOnboardingStep = useMutation(api.onboarding.markOnboardingStep);
  const dismissOnboarding = useMutation(api.onboarding.dismissOnboarding);
  const completed = Boolean(onboarding?.onboardingCompletedAt);
  const dismissed = Boolean(onboarding?.checklistDismissedAt);
  const visible = forceVisible || (!completed && !dismissed);

  if (!isAuthenticated || !visible) {
    return null;
  }

  if (onboarding === undefined) {
    return (
      <Panel
        action={<Badge tone="info">Preparing</Badge>}
        subtitle="We’re opening the shortest path to your team’s useful work."
        title="Getting your Library ready"
        tone="strategy"
      >
        <p aria-live="polite" className="min-h-16 text-sm leading-7 text-[var(--muted)]">
          Your workspace will stay on this page until your choices are ready.
        </p>
      </Panel>
    );
  }

  const finishOnboarding = () => {
    void markOnboardingStep({ step: 'onboarding_complete', completed: true });
  };

  return (
    <Panel
      action={<Badge tone="strategy">First useful action</Badge>}
      subtitle={subtitle}
      title={title}
      tone="strategy"
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {getFirstUseChoices().map((choice) => (
          <section
            className="flex min-h-48 flex-col border border-[var(--line)] bg-[var(--panel)] p-5"
            key={choice.id}
          >
            <h3 className="text-base font-semibold text-[var(--ink)]">{choice.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">
              {choice.description}
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)]"
              href={choice.href}
              onClick={finishOnboarding}
            >
              {choice.actionLabel}
            </Link>
          </section>
        ))}
      </div>

      {showDismiss || showContinue ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <p className="text-sm text-[var(--muted)]">
            You can come back to these choices from Home at any time.
          </p>
          <div className="flex flex-wrap gap-3">
            {showDismiss ? (
              <button
                className="inline-flex min-h-11 items-center justify-center border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
                onClick={() => void dismissOnboarding()}
                type="button"
              >
                Hide this guide
              </button>
            ) : null}
            {showContinue ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
                href="/"
                onClick={finishOnboarding}
              >
                Go to Home
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
