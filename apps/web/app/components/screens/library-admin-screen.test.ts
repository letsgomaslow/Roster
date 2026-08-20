import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  authenticated: true,
  authLoading: false,
  library: { items: [] as Array<Record<string, unknown>>, total: 0 } as
    | { items: Array<Record<string, unknown>>; total: number }
    | undefined,
  role: 'curator' as 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer',
  taxonomy: [] as
    | Array<{
        key: string;
        kind: 'team' | 'work_type';
        label: string;
        sortOrder: number;
        status: 'active' | 'archived';
        termId: string;
      }>
    | undefined,
  workspaceError: null as string | null,
  workspaceStatus: 'ready' as 'bootstrapping' | 'error' | 'ready',
}));

vi.mock('@convex/_generated/api', () => ({
  api: {
    workLibrary: {
      createTaxonomyTerm: 'workLibrary.createTaxonomyTerm',
      listLibrary: 'workLibrary.listLibrary',
      listTaxonomyTerms: 'workLibrary.listTaxonomyTerms',
      seedStarterLibrary: 'workLibrary.seedStarterLibrary',
      updateTaxonomyTerm: 'workLibrary.updateTaxonomyTerm',
    },
  },
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: state.authenticated,
    isLoading: state.authLoading,
  }),
  useMutation: () => async () => ({}),
  useQuery: (reference: string) =>
    reference === 'workLibrary.listTaxonomyTerms' ? state.taxonomy : state.library,
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: state.workspaceError,
    name: 'Maslow AI',
    role: state.role,
    status: state.workspaceStatus,
    workspaceId: 'workspace-1',
  }),
}));

import { LibraryScreen } from './LibraryScreen';
import { WorkspaceAdminScreen } from './WorkspaceAdminScreen';

const activeTerms = [
  {
    key: 'client-delivery',
    kind: 'team' as const,
    label: 'Enterprise advisory',
    sortOrder: 0,
    status: 'active' as const,
    termId: 'team-1',
  },
  {
    key: 'create-proposal',
    kind: 'work_type' as const,
    label: 'Develop win themes',
    sortOrder: 0,
    status: 'active' as const,
    termId: 'work-1',
  },
  {
    key: 'marketing',
    kind: 'team' as const,
    label: 'Archived marketing',
    sortOrder: 1,
    status: 'archived' as const,
    termId: 'team-2',
  },
];

beforeEach(() => {
  state.authenticated = true;
  state.authLoading = false;
  state.library = { items: [], total: 0 };
  state.role = 'curator';
  state.taxonomy = [...activeTerms];
  state.workspaceError = null;
  state.workspaceStatus = 'ready';
});

