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
        subtitle="Your sign-in session is still loading. The page will stay in place while it finishes."
        title="Getting Roster ready"
        tone="tech"
      >
        <p className="text-sm leading-7 text-[var(--muted)]">
          This normally takes only a moment. If the page does not continue, reload it and try again.
        </p>
      </Panel>
    );
  }

  if (authSurfaceState === 'failed') {
    return (
      <Panel
        subtitle="Roster could not complete sign-in in this browser session. Your current page and work remain unchanged."
        title="Sign-in is temporarily unavailable"
        tone="attention"
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-[var(--muted)]">
            Reload the page to try again. If the problem continues, ask your workspace administrator
            to check the sign-in service.
          </p>
          {diagnostic ? (
            <details className="border border-[var(--attention-soft)] bg-white px-4 py-3 text-sm leading-6 text-[var(--ink)]">
              <summary className="cursor-pointer font-semibold">Technical details</summary>
              <p className="mt-2">{diagnostic.message}</p>
            </details>
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
      subtitle="This environment does not have a sign-in service configured yet."
      title="Sign-in is not configured"
      tone="attention"
    >
      <p className="text-sm leading-7 text-[var(--muted)]">
        Ask the person running this Roster environment to complete the authentication setup, then
        reload the page.
      </p>
    </Panel>
  );
}
