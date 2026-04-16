'use client';

import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import { ActionButton, Panel } from './primitives';

export function AuthSurfaceNotice({
  authSurfaceState,
  diagnostic,
  retryLabel = 'Reload and retry',
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
  retryLabel?: string;
}) {
  if (authSurfaceState === 'ready') {
    return null;
  }

  if (authSurfaceState === 'loading') {
    return (
      <Panel
        subtitle="Roster is waiting for Clerk to finish loading before any hosted sign-in or sign-up UI becomes interactive."
        title="Loading hosted auth"
        tone="tech"
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          The signed-out experience stays visible while the browser finishes loading Clerk. If this
          takes more than a moment, reload the page and check whether your browser is blocking the
          Clerk script domain.
        </p>
      </Panel>
    );
  }

  if (authSurfaceState === 'failed') {
    return (
      <Panel
        subtitle="Hosted auth failed to initialize in this browser session, so the app dropped back to the signed-out beta surface instead of leaving a broken authenticated shell."
        title="Authentication temporarily unavailable"
        tone="attention"
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-[var(--muted)]">
            Likely causes include Clerk JS being blocked in the browser, a publishable and secret
            key mismatch, or a JWT issuer/template mismatch between Clerk and Convex.
          </p>
          {diagnostic ? (
            <div className="rounded-[20px] border border-[var(--attention-soft)] bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--ink)]">
              <p className="font-semibold">Local auth warning</p>
              <p className="mt-1">{diagnostic.message}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={() => window.location.reload()} tone="dark">
              {retryLabel}
            </ActionButton>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      subtitle="The app found no Clerk configuration in this environment, so hosted auth remains unavailable until local env values are added."
      title="Clerk not configured"
      tone="attention"
    >
      <p className="text-sm leading-7 text-[var(--muted)]">
        Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in
        `apps/web/.env.local`, then restart the Next dev server.
      </p>
    </Panel>
  );
}
