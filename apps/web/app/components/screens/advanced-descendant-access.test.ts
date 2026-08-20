import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type RestrictedRole = 'curator' | 'contributor' | 'viewer';

const mocks = vi.hoisted(() => ({
  queryCalls: [] as Array<{ enabled: boolean }>,
  resourceCalls: [] as Array<{ enabled: boolean; path: string }>,
  authenticated: true,
  authLoading: false,
  role: 'contributor' as RestrictedRole,
  workspaceError: undefined as string | undefined,
  workspaceStatus: 'ready' as 'bootstrapping' | 'error' | 'ready',
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: mocks.authLoading }),
  useMutation: () => async () => undefined,
  useQuery: (_query: unknown, args: unknown) => {
    mocks.queryCalls.push({ enabled: args !== 'skip' });
    return undefined;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/advanced',
  useRouter: () => ({ push: () => undefined }),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: mocks.workspaceError,
    name: 'Maslow AI',
    role: mocks.role,
    status: mocks.workspaceStatus,
  }),
}));

vi.mock('@/lib/convex-client', () => ({ convexEnabled: true }));

vi.mock('@/lib/roster-client', () => ({
  rosterFetchEnvelope: async () => ({ data: {}, rosterStatus: 200, success: true }),
  useRosterResource: (path: string, enabled: boolean = true) => {
    mocks.resourceCalls.push({ enabled, path });
    return { data: null, error: null, loading: false, reload: () => undefined };
  },
}));

import { AgentDetailScreen } from './AgentDetailScreen';
import { AgentsScreen } from './AgentsScreen';
import { RunDetailScreen, SandboxedHtmlReport } from './RunDetailScreen';
import { RunsScreen } from './RunsScreen';
import { SettingsScreen } from './SettingsScreen';

type ScreenCase = {
  component: ComponentType<Record<string, never>>;
  hiddenContent: string;
  name: string;
};

const screenCases: ScreenCase[] = [
  {
    component: AgentsScreen,
    hiddenContent: 'Subagents and main agents in one navigation path',
    name: 'agent catalog',
  },
  {
    component: () => createElement(AgentDetailScreen, { agentId: 'agent-1', kind: 'main-agents' }),
    hiddenContent: 'Interactive checks',
    name: 'agent detail',
  },
  {
    component: RunsScreen,
    hiddenContent: 'Start orchestration',
    name: 'run history',
  },
  {
    component: () => createElement(RunDetailScreen, { executionId: 'run-1' }),
    hiddenContent: 'Execution summary',
    name: 'run detail',
  },
  {
    component: SettingsScreen,
    hiddenContent: 'Account and usage',
    name: 'technical settings',
  },
];

describe.each<RestrictedRole>(['curator', 'contributor', 'viewer'])(
  'Advanced descendants for a %s',
  (role) => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED = 'true';
      mocks.queryCalls = [];
      mocks.resourceCalls = [];
      mocks.authenticated = true;
      mocks.authLoading = false;
      mocks.role = role;
      mocks.workspaceError = undefined;
      mocks.workspaceStatus = 'ready';
    });

    it.each(screenCases)('keeps the $name route idle behind an owner/admin notice', ({
      component,
      hiddenContent,
    }) => {
      const html = renderToStaticMarkup(createElement(component));

      expect(html).toContain('Advanced access is limited to workspace owners and admins');
      expect(html).not.toContain(hiddenContent);
      expect(mocks.queryCalls.every((call) => !call.enabled)).toBe(true);
      expect(mocks.resourceCalls.every((call) => !call.enabled)).toBe(true);
    });
  },
);

describe('Advanced descendant workspace recovery', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED = 'true';
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.queryCalls = [];
    mocks.resourceCalls = [];
    mocks.role = 'contributor';
    mocks.workspaceError = 'Roster could not finish the secure workspace connection.';
    mocks.workspaceStatus = 'error';
  });

  it.each(screenCases)('shows recovery before the signed-out $name route', ({ component }) => {
    const html = renderToStaticMarkup(createElement(component));

    expect(html).toContain('Advanced access needs attention');
    expect(html).toContain('secure workspace connection');
    expect(html).not.toContain('Sign in');
    expect(mocks.queryCalls.every((call) => !call.enabled)).toBe(true);
    expect(mocks.resourceCalls.every((call) => !call.enabled)).toBe(true);
  });
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED;
});

describe('Advanced HTML reports', () => {
  it('isolates backend HTML in a script-free, network-blocked iframe', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxedHtmlReport, {
        html: '<img src="https://attacker.test/leak"><script>window.top.alert(1)</script>',
      }),
    );

    expect(html).toContain('<iframe');
    expect(html).toContain('sandbox=""');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('default-src &#x27;none&#x27;');
  });
});
