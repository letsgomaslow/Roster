import { describe, expect, it } from 'vitest';
import { resolveGettingStartedViewState } from './getting-started';

describe('resolveGettingStartedViewState', () => {
  it('holds the page in loading while Clerk is still resolving the browser session', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'loading',
        signedIn: false,
        convexAuthenticated: false,
        convexHandoffTimedOut: false,
      }),
    ).toBe('clerk_loading');
  });

  it('shows the signed-out path once auth has loaded and no session exists', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'disabled',
        signedIn: false,
        convexAuthenticated: false,
        convexHandoffTimedOut: false,
      }),
    ).toBe('signed_out');
  });

  it('keeps the setup screen in a non-blank loading state while Convex auth catches up', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'ready',
        signedIn: true,
        convexAuthenticated: false,
        convexHandoffTimedOut: false,
      }),
    ).toBe('convex_loading');
  });

  it('exposes an auth recovery state if Convex auth does not arrive in time', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'ready',
        signedIn: true,
        convexAuthenticated: false,
        convexHandoffTimedOut: true,
      }),
    ).toBe('convex_error');
  });

  it('falls back to a signed-out recovery state when Clerk bootstrap fails', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'failed',
        signedIn: false,
        convexAuthenticated: false,
        convexHandoffTimedOut: false,
      }),
    ).toBe('clerk_failed');
  });

  it('renders the checklist once Clerk and Convex auth are both ready', () => {
    expect(
      resolveGettingStartedViewState({
        authSurfaceState: 'ready',
        signedIn: true,
        convexAuthenticated: true,
        convexHandoffTimedOut: false,
      }),
    ).toBe('ready');
  });
});
