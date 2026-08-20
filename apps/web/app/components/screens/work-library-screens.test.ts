import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticated: true,
  authLoading: false,
  queryResult: null as unknown,
  role: 'curator' as 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer',
  saved: false,
  searchMode: null as string | null,
  taxonomyQueryResult: undefined as unknown,
  workspaceError: null as string | null,
  workspaceRetry: undefined as (() => void) | undefined,
  workspaceStatus: 'ready' as 'bootstrapping' | 'error' | 'ready',
}));

vi.mock('convex/react', async () => {
  const { getFunctionName } = await import('convex/server');
  return {
    useConvexAuth: () => ({
      isAuthenticated: mocks.authenticated,
      isLoading: mocks.authLoading,
    }),
    useMutation: () => async () => ({}),
    useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(query) === 'workLibrary:listTaxonomyTerms'
        ? mocks.taxonomyQueryResult
        : mocks.queryResult,
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/library',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => {
    const params = new URLSearchParams();
    if (mocks.searchMode) params.set('mode', mocks.searchMode);
    if (mocks.saved) params.set('saved', '1');
    return params;
  },
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    error: mocks.workspaceError,
    name: 'Maslow AI',
    role: mocks.role,
    retry: mocks.workspaceRetry,
    status: mocks.workspaceStatus,
    workspaceId: 'workspace-1',
  }),
}));

import { AssetDetailScreen } from './AssetDetailScreen';
import { LibraryScreen } from './LibraryScreen';
import { SaveAssetScreen } from './SaveAssetScreen';

const libraryItem = {
  assetId: 'asset-1',
  jobKey: 'create-proposal',
  kind: 'prompt' as const,
  lastVerifiedAt: 1_700_000_000_000,
  ownerUserId: 'user-1',
  purpose: 'Turn discovery notes into a client-ready proposal.',
  reviewState: 'shared',
  teamKey: 'client-delivery',
  title: 'Proposal drafter',
  updatedAt: 1_700_000_000_000,
  versionNumber: 2,
  visibility: 'team',
};

const asset = {
  ...libraryItem,
  approvals: [],
  body: 'Draft a proposal for {{client_name}}.',
  canEdit: true,
  comments: [],
  inputs: [{ key: 'client_name', kind: 'text' as const, label: 'Client name', required: true }],
  isFavorite: false,
  pendingVersion: null,
  variants: [],
  versions: [
    { body: 'Draft a proposal for {{client_name}}.', versionNumber: 2 },
    { body: 'Draft a proposal.', versionNumber: 1 },
  ],
};

const taxonomyTerms = [
  {
    key: 'client-delivery',
    kind: 'team',
    label: 'Client delivery',
    sortOrder: 0,
    status: 'active',
    termId: 'term-team-1',
  },
  {
    key: 'create-proposal',
    kind: 'work_type',
    label: 'Create a proposal',
    sortOrder: 0,
    status: 'active',
    termId: 'term-work-1',
  },
];

beforeEach(() => {
  mocks.authenticated = true;
  mocks.authLoading = false;
  mocks.queryResult = { items: [libraryItem], total: 1 };
  mocks.role = 'curator';
  mocks.saved = false;
  mocks.searchMode = null;
  mocks.taxonomyQueryResult = taxonomyTerms;
  mocks.workspaceError = null;
  mocks.workspaceRetry = undefined;
  mocks.workspaceStatus = 'ready';
});

describe('LibraryScreen', () => {
  it('keeps the Library steady while the signed-in data session connects', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Preparing your Library');
    expect(html).not.toContain('Sign in to continue');
  });

  it('opens approval cards in a focused review mode', () => {
    const html = renderToStaticMarkup(createElement(LibraryScreen, { scope: 'approvals' }));

    expect(html).toContain('href="/library/asset-1?mode=review"');
    expect(html).toContain('>Review<');
    expect(html).not.toContain('>Use<');
  });

  it('keeps the everyday Library filters complete before server-side limiting', () => {
    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).not.toContain('Trust level');
    expect(html).not.toContain('Approved for use');
    expect(html).toContain('>Filters</summary>');
    expect(html).toContain(
      '<dd class="mt-1 font-medium text-[var(--ink)]">Client delivery</dd>',
    );
    expect(html).toContain(
      '<dd class="mt-1 font-medium text-[var(--ink)]">Create a proposal</dd>',
    );
  });

  it('does not offer authoring actions to viewers', () => {
    mocks.role = 'viewer';
    mocks.queryResult = { items: [], total: 0 };

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).not.toContain('Save new work');
    expect(html).not.toContain('href="/library/new"');
  });

  it('shows a workspace error instead of dependent-query loading', () => {
    mocks.authLoading = true;
    mocks.queryResult = undefined;
    mocks.workspaceError = 'Your organization membership could not be verified.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Your workspace could not be prepared');
    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toContain('Your organization membership could not be verified.');
    expect(html).not.toContain('Loading useful work');
    expect(html).not.toContain('aria-label="Loading items"');
  });

  it('shows shared handoff recovery instead of mislabeling a signed-in user as signed out', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.workspaceError = 'Roster could not finish the secure workspace connection.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(LibraryScreen));

    expect(html).toContain('Your workspace could not be prepared');
    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toContain('secure workspace connection');
    expect(html).not.toContain('Sign in to continue');
  });
});

