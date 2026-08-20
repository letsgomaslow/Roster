import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  convexAuthenticated: true,
  queryResults: [] as unknown[],
  role: 'contributor' as 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer',
  workspaceError: null as string | null,
  workspaceStatus: 'ready' as 'bootstrapping' | 'error' | 'idle' | 'ready',
}));

vi.mock('convex/react', () => ({
  ConvexReactClient: class ConvexReactClient {},
  useConvex: () => ({ query: async () => null }),
  useConvexAuth: () => ({ isAuthenticated: mocks.convexAuthenticated }),
  useMutation: () => async () => ({ created: 12, existing: 0 }),
  useQuery: () => mocks.queryResults.shift(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => undefined }),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: mocks.workspaceError,
    name: 'Maslow AI',
    role: mocks.role,
    status: mocks.workspaceStatus,
    workspaceId: 'workspace-1',
  }),
}));

vi.mock('@/app/components/control-plane/AuthCtas', () => ({
  AuthCtas: () => createElement('div', null, 'Sign in'),
}));

vi.mock('@/app/components/control-plane/AuthSurfaceNotice', () => ({
  AuthSurfaceNotice: () => null,
}));

import { OnboardingChecklist } from '@/app/components/control-plane/OnboardingChecklist';
import { GettingStartedScreen } from './GettingStartedScreen';
import { WorkLibraryHomeScreen } from './WorkLibraryHomeScreen';

const approvedItem = {
  assetId: 'approved-asset',
  jobKey: 'create-proposal',
  kind: 'prompt',
  lastVerifiedAt: 1_700_000_000_000,
  ownerUserId: 'user-1',
  purpose: 'Turn discovery notes into a client-ready proposal.',
  reviewState: 'team_approved',
  teamKey: 'client-delivery',
  title: 'Proposal drafter',
  updatedAt: 1_700_000_000_000,
  versionNumber: 2,
  visibility: 'team',
};

beforeEach(() => {
  mocks.convexAuthenticated = true;
  mocks.queryResults = [];
  mocks.role = 'contributor';
  mocks.workspaceError = null;
  mocks.workspaceStatus = 'ready';
});

describe('GettingStartedScreen', () => {
  it('takes an invited teammate directly to a useful first action', () => {
    mocks.queryResults = [
      { onboardingCompletedAt: null },
      { items: [approvedItem], total: 1 },
    ];

    const html = renderToStaticMarkup(
      createElement(GettingStartedScreen, {
        authSurfaceState: 'ready',
        displayName: 'Alex',
        signedIn: true,
      }),
    );

    expect(html).toContain('Find trusted work');
    expect(html).toContain('See the shared outcome first');
    expect(html).toContain('Open shared work');
    expect(html).toContain('Save my work');
    expect(html).not.toMatch(/MCP|health|orchestration/i);
  });

  it('keeps viewer onboarding focused on work they can use', () => {
    mocks.role = 'viewer';
    mocks.queryResults = [
      { onboardingCompletedAt: null },
      { items: [approvedItem], total: 1 },
    ];

    const html = renderToStaticMarkup(
      createElement(GettingStartedScreen, {
        authSurfaceState: 'ready',
        displayName: 'Alex',
        signedIn: true,
      }),
    );

    expect(html).toContain('Use trusted work');
    expect(html).not.toContain('Save my work');
    expect(html).not.toContain('href="/library/new"');
  });

  it('gives an owner a workspace, starter, and optional invite progression', () => {
    mocks.role = 'owner';
    mocks.queryResults = [
      { onboardingCompletedAt: null },
      { items: [], total: 0 },
    ];

    const html = renderToStaticMarkup(
      createElement(GettingStartedScreen, {
        authSurfaceState: 'ready',
        organizationName: 'Maslow AI',
        signedIn: true,
      }),
    );

    expect(html).toContain('Start your library');
    expect(html).toContain('Workspace ready');
    expect(html).toContain('Save first work');
    expect(html).toContain('Invite a teammate');
    expect(html).toContain('Optional');
    expect(html).not.toMatch(/MCP|health|orchestration/i);
  });

  it('shows a workspace error before skipped onboarding queries can look like loading', () => {
    mocks.queryResults = [undefined, undefined];
    mocks.workspaceError = 'Your organization membership could not be verified.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(
      createElement(GettingStartedScreen, {
        authSurfaceState: 'ready',
        signedIn: true,
      }),
    );

    expect(html).toContain('Roster could not open this workspace');
    expect(html).toContain('Your organization membership could not be verified.');
    expect(html).not.toContain('Preparing your workspace');
  });
});

