export type WorkspaceBootstrapTarget =
  | { phase: 'waiting_for_session' }
  | { phase: 'signed_out' }
  | { phase: 'waiting_for_convex' }
  | { phase: 'ready'; scopeKey: string };

export const WORKSPACE_HANDOFF_TIMEOUT_MS = 8_000;

export function friendlyWorkspaceBootstrapError(error: unknown): string {
  void error;
  return 'Roster could not verify your workspace access. Reload and try again.';
}

type WorkspaceTimer = ReturnType<typeof setTimeout>;
type WorkspaceTimerSetter = (callback: () => void, timeoutMs: number) => WorkspaceTimer;
type WorkspaceTimerClearer = (timer: WorkspaceTimer) => void;

export function startWorkspaceHandoffTimer(
  onTimeout: () => void,
  setTimer: WorkspaceTimerSetter = setTimeout,
  clearTimer: WorkspaceTimerClearer = clearTimeout,
): () => void {
  const timer = setTimer(onTimeout, WORKSPACE_HANDOFF_TIMEOUT_MS);
  return () => clearTimer(timer);
}

export function resolveWorkspaceBootstrapTarget({
  clerkLoaded,
  signedIn,
  convexAuthenticated,
  organizationId,
  authorizationKey,
}: {
  clerkLoaded: boolean;
  signedIn: boolean;
  convexAuthenticated: boolean;
  organizationId?: string;
  authorizationKey?: string;
}): WorkspaceBootstrapTarget {
  if (!clerkLoaded) return { phase: 'waiting_for_session' };
  if (!signedIn) return { phase: 'signed_out' };
  if (!convexAuthenticated) return { phase: 'waiting_for_convex' };
  const workspaceKey = organizationId ?? 'personal';
  return {
    phase: 'ready',
    scopeKey: authorizationKey ? `${workspaceKey}:${authorizationKey}` : workspaceKey,
  };
}