describe('SaveAssetScreen', () => {
  it('starts with one required exact-text field and the private-save action', () => {
    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('Save AI work');
    expect(html).toContain(
      'Paste what you use in ChatGPT, Claude, Copilot, Gemini, or another AI tool.',
    );
    expect(html).toContain('>Save to My Work<');
    expect(html.match(/required=""/g)).toHaveLength(1);
    expect(html).not.toContain('>Playbook<');
    expect(html).not.toContain('value="playbook"');
  });

  it('keeps organization and reuse controls collapsed and optional', () => {
    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('>Organize it (optional)</summary>');
    expect(html).toContain('>Make it reusable (optional)</summary>');
    expect(html).not.toContain('<details open=""');
    expect(html).toContain('No selection');
    expect(html).toContain('Add a new team');
    expect(html).toContain('Add a new work type');
    expect(html).toContain('Client delivery');
    expect(html).toContain('Create a proposal');
    expect(html).not.toContain('Job to be done');
    expect(html).not.toContain('Add variables');
  });

  it('gives both optional disclosures a solid two-pixel keyboard focus outline', () => {
    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html.match(/focus-visible:outline-2/g)).toHaveLength(2);
    expect(html.match(/focus-visible:outline-solid/g)).toHaveLength(2);
    expect(html.match(/focus-visible:outline-\[var\(--focus-ring-solid\)\]/g)).toHaveLength(2);
  });

  it('shows the complete supported description boundary', () => {
    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('maxLength="20000"');
    expect(html).toContain('0 / 20,000 characters');
    expect(html).toContain(
      'Markdown is supported. Roster shows a short preview and keeps the full description available when someone needs it.',
    );
  });

  it('shows viewers a friendly role notice without rendering the save form', () => {
    mocks.role = 'viewer';

    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('Your current role is view-only');
    expect(html).toContain('href="/library"');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Prompt text');
  });

  it('waits for the workspace role before rendering the save form', () => {
    mocks.workspaceStatus = 'bootstrapping';

    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('Preparing save access');
    expect(html).not.toContain('<form');
  });

  it('shows shared handoff recovery before the signed-out save route', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.workspaceError =
      'Uncaught Error: [CONVEX Q(workLibrary:bootstrapWorkspace)] Request ID: req-secret-42 at convex/workLibrary.ts:412';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(SaveAssetScreen));

    expect(html).toContain('Roster could not open this workspace');
    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toMatch(/convex|bootstrapWorkspace|request id|req-secret|workLibrary\.ts/i);
    expect(html).not.toContain('Sign in to continue');
  });
});

