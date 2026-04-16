import type { AuthSurfaceState } from './auth-surface';

export type GettingStartedViewState =
  | 'clerk_loading'
  | 'clerk_failed'
  | 'signed_out'
  | 'convex_loading'
  | 'convex_error'
  | 'ready';

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
