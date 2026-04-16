'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '@convex/_generated/api';
import { convexEnabled } from '@/lib/convex-client';
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  shouldShowOnboardingModule,
} from '@/lib/onboarding';
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
  snapshot,
  dashboard,
  forceVisible = false,
  showDismiss = false,
  showContinue = false,
  title = 'Finish setup and reach a working control plane',
  subtitle = 'The public beta should guide a new user from account creation to a working prompt and a real run.',
}: OnboardingChecklistProps) {
  const { isAuthenticated } = useConvexAuth();
  const onboarding = useQuery(
    api.onboarding.getUserOnboardingState,
    convexEnabled && isAuthenticated ? {} : 'skip',
  );
  const markOnboardingStep = useMutation(api.onboarding.markOnboardingStep);
  const dismissOnboarding = useMutation(api.onboarding.dismissOnboarding);

  const steps = buildOnboardingSteps({
    profile: onboarding ?? null,
    snapshot: snapshot ?? null,
    dashboard: dashboard ?? null,
  });
  const completed = isOnboardingComplete(steps) || Boolean(onboarding?.onboardingCompletedAt);
  const isVisible = forceVisible || shouldShowOnboardingModule(onboarding ?? null, steps);

  useEffect(() => {
    if (!convexEnabled || !isAuthenticated || !onboarding) return;

    for (const step of steps) {
      if (step.completionSource !== 'live' || !step.complete) continue;
      const fieldMap = {
        verify_setup: onboarding.checklistStepStates.verifySetupCompletedAt,
        create_prompt: onboarding.checklistStepStates.createPromptCompletedAt,
        run_orchestration: onboarding.checklistStepStates.runOrchestrationCompletedAt,
      } as const;
      if (step.id === 'connect_host') continue;
      if (!fieldMap[step.id]) {
        void markOnboardingStep({ step: step.id, completed: true });
      }
    }

    if (steps.every((step) => step.complete) && !onboarding.onboardingCompletedAt) {
      void markOnboardingStep({ step: 'onboarding_complete', completed: true });
    }
  }, [isAuthenticated, markOnboardingStep, onboarding, steps]);

  if (!isAuthenticated || !isVisible) {
    return null;
  }

  return (
    <Panel
      action={
        <Badge tone={completed ? 'success' : 'strategy'}>
          {completed ? 'Ready for dashboard' : 'Beta checklist'}
        </Badge>
      }
      subtitle={subtitle}
      title={title}
      tone="tech"
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {steps.map((step, index) => (
          <section
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-card)]"
            key={step.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] text-sm font-semibold text-[var(--ink)]">
                  0{index + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{step.description}</p>
                </div>
              </div>
              <Badge tone={step.complete ? 'success' : 'warning'}>
                {step.complete ? 'Complete' : 'Pending'}
              </Badge>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                href={step.href}
              >
                {step.ctaLabel}
              </Link>
              {step.id === 'connect_host' && !step.complete ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                  onClick={() => void markOnboardingStep({ step: 'connect_host', completed: true })}
                  type="button"
                >
                  I connected a host
                </button>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {(showDismiss || showContinue) && !completed ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <p aria-live="polite" className="text-sm text-[var(--muted)]">
            Finish the checklist or continue anyway. The incomplete state will remain visible on the
            dashboard until you dismiss it.
          </p>
          <div className="flex flex-wrap gap-3">
            {showDismiss ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                onClick={() => void dismissOnboarding()}
                type="button"
              >
                Dismiss checklist
              </button>
            ) : null}
            {showContinue ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                href="/"
              >
                Continue to dashboard
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {completed && showContinue ? (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <p className="text-sm text-[var(--muted)]">
            Setup is complete. The control plane can now act as the default landing surface.
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
            href="/"
          >
            Continue to dashboard
          </Link>
        </div>
      ) : null}
    </Panel>
  );
}