describe('AssetDetailScreen', () => {
  beforeEach(() => {
    mocks.queryResult = asset;
    mocks.taxonomyQueryResult = taxonomyTerms;
  });

  it('keeps one stable loading state until both the asset and taxonomy resolve', () => {
    mocks.saved = true;
    const queryStates = [
      { assetResult: asset, taxonomyResult: undefined },
      { assetResult: undefined, taxonomyResult: taxonomyTerms },
    ];

    for (const queryState of queryStates) {
      mocks.queryResult = queryState.assetResult;
      mocks.taxonomyQueryResult = queryState.taxonomyResult;

      const html = renderToStaticMarkup(
        createElement(AssetDetailScreen, { assetId: 'asset-1' }),
      );

      expect(html).toContain('Preparing this work');
      expect(html).not.toContain('Saved to My Work');
      expect(html).not.toContain('Organize this draft');
      expect(html).not.toContain('AI work · Client delivery');
    }
  });

  it('keeps inputs and copy primary while placing exact text and governance details on demand', () => {
    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Copy AI work');
    expect(html).toContain('AI work · Client delivery');
    expect(html).toContain('Create a proposal');
    expect(html).toContain('<details');
    expect(html).toContain('View exact AI work');
    expect(html).toContain('Version history and approvals');
    expect(html).toContain('Exports and feedback');
    expect(html).toContain('Required fields must be complete before anything is copied.');
    expect(html).toContain('id="prompt-input-client_name"');
    expect(html).toContain('this saved AI work needs');
    expect(html).not.toContain('this saved ai work needs');
  });

  it('keeps long Markdown descriptions calm until the reader asks for the full context', () => {
    const longPurpose = [
      'This AI work finds the strongest value moments and the weak points that break momentum. It studies the complete customer journey, separates evidence from assumptions, and recommends practical improvements that increase confidence without adding unnecessary complexity for the people who must act on the result.',
      '',
      '**Three example user prompts:**',
      '1. First example with enough supporting context to be useful.',
      '2. Second example with a different customer situation.',
      '3. Third example that should stay out of the page header.',
    ].join('\n');
    mocks.queryResult = { ...asset, purpose: longPurpose };

    const html = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );
    const pageBeforeDialog = html.split('role="dialog"')[0];

    expect(pageBeforeDialog).toContain(
      'This AI work finds the strongest value moments and the weak points that break momentum.',
    );
    expect(pageBeforeDialog).toContain('Read full description');
    expect(pageBeforeDialog).toContain('line-clamp-3');
    expect(pageBeforeDialog).not.toContain('Three example user prompts');
    expect(pageBeforeDialog).not.toContain('Third example');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('hidden=""');
    expect(html).toContain('<strong>Three example user prompts:</strong>');
    expect(html).not.toContain('**Three example user prompts:**');
  });

  it('does not clamp a complete short description when no panel action is needed', () => {
    mocks.queryResult = {
      ...asset,
      purpose: 'A concise outcome that fits the page without hiding any of its meaning.',
    };

    const html = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );
    const pageBeforeDialog = html.split('role="dialog"')[0];

    expect(pageBeforeDialog).toContain(
      'A concise outcome that fits the page without hiding any of its meaning.',
    );
    expect(pageBeforeDialog).not.toContain('Read full description');
    expect(pageBeforeDialog).not.toContain('line-clamp-3');
  });

  it('keeps a medium plain description compact with the complete text still reachable', () => {
    const mediumPurpose =
      'This description explains the business outcome, the evidence people should supply, and the practical result they can expect without asking them to understand prompt syntax or model settings.';
    expect(mediumPurpose.length).toBeLessThan(240);
    mocks.queryResult = { ...asset, purpose: mediumPurpose };

    const html = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );
    const pageBeforeDialog = html.split('role="dialog"')[0];

    expect(pageBeforeDialog).toContain('line-clamp-3');
    expect(pageBeforeDialog).toContain('Read full description');
    expect(html).toContain(mediumPurpose);
  });

  it('renders description Markdown safely inside the on-demand panel', () => {
    mocks.queryResult = {
      ...asset,
      purpose: [
        '# Overview',
        '',
        '**Use this carefully.**',
        '',
        '### Scope',
        '',
        '#### Details',
        '',
        '1. First example',
        '2. Second example',
        '',
        '| Input | Example |',
        '| --- | --- |',
        '| Notes | Discovery notes |',
        '',
        '- [x] Preserve supplied evidence',
        '- [ ] Mark assumptions',
        '',
        '[Reference](https://example.com/reference)',
        '',
        '<script>alert("do not run")</script>',
        '',
        '![Remote image](https://example.com/tracker.png)',
      ].join('\n'),
    };

    const html = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );

    expect(html).toContain('<h3');
    expect(html).toMatch(/<h3[^>]*>Scope<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Details<\/h3>/);
    expect(html).toContain('<strong>Use this carefully.</strong>');
    expect(html).toContain('<ol');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Completed checklist item"');
    expect(html).toContain('aria-label="Incomplete checklist item"');
    expect(html).toContain('aria-label="Scrollable description table"');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('list-none');
    expect(html).not.toContain('node="[object Object]"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('do not run');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('tracker.png');
  });

  it('requires review evidence before approval and shows evidence for its exact version', () => {
    mocks.queryResult = {
      ...asset,
      approvals: [
        {
          createdAt: Date.UTC(2026, 7, 20, 12),
          note: 'Checked the facts, structure, and handoff instructions.',
          reviewerUserId: 'reviewer-42',
          scope: 'team',
          testedModels: ['GPT-5', 'Claude Sonnet'],
          versionNumber: 2,
        },
      ],
    };
    mocks.searchMode = 'review';
    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Review before the team trusts it');
    expect(html).toContain('Approve for team');
    expect(html).toContain('Back to approvals');
    expect(html).toContain('Reviewer note');
    expect(html).toContain('Models tested (optional)');
    expect(html).toContain('Recorded reviewer');
    expect(html).toContain('reviewer-42');
    expect(html).toContain('Checked the facts, structure, and handoff instructions.');
    expect(html).toContain('GPT-5, Claude Sonnet');
    expect(html).toContain('Aug 20, 2026');
  });

  it('does not label current draft or shared versions approved without approval evidence', () => {
    const cases = [
      { reviewState: 'draft', visibility: 'private', expected: 'Private draft' },
      { reviewState: 'shared', visibility: 'team', expected: 'Shared for review' },
    ];

    for (const current of cases) {
      mocks.queryResult = { ...asset, ...current, approvals: [] };

      const html = renderToStaticMarkup(
        createElement(AssetDetailScreen, { assetId: 'asset-1' }),
      );

      expect(html).toContain(`>${current.expected}</p>`);
      expect(html).not.toContain('Approved for use');
    }
  });

  it('offers immutable draft editing to the asset owner and explains re-review', () => {
    mocks.queryResult = asset;
    mocks.role = 'contributor';

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Edit current AI work');
    expect(html).toContain('Saving creates a new immutable draft version.');
    expect(html).toContain('Re-review is required');
    expect(html).toContain('Change note');
    expect(html).toContain('Save new draft version');
  });

  it('does not offer prompt editing to a contributor who does not own the asset', () => {
    mocks.queryResult = { ...asset, canEdit: false };
    mocks.role = 'contributor';

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).not.toContain('Edit current AI work');
  });

  it('shows shared handoff recovery before the signed-out asset route', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.queryResult = undefined;
    mocks.workspaceError = 'Roster could not finish the secure workspace connection.';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('This workspace is unavailable');
    expect(html).not.toContain('Sign in to continue');
  });

  it('keeps the approved prompt primary while an owner edits a replacement draft', () => {
    mocks.queryResult = {
      ...asset,
      body: 'Approved prompt for {{client_name}}.',
      reviewState: 'workspace_approved',
      versionNumber: 2,
      pendingVersion: {
        body: 'Replacement draft for {{client_name}}.',
        inputs: asset.inputs,
        reviewState: 'draft',
        variants: [],
        versionNumber: 3,
      },
    };

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Approved prompt for {{client_name}}.');
    expect(html).toContain('Workspace approved');
    expect(html).toContain('Version 2');
    expect(html).toContain('Replacement draft for {{client_name}}.');
    expect(html).toContain('Share for review');
  });

  it('reviews the pending replacement without replacing the approved use view', () => {
    mocks.searchMode = 'review';
    mocks.queryResult = {
      ...asset,
      body: 'Approved prompt for {{client_name}}.',
      reviewState: 'workspace_approved',
      versionNumber: 2,
      pendingVersion: {
        body: 'Shared replacement for {{client_name}}.',
        inputs: asset.inputs,
        reviewState: 'shared',
        variants: [],
        versionNumber: 3,
      },
    };

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Approval review · Version 3');
    expect(html).toContain('Approval applies only to version 3.');
    expect(html).toContain('Shared replacement for {{client_name}}.');
    expect(html).toContain('Approve for team');
    expect(html).toContain('Not verified yet');
    expect(html).not.toMatch(/Verified (today|yesterday|\d)/);
  });

  it('renders friendly controls for every governed prompt input kind', () => {
    mocks.queryResult = {
      ...asset,
      inputs: [
        { key: 'count', kind: 'number', label: 'Count', required: true },
        { key: 'include_risks', kind: 'boolean', label: 'Include risks', required: true },
        {
          key: 'tone',
          kind: 'select',
          label: 'Tone',
          options: ['Concise', 'Detailed'],
          required: true,
        },
        { key: 'due_date', kind: 'date', label: 'Due date', required: true },
        { key: 'source_file', kind: 'file', label: 'Source file', required: true },
      ],
    };

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('type="number"');
    expect(html).toContain('Choose yes or no');
    expect(html).toContain('<option value="Concise">Concise</option>');
    expect(html).toContain('type="date"');
    expect(html).toContain('type="file"');
  });

  it('omits unspecified metadata without rendering blank or undefined labels', () => {
    mocks.queryResult = {
      ...asset,
      jobKey: undefined,
      purpose: undefined,
      teamKey: undefined,
    };

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('AI work saved exactly as written.');
    expect(html).toContain('>AI work</p>');
    expect(html).not.toContain('AI work ·');
    expect(html).not.toContain('Outcome</dt>');
    expect(html).not.toContain('undefined');
    expect(html).not.toMatch(/<dd[^>]*>\s*<\/dd>/);
  });

  it('uses active renamed workspace taxonomy labels', () => {
    mocks.taxonomyQueryResult = [
      { ...taxonomyTerms[0], label: 'Customer success' },
      { ...taxonomyTerms[1], label: 'Renewal planning' },
    ];

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('AI work · Customer success');
    expect(html).toContain('Renewal planning');
    expect(html).not.toContain('Client delivery');
    expect(html).not.toContain('Create a proposal');
  });

  it('omits missing or archived taxonomy labels', () => {
    mocks.taxonomyQueryResult = [
      { ...taxonomyTerms[0], status: 'archived' },
      { ...taxonomyTerms[1], status: 'archived' },
    ];

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('>AI work</p>');
    expect(html).not.toContain('Client delivery');
    expect(html).not.toContain('Create a proposal');
    expect(html).not.toContain('client-delivery');
    expect(html).not.toContain('create-proposal');
  });

  it('shows a live private-draft confirmation after save without implying approval', () => {
    mocks.queryResult = { ...asset, reviewState: 'draft', visibility: 'private' };
    mocks.saved = true;

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('role="status"');
    expect(html).toContain('Saved to My Work');
    expect(html).toContain(
      'This is a private draft. Organize it now or share it when ready.',
    );
    expect(html).not.toContain('Saved and approved');
  });

  it('does not show a private-draft save receipt for shared or uneditable work', () => {
    mocks.saved = true;
    mocks.queryResult = { ...asset, reviewState: 'shared', visibility: 'team' };
    const shared = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );

    mocks.queryResult = {
      ...asset,
      canEdit: false,
      reviewState: 'draft',
      visibility: 'private',
    };
    const uneditable = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );

    expect(shared).not.toContain('Saved to My Work');
    expect(uneditable).not.toContain('Saved to My Work');
  });

  it('offers organization only for an editable private draft with active taxonomy choices', () => {
    mocks.queryResult = { ...asset, reviewState: 'draft', visibility: 'private' };
    mocks.taxonomyQueryResult = [
      { ...taxonomyTerms[0], label: 'Customer success' },
      { ...taxonomyTerms[1], label: 'Renewal planning' },
    ];

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Organize this draft');
    expect(html).toContain('maxLength="20000"');
    expect(html).toContain('No selection');
    expect(html).toContain('Customer success');
    expect(html).toContain('Renewal planning');
  });

  it('does not offer in-place organization for shared or uneditable work', () => {
    mocks.queryResult = { ...asset, canEdit: false, reviewState: 'draft', visibility: 'private' };
    const uneditable = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );

    mocks.queryResult = { ...asset, reviewState: 'shared', visibility: 'team' };
    const shared = renderToStaticMarkup(
      createElement(AssetDetailScreen, { assetId: 'asset-1' }),
    );

    expect(uneditable).not.toContain('Organize this draft');
    expect(shared).not.toContain('Organize this draft');
  });

  it('sanitizes workspace diagnostics before rendering recovery', () => {
    mocks.authenticated = false;
    mocks.authLoading = true;
    mocks.queryResult = undefined;
    mocks.workspaceError =
      'Uncaught Error: [CONVEX Q(workLibrary:getAsset)] Request ID: req-secret at convex/workLibrary.ts:900';
    mocks.workspaceStatus = 'error';

    const html = renderToStaticMarkup(createElement(AssetDetailScreen, { assetId: 'asset-1' }));

    expect(html).toContain('Roster could not verify your workspace access. Reload and try again.');
    expect(html).not.toMatch(/convex|getAsset|request id|req-secret|workLibrary\.ts/i);
  });
});