describe('LibraryScreen workspace taxonomy', () => {
  it.each([
    {
      library: {
        items: [
          {
            assetId: 'asset-loading',
            jobKey: 'create-proposal',
            kind: 'prompt',
            lastVerifiedAt: null,
            ownerUserId: 'user-1',
            reviewState: 'team_approved',
            teamKey: 'client-delivery',
            title: 'Should not appear early',
            updatedAt: 1_700_000_000_000,
            versionNumber: 1,
            visibility: 'team',
          },
        ],
        total: 1,
      },
      name: 'Library data resolves first',
      taxonomy: undefined,
    },
    {
      library: undefined,
      name: 'taxonomy data resolves first',
      taxonomy: activeTerms,
    },
  ])('keeps filters and cards stable when $name', ({ library, taxonomy }) => {
    state.library = library;
    state.taxonomy = taxonomy;

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Loading useful work');
    expect(html).not.toContain('Should not appear early');
    expect(html).not.toContain('Enterprise advisory');
    expect(html).not.toContain('<select');
  });

  it('uses current active workspace labels for filters and cards', () => {
    state.library = {
      items: [
        {
          assetId: 'asset-1',
          jobKey: 'create-proposal',
          kind: 'prompt',
          lastVerifiedAt: null,
          ownerUserId: 'user-1',
          purpose: 'Build a stronger proposal.',
          reviewState: 'team_approved',
          teamKey: 'client-delivery',
          title: 'Proposal helper',
          updatedAt: 1_700_000_000_000,
          versionNumber: 2,
          visibility: 'team',
        },
      ],
      total: 1,
    };

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Enterprise advisory');
    expect(html).toContain('Develop win themes');
    expect(html).toContain('>AI work</span>');
    expect(html).not.toContain('>Prompt</span>');
    expect(html).not.toContain('Client delivery');
    expect(html).not.toContain('Create a proposal');
    expect(html).not.toContain('Archived marketing');
  });

  it('renders a bounded plain-text preview for a long Markdown description', () => {
    state.library = {
      items: [
        {
          assetId: 'asset-long-description',
          kind: 'prompt',
          lastVerifiedAt: null,
          ownerUserId: 'user-1',
          purpose: [
            '## Proposal outcome',
            '',
            'Turn **discovery notes** into a [client-ready proposal](https://example.com/private).',
            'Keep the evidence exact. '.repeat(30),
            'DESCRIPTION-TAIL-MUST-NOT-RENDER',
          ].join('\n'),
          reviewState: 'team_approved',
          title: 'Proposal helper',
          updatedAt: 1_700_000_000_000,
          versionNumber: 2,
          visibility: 'team',
        },
      ],
      total: 1,
    };

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Proposal outcome Turn discovery notes into a client-ready proposal.');
    expect(html).not.toContain('https://example.com/private');
    expect(html).not.toContain('DESCRIPTION-TAIL-MUST-NOT-RENDER');
    expect(html).toContain('line-clamp-3');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('[overflow-wrap:anywhere]');
    expect(html).toContain('href="/library/asset-long-description"');
    expect(html).not.toContain('Read more');
  });

  it('does not offer a client-only trust filter on the server-limited Library page', () => {
    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).not.toContain('Trust level');
    expect(html).not.toContain('All trust levels');
    expect(html).not.toContain('Approved for use');
  });

  it('uses Work type for the workspace classification filter', () => {
    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('>Work type<select');
    expect(html).not.toContain('Job to be done');
  });

  it('renders work with no optional metadata without blank classification rows', () => {
    state.library = {
      items: [
        {
          assetId: 'asset-2',
          kind: 'prompt',
          lastVerifiedAt: null,
          ownerUserId: 'user-1',
          reviewState: 'draft',
          title: 'Saved AI work',
          updatedAt: 1_700_000_000_000,
          versionNumber: 1,
          visibility: 'private',
        },
      ],
      total: 1,
    };

    let html = '';
    let renderError: unknown;
    try {
      html = renderToStaticMarkup(createElement(LibraryScreen, { scope: 'my_work' }));
    } catch (error) {
      renderError = error;
    }

    expect(renderError).toBeUndefined();
    expect(html).toContain('Saved AI work');
    expect(html).not.toContain('>Team</dt>');
    expect(html).not.toContain('>Job to be done</dt>');
    expect(html).not.toContain('undefined');
  });

  it('shows fixed workspace recovery copy instead of raw Convex diagnostics', () => {
    state.workspaceError =
      'Uncaught Error: [CONVEX Q(workLibrary:listLibrary)] Request ID: secret-42 at convex/workLibrary.ts:1084';
    state.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toMatch(/convex|request id|listLibrary|workLibrary\.ts/i);
  });

  it('uses AI-work language when an editable Library view is empty', () => {
    const html = renderToStaticMarkup(createElement(LibraryScreen, { scope: 'my_work' }));

    expect(html).toContain('Save your first AI work');
    expect(html).toContain('Paste AI instructions or work your team already uses.');
    expect(html).not.toMatch(/save your first prompt|paste a prompt/i);
  });
});

describe('WorkspaceAdminScreen role boundaries', () => {
  it('gives curators Library organization without owner or admin controls', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Library organization');
    expect(html).toContain('Add team');
    expect(html).toContain('Add work type');
    expect(html).toContain('Rename Enterprise advisory');
    expect(html).toContain('Archive Enterprise advisory');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('Archived marketing');
    expect(html).not.toContain('People and access');
    expect(html).not.toContain('Starter Library');
    expect(html).not.toContain('Connections');
    expect(html).not.toContain('Workspace data boundary');
  });

  it('keeps workspace controls available to owners alongside Library organization', () => {
    state.role = 'owner';

    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Library organization');
    expect(html).toContain('People and access');
    expect(html).toContain('Starter Library');
    expect(html).toContain('Connections');
    expect(html).toContain('Workspace data boundary');
  });

  it('shows fixed recovery copy instead of raw workspace diagnostics', () => {
    state.workspaceError =
      'Uncaught Error: [CONVEX Q(workLibrary:listTaxonomyTerms)] Request ID: secret-99';
    state.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(WorkspaceAdminScreen));

    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toMatch(/convex|request id|listTaxonomyTerms/i);
  });
});
