import { describe, expect, it, vi } from 'vitest';
import {
  friendlyWorkspaceBootstrapError,
  resolveWorkspaceBootstrapTarget,
  startWorkspaceHandoffTimer,
} from './workspace-bootstrap';

describe('friendlyWorkspaceBootstrapError', () => {
  it('never exposes Convex request diagnostics from workspace setup', () => {
    const message = friendlyWorkspaceBootstrapError(
      new Error(
        '[CONVEX M(workLibrary:bootstrapWorkspace)] [Request ID: secret-42] Server Error at convex/workLibrary.ts:410',
      ),
    );

    expect(message).toBe('Roster could not verify your workspace access. Reload and try again.');
    expect(message).not.toMatch(/convex|request id|bootstrapWorkspace|workLibrary\.ts/i);
  });
});

describe('resolveWorkspaceBootstrapTarget', () => {
  it('waits for Clerk before choosing a workspace scope', () => {
    expect(
      resolveWorkspaceBootstrapTarget({
        clerkLoaded: false,
        signedIn: false,
        convexAuthenticated: false,
      }),
    ).toEqual({ phase: 'waiting_for_session' });
  });

  it('uses a personal workspace only after a signed-in session is loaded', () => {
    expect(
      resolveWorkspaceBootstrapTarget({
        clerkLoaded: true,
        signedIn: true,
        convexAuthenticated: true,
      }),
    ).toEqual({ phase: 'ready', scopeKey: 'personal' });
  });

  it('keeps an active organization as the bootstrap scope', () => {
    expect(
      resolveWorkspaceBootstrapTarget({
        clerkLoaded: true,
        signedIn: true,
        convexAuthenticated: true,
        organizationId: 'org_maslow',
        authorizationKey: 'session_1:org:admin',
      }),
    ).toEqual({ phase: 'ready', scopeKey: 'org_maslow:session_1:org:admin' });
  });

  it('changes scope when the trusted Clerk session role changes', () => {
    const base = {
      clerkLoaded: true,
      signedIn: true,
      convexAuthenticated: true,
      organizationId: 'org_maslow',
    };

    expect(
      resolveWorkspaceBootstrapTarget({ ...base, authorizationKey: 'session_1:org:curator' }),
    ).not.toEqual(
      resolveWorkspaceBootstrapTarget({ ...base, authorizationKey: 'session_1:org:viewer' }),
    );
  });

  it('does not bootstrap until Convex has the authenticated Clerk token', () => {
    expect(
      resolveWorkspaceBootstrapTarget({
        clerkLoaded: true,
        signedIn: true,
        convexAuthenticated: false,
        organizationId: 'org_maslow',
      }),
    ).toEqual({ phase: 'waiting_for_convex' });
  });
});

describe('startWorkspaceHandoffTimer', () => {
  it('surfaces a recovery state after the secure handoff stops responding', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const cancel = startWorkspaceHandoffTimer(onTimeout);
    vi.advanceTimersByTime(7_999);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledOnce();

    cancel();
    vi.useRealTimers();
  });

  it('cleans up the pending recovery timer when the handoff completes', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const cancel = startWorkspaceHandoffTimer(onTimeout);
    cancel();
    vi.runAllTimers();

    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
