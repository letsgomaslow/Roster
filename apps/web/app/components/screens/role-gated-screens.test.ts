import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticated: false,
  authLoading: false,
  role: undefined as 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer' | undefined,
  workspaceError: undefined as string | undefined,
  workspaceStatus: 'bootstrapping' as 'idle' | 'bootstrapping' | 'error' | 'ready',
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: mocks.authenticated,
    isLoading: mocks.authLoading,
  }),
  useMutation: () => async () => ({}),
  useQuery: () => [],
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: mocks.workspaceError,
    name: undefined,
    role: mocks.role,
    status: mocks.workspaceStatus,
  }),
}));

import { AdvancedScreen } from './AdvancedScreen';
import { WorkspaceAdminScreen } from './WorkspaceAdminScreen';

describe('role-gated screens', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED = 'true';
    mocks.authenticated = false;
    mocks.authLoading = false;
    mocks.role = undefined;
    mocks.workspaceError = undefined;
    mocks.workspaceStatus = 'bootstrapping';
  });

  it('keeps workspace administration behind sign-in while the workspace is unresolved', () => {
    mocks.workspaceStatus = 'idle';
    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Sign in to manage Library settings');
    expect(html).not.toContain('Add starter Library');
  });

  it('keeps the technical layer behind sign-in while the workspace is unresolved', () => {
    mocks.workspaceStatus = 'idle';
    const html = renderToStaticMarkup(createElement(AdvancedScreen));

    expect(html).toContain('Sign in to open this advanced workspace area');
    expect(html).not.toContain('Open agent catalog');
  });

  it('does not flash workspace admin controls before the signed-in role resolves', () => {
    mocks.authenticated = true;

    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Checking workspace access');
    expect(html).not.toContain('Add starter Library');
  });

  it('does not flash Advanced links before the signed-in role resolves', () => {
    mocks.authenticated = true;

    const html = renderToStaticMarkup(createElement(AdvancedScreen));

    expect(html).toContain('Checking Advanced access');
    expect(html).not.toContain('Open agent catalog');
  });

  it('shows shared workspace recovery before the signed-out admin route', () => {
    mocks.authLoading = true;
    mocks.workspaceError = 'Roster could not finish the secure workspace connection.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Workspace access needs attention');
    expect(html).not.toContain('Sign in');
  });

  it('lets curators organize Library labels without exposing owner controls', () => {
    mocks.authenticated = true;
    mocks.role = 'curator';
    mocks.workspaceStatus = 'ready';

    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Library organization');
    expect(html).not.toContain('People and access');
    expect(html).not.toContain('Starter Library');
    expect(html).not.toContain('Connections');
    expect(html).not.toContain('Workspace data boundary');
  });
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED;
});
