import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticated: true,
  authLoading: false,
  resourceCalls: [] as Array<{ enabled: boolean; path: string }>,
  workspaceError: undefined as string | undefined,
  workspaceStatus: 'ready' as 'bootstrapping' | 'error' | 'ready',
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: mocks.authenticated,
    isLoading: mocks.authLoading,
  }),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: mocks.workspaceError,
    name: 'Maslow AI',
    role: 'owner',
    status: mocks.workspaceStatus,
  }),
}));

vi.mock('@/lib/roster-client', () => ({
  useRosterResource: (path: string, enabled: boolean) => {
    mocks.resourceCalls.push({ enabled, path });
    return { data: null, error: null, loading: false, reload: () => undefined };
  },
}));

import { IntegrationsScreen } from './IntegrationsScreen';

describe('IntegrationsScreen', () => {
  beforeEach(() => {
    mocks.authenticated = true;
    mocks.authLoading = false;
    mocks.resourceCalls = [];
    mocks.workspaceError = undefined;
    mocks.workspaceStatus = 'ready';
  });

  it('keeps legacy MCP checks idle until technical diagnostics are opened', () => {
    const html = renderToStaticMarkup(createElement(IntegrationsScreen));

    expect(html).toContain('Connection URL isn’t available in this preview yet');
    expect(mocks.resourceCalls).toEqual([
      { enabled: false, path: '/api/roster/mcp/tools' },
      { enabled: false, path: '/api/roster/health' },
    ]);
    expect(html).not.toContain('@maslowai/roster');
  });

  it('shows shared workspace recovery instead of a signed-out screen after handoff timeout', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.workspaceError = 'Roster could not finish the secure workspace connection.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(IntegrationsScreen));

    expect(html).toContain('Setup Center needs attention');
    expect(html).toContain('secure workspace connection');
    expect(html).not.toContain('Sign in');
  });
});
