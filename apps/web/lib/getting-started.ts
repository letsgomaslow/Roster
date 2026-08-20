import type { AuthSurfaceState } from './auth-surface';
import type { WorkspaceRole } from './work-library-navigation';

export type GettingStartedViewState =
  | 'clerk_loading'
  | 'clerk_failed'
  | 'signed_out'
  | 'convex_loading'
  | 'convex_error'
  | 'ready';

export type GettingStartedAudience = 'owner' | 'teammate';

export function resolveGettingStartedAudience(
  role?: WorkspaceRole,
): GettingStartedAudience {
  return role === 'owner' ? 'owner' : 'teammate';
}

export function resolveGettingStartedViewState({
  authSurfaceState,
  signedIn,
  convexAuthenticated,
  convexHandoffTimedOut,
}: {
  authSurfaceState: AuthSurfaceState;
  signedIn: boolean;
  convexAuthenticated: boolean;
  convexHandoffTimedOut: boolean;
}): GettingStartedViewState {
  if (authSurfaceState === 'loading') {
    return 'clerk_loading';
  }

  if (authSurfaceState === 'failed') {
    return 'clerk_failed';
  }

  if (authSurfaceState === 'disabled' || !signedIn) {
    return 'signed_out';
  }

  if (!convexAuthenticated) {
    return convexHandoffTimedOut ? 'convex_error' : 'convex_loading';
  }

  return 'ready';
}