describe('WorkLibraryHomeScreen', () => {
  it('is an outcome gallery with only truthful work sections', () => {
    mocks.queryResults = [
      { items: [approvedItem], total: 1 },
      {
        items: [
          {
            ...approvedItem,
            assetId: 'draft-asset',
            reviewState: 'draft',
            title: 'Quarterly review draft',
          },
        ],
        total: 1,
      },
    ];

    const html = renderToStaticMarkup(createElement(WorkLibraryHomeScreen));

    expect(html).toContain('What would you like to get done?');
    expect(html).toContain('Search by outcome, team, or task');
    expect(html).toContain('name="q"');
    expect(html).toContain('Continue working');
    expect(html).toContain('Favorites');
    expect(html).toContain('Recently approved');
    expect(html).toContain('Proposal drafter');
    expect(html).toContain('Quarterly review draft');
    expect(html).toContain('Approved');
    expect(html).not.toContain('Team approved');
    expect(html).toContain('Private draft');
    expect(html).toContain('Version 2');
    expect(html).toContain('rounded-[var(--maslow-radius-capsule)]');
    expect(html).not.toMatch(/roadmap|lighthouse|in progress|simulated/i);
  });

  it('omits the description element when saved work has no purpose', () => {
    const purposeLessItem = { ...approvedItem, purpose: undefined };
    mocks.queryResults = [
      { items: [purposeLessItem], total: 1 },
      { items: [], total: 0 },
    ];

    const html = renderToStaticMarkup(createElement(WorkLibraryHomeScreen));

    expect(html).toContain('Proposal drafter');
    expect(html).not.toMatch(/undefined|uncategorized/i);
    expect(html).not.toMatch(/Proposal drafter<\/h3><p/);
  });

  it('keeps long Markdown card copy bounded without nesting another control', () => {
    const longCard = {
      ...approvedItem,
      assetId: 'long-card',
      purpose: [
        '### Client outcome',
        '',
        'Use **verified evidence** to create a [renewal brief](https://example.com/private).',
        'Keep every fact attributable. '.repeat(30),
        'HOME-DESCRIPTION-TAIL-MUST-NOT-RENDER',
      ].join('\n'),
      title: `Quarterly-${'review'.repeat(40)}`,
    };
    mocks.queryResults = [
      { items: [longCard], total: 1 },
      { items: [], total: 0 },
    ];

    const html = renderToStaticMarkup(createElement(WorkLibraryHomeScreen));
    const cardContents = html.match(
      /<a[^>]*href="\/library\/long-card"[^>]*>([\s\S]*?)<\/a>/,
    )?.[1];

    expect(cardContents).toBeDefined();
    expect(cardContents).toContain('line-clamp-2');
    expect(cardContents).toContain('line-clamp-3');
    expect(cardContents?.match(/\[overflow-wrap:anywhere\]/g)).toHaveLength(2);
    expect(cardContents).toContain('Client outcome Use verified evidence to create a renewal brief.');
    expect(cardContents).not.toContain('https://example.com/private');
    expect(cardContents).not.toContain('HOME-DESCRIPTION-TAIL-MUST-NOT-RENDER');
    expect(cardContents).not.toMatch(/<(?:a|button|input|select|textarea)\b/);
  });

  it('replaces raw workspace diagnostics with fixed recovery copy', () => {
    mocks.queryResults = [undefined, undefined];
    mocks.workspaceError =
      'Uncaught Error: [CONVEX Q(workLibrary:listLibrary)] Request ID: req-home-secret at convex/workLibrary.ts:1080';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(WorkLibraryHomeScreen));

    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toMatch(/convex|listLibrary|request id|req-home-secret|workLibrary\.ts/i);
  });
});

describe('OnboardingChecklist', () => {
  it('keeps the legacy dashboard module focused on first value too', () => {
    mocks.queryResults = [
      {
        checklistDismissedAt: null,
        onboardingCompletedAt: null,
      },
    ];

    const html = renderToStaticMarkup(createElement(OnboardingChecklist, { forceVisible: true }));

    expect(html).toContain('Start with something useful');
    expect(html).toContain('Use trusted work');
    expect(html).not.toMatch(/MCP|health|orchestration/i);
  });
});
