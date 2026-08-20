/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { normalizeLibrarySearch } from './workLibrary';

const modules = import.meta.glob('./**/*.ts');

type WorkspaceSummary = {
  workspaceId: string;
  name: string;
  role: 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer';
};

type AssetSummary = {
  assetId: string;
  title: string;
  purpose?: string;
  kind: 'prompt' | 'playbook';
  teamKey?: string;
  jobKey?: string;
  visibility: 'private' | 'team' | 'workspace';
  ownerUserId: string;
  reviewState: 'draft' | 'shared' | 'team_approved' | 'workspace_approved' | 'archived';
  versionNumber: number;
  isFavorite: boolean;
};

type AssetDetail = AssetSummary & {
  body: string;
  canEdit: boolean;
  inputs: Array<{ key: string; label: string; kind: 'text' | 'long_text'; required: boolean }>;
  versions: Array<{ versionNumber: number; body: string }>;
  approvals: Array<{
    versionNumber: number;
    scope: 'team' | 'workspace';
    reviewerUserId: string;
    note: string;
    testedModels: string[];
    createdAt: number;
  }>;
  isFavorite: boolean;
  comments: Array<{ body: string; versionNumber: number }>;
  pendingVersion: null | {
    body: string;
    inputs: Array<{ key: string; label: string; kind: 'text' | 'long_text'; required: boolean }>;
    reviewState: 'draft' | 'shared';
    versionNumber: number;
  };
};

const bootstrapWorkspace = makeFunctionReference<'mutation', Record<string, never>, WorkspaceSummary>(
  'workLibrary:bootstrapWorkspace',
);
const createDraft = makeFunctionReference<
  'mutation',
  {
    title?: string;
    purpose?: string;
    body: string;
    teamKey?: string;
    jobKey?: string;
    teamLabel?: string;
    jobLabel?: string;
    kind?: 'prompt' | 'playbook';
    inputs?: Array<{
      key: string;
      label: string;
      kind: 'text' | 'long_text';
      required: boolean;
    }>;
  },
  { assetId: Id<'assets'>; versionNumber: number }
>('workLibrary:createDraft');
type TaxonomyTerm = {
  termId: string;
  kind: 'team' | 'work_type';
  key: string;
  label: string;
  status: 'active' | 'archived';
  sortOrder: number;
};
const listTaxonomyTerms = makeFunctionReference<
  'query',
  { kind?: 'team' | 'work_type' },
  TaxonomyTerm[]
>('workLibrary:listTaxonomyTerms');
const createTaxonomyTerm = makeFunctionReference<
  'mutation',
  { kind: 'team' | 'work_type'; label: string },
  TaxonomyTerm
>('workLibrary:createTaxonomyTerm');
const updateTaxonomyTerm = makeFunctionReference<
  'mutation',
  { termId: string; label?: string; status?: 'active' | 'archived' },
  TaxonomyTerm
>('workLibrary:updateTaxonomyTerm');
const updatePrivateDraftMetadata = makeFunctionReference<
  'mutation',
  { assetId: string; title?: string; purpose?: string; teamKey?: string; jobKey?: string },
  { updated: true }
>('workLibrary:updatePrivateDraftMetadata');
const listLibrary = makeFunctionReference<
  'query',
  {
    limit?: number;
    search?: string;
    teamKey?: string;
    jobKey?: string;
    scope?: 'library' | 'my_work' | 'approvals';
  },
  { items: AssetSummary[]; total: number }
>('workLibrary:listLibrary');
const getAsset = makeFunctionReference<'query', { assetId: string }, AssetDetail | null>(
  'workLibrary:getAsset',
);
const saveVersion = makeFunctionReference<
  'mutation',
  { assetId: string; body: string; changeNote: string },
  { versionNumber: number }
>('workLibrary:saveVersion');
const shareAsset = makeFunctionReference<
  'mutation',
  { assetId: string; visibility: 'team' | 'workspace' },
  { reviewState: 'shared' }
>('workLibrary:shareAsset');
const approveAsset = makeFunctionReference<
  'mutation',
  {
    assetId: string;
    scope: 'team' | 'workspace';
    note: string;
    expectedVersionNumber: number;
    testedModels?: string[];
  },
  { reviewState: 'team_approved' | 'workspace_approved'; versionNumber: number }
>('workLibrary:approveAsset');
const toggleFavorite = makeFunctionReference<
  'mutation',
  { assetId: string },
  { isFavorite: boolean }
>('workLibrary:toggleFavorite');
const addComment = makeFunctionReference<
  'mutation',
  { assetId: string; body: string; presentedVersionNumber: number },
  { versionNumber: number }
>('workLibrary:addComment');
const recordAssetUse = makeFunctionReference<
  'mutation',
  { assetId: string; source: 'copy' | 'export' | 'mcp' | 'test' | 'playbook' },
  { recorded: true }
>('workLibrary:recordAssetUse');
const seedStarterLibrary = makeFunctionReference<
  'mutation',
  Record<string, never>,
  { created: number; existing: number }
>('workLibrary:seedStarterLibrary');

function identity(
  subject: string,
  orgId: string,
  orgRole: 'org:owner' | 'org:admin' | 'org:curator' | 'org:contributor' | 'org:viewer',
) {
  return {
    subject,
    tokenIdentifier: `https://clerk.test|${subject}`,
    issuer: 'https://clerk.test',
    name: subject,
    org_id: orgId,
    org_name: orgId === 'org_alpha' ? 'Alpha Studio' : 'Beta Studio',
    org_slug: orgId.replace('_', '-'),
    org_role: orgRole,
  };
}

async function seedDraft() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
  await owner.mutation(bootstrapWorkspace, {});
  const created = await owner.mutation(createDraft, {
    title: 'Turn discovery notes into a proposal',
    purpose: 'Create a review-ready proposal without rebuilding the prompt each time.',
    body: 'Draft a proposal for {{client_name}} using {{discovery_notes}}.',
    teamKey: 'client-delivery',
    jobKey: 'create-proposal',
    inputs: [
      { key: 'client_name', label: 'Client name', kind: 'text', required: true },
      {
        key: 'discovery_notes',
        label: 'Discovery notes',
        kind: 'long_text',
        required: true,
      },
    ],
  });
  return { t, owner, created };
}

describe('AI Work Library workspace boundary', () => {
  it('normalizes pasted search text to Convex full-text limits in one bounded pass', () => {
    const search = Array.from({ length: 20 }, (_, index) => `term${index}`).join('/');
    const normalized = normalizeLibrarySearch(`${search} ${'é'.repeat(1_000_000)}`);
    const terms = normalized?.split(' ') ?? [];

    expect(terms).toHaveLength(16);
    expect(terms[0]).toBe('term0');
    expect(terms[15]).toBe('term15');
    expect(terms.every((term) => new TextEncoder().encode(term).byteLength <= 32)).toBe(true);
    expect(new TextEncoder().encode(normalizeLibrarySearch('é'.repeat(1_000_000))).byteLength).toBe(
      32,
    );
    expect(
      normalizeLibrarySearch(Array.from({ length: 20 }, (_, index) => `item${index}`).join('_'))
        ?.split(' '),
    ).toHaveLength(16);
  });

  it('creates one workspace membership from the active Clerk organization', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));

    const first = await owner.mutation(bootstrapWorkspace, {});
    const second = await owner.mutation(bootstrapWorkspace, {});

    expect(first).toMatchObject({ name: 'Alpha Studio', role: 'owner' });
    expect(second).toEqual(first);
    const workspaces = await t.run((ctx) => ctx.db.query('workspaces').take(10));
    const memberships = await t.run((ctx) => ctx.db.query('memberships').take(10));
    expect(workspaces).toHaveLength(1);
    expect(memberships).toHaveLength(1);
  });

  it('does not promote the first non-admin organization member to owner', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    const admin = t.withIdentity(identity('admin_alpha', 'org_alpha', 'org:admin'));

    expect(await contributor.mutation(bootstrapWorkspace, {})).toMatchObject({
      role: 'contributor',
    });
    expect(await admin.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'admin' });
    await expect(admin.mutation(seedStarterLibrary, {})).resolves.toMatchObject({ created: 12 });
    await expect(contributor.mutation(seedStarterLibrary, {})).rejects.toThrow(/admin/i);
  });

  it('recognizes an explicit Clerk organization owner claim', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_claim', 'org_alpha', 'org:owner'));

    await expect(owner.mutation(bootstrapWorkspace, {})).resolves.toMatchObject({ role: 'owner' });
    await expect(owner.mutation(seedStarterLibrary, {})).resolves.toMatchObject({ created: 12 });
  });

  it('synchronizes non-owner access when the Clerk organization role changes', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:contributor'));
    const curator = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:curator'));
    const viewer = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:viewer'));

    expect(await contributor.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'contributor' });
    expect(await curator.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'curator' });
    expect(await viewer.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'viewer' });
  });

  it('revokes stored curator privileges immediately when Clerk demotes the session', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    const created = await owner.mutation(createDraft, {
      title: 'Review-safe prompt',
      purpose: 'Verify role demotions are enforced on every request.',
      body: 'Summarize {{meeting_notes}}.',
      teamKey: 'operations',
      jobKey: 'summarize-meeting',
    });
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });

    const curator = t.withIdentity(identity('changing_member', 'org_alpha', 'org:curator'));
    await curator.mutation(bootstrapWorkspace, {});
    const demotedViewer = t.withIdentity(
      identity('changing_member', 'org_alpha', 'org:viewer'),
    );

    await expect(
      demotedViewer.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: 'This must be rejected after demotion.',
      }),
    ).rejects.toThrow(/curator/i);
  });

  it('never returns an asset to a member of another workspace', async () => {
    const { t, created } = await seedDraft();
    const outsider = t.withIdentity(identity('owner_beta', 'org_beta', 'org:admin'));
    await outsider.mutation(bootstrapWorkspace, {});

    const detail = await outsider.query(getAsset, { assetId: created.assetId });
    const library = await outsider.query(listLibrary, { limit: 20 });

    expect(detail).toBeNull();
    expect(library).toEqual({ items: [], total: 0 });
  });

  it('enforces the body boundary while treating a blank title as omitted', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    const fallback = await owner.mutation(createDraft, {
      title: '   ',
      purpose: 'Useful outcome',
      body: 'Prompt body',
      teamKey: 'marketing',
      jobKey: 'create-campaign',
    });
    expect((await owner.query(getAsset, { assetId: fallback.assetId }))?.title).toMatch(
      /^Saved AI work · \d{4}-\d{2}-\d{2}$/,
    );
    await expect(
      owner.mutation(createDraft, {
        title: 'Oversized prompt',
        purpose: 'Useful outcome',
        body: 'x'.repeat(500_001),
        teamKey: 'marketing',
        jobKey: 'create-campaign',
      }),
    ).rejects.toThrow(/500,000/i);
  });

  it('supports outcome search and a My Work view without leaking private drafts', async () => {
    const { t, owner, created } = await seedDraft();
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});
    await contributor.mutation(createDraft, {
      title: 'Summarize an internal meeting',
      purpose: 'Turn internal notes into concise follow-up actions.',
      body: 'Summarize {{meeting_notes}}.',
      teamKey: 'operations',
      jobKey: 'summarize-meeting',
      kind: 'playbook',
    });

    const searched = await contributor.query(listLibrary, {
      search: 'proposal',
      teamKey: 'client-delivery',
      jobKey: 'create-proposal',
      scope: 'library',
      limit: 20,
    });
    const myWork = await contributor.query(listLibrary, { scope: 'my_work', limit: 20 });

    expect(searched.items.map((item) => item.title)).toEqual([
      'Turn discovery notes into a proposal',
    ]);
    expect(myWork.items.map((item) => item.title)).toEqual(['Summarize an internal meeting']);
    expect(myWork.items[0]?.kind).toBe('playbook');
  });

  it('searches the whole workspace instead of only the newest result window', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    await t.run(async (ctx) => {
      const workspace = await ctx.db
        .query('workspaces')
        .withIndex('by_external_id', (q) => q.eq('externalId', 'org_alpha'))
        .unique();
      if (!workspace) throw new Error('Test workspace is missing');
      await ctx.db.insert('assets', {
        workspaceId: workspace._id,
        kind: 'prompt',
        title: 'Needle proposal',
        purpose: 'Find the one older matching asset.',
        searchText: 'needle proposal find the one older matching asset',
        teamKey: 'marketing',
        jobKey: 'create-proposal',
        visibility: 'workspace',
        reviewState: 'team_approved',
        ownerUserId: 'https://clerk.test|owner_alpha',
        latestVersionNumber: 1,
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.insert('assets', {
        workspaceId: workspace._id,
        kind: 'prompt',
        title: 'Legacy team draft',
        purpose: 'A pre-fix draft that must not create a dead Library card.',
        searchText: 'legacy team draft must not appear',
        teamKey: 'marketing',
        jobKey: 'create-proposal',
        visibility: 'team',
        reviewState: 'draft',
        ownerUserId: 'https://clerk.test|owner_alpha',
        latestVersionNumber: 2,
        createdAt: 2,
        updatedAt: 2,
      });
      for (let index = 0; index < 85; index += 1) {
        await ctx.db.insert('assets', {
          workspaceId: workspace._id,
          kind: 'prompt',
          title: `Recent filler ${index}`,
          purpose: 'A newer unrelated asset.',
          searchText: `recent filler ${index} newer unrelated asset`,
          pendingSearchText: '',
          teamKey: 'operations',
          jobKey: 'summarize-meeting',
          visibility: 'workspace',
          reviewState: 'shared',
          ownerUserId: 'https://clerk.test|owner_alpha',
          latestVersionNumber: 1,
          createdAt: index + 2,
          updatedAt: index + 2,
        });
      }
    });

    const searched = await owner.query(listLibrary, {
      search: 'needle',
      teamKey: 'marketing',
      jobKey: 'create-proposal',
      scope: 'library',
      limit: 80,
    });
    const filtered = await owner.query(listLibrary, {
      teamKey: 'marketing',
      jobKey: 'create-proposal',
      scope: 'library',
      limit: 80,
    });
    const approvals = await owner.query(listLibrary, { scope: 'approvals', limit: 80 });

    expect(searched.items.map((item) => item.title)).toEqual(['Needle proposal']);
    expect(searched.total).toBe(1);
    expect(filtered.items.map((item) => item.title)).toEqual(['Needle proposal']);
    expect(filtered.total).toBe(1);
    expect(approvals.items.some((item) => item.title === 'Needle proposal')).toBe(true);
    expect(approvals.items.length).toBeLessThanOrEqual(80);
    await expect(
      owner.query(listLibrary, {
        search: Array.from({ length: 20 }, (_, index) => `term${index}`).join(' '),
        scope: 'library',
        limit: 80,
      }),
    ).resolves.toMatchObject({ items: expect.any(Array) });
  });

  it('seeds a reviewable starter library once without inventing approvals', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});

    expect(await owner.mutation(seedStarterLibrary, {})).toEqual({ created: 12, existing: 0 });
    expect(await owner.mutation(seedStarterLibrary, {})).toEqual({ created: 0, existing: 12 });
    const assets = await t.run((ctx) => ctx.db.query('assets').take(20));
    const versions = await t.run((ctx) => ctx.db.query('assetVersions').take(20));
    const approvals = await t.run((ctx) => ctx.db.query('assetApprovals').take(20));
    expect(assets).toHaveLength(12);
    expect(versions).toHaveLength(12);
    expect(assets.every((asset) => asset.reviewState === 'shared')).toBe(true);
    expect(approvals).toEqual([]);
    const searchableQueue = await owner.query(listLibrary, {
      scope: 'approvals',
      search: 'proposal',
      limit: 20,
    });
    expect(searchableQueue.items.length).toBeGreaterThan(0);
  });
});

describe('AI Work Library flexible save and workspace taxonomy', () => {
  it('saves exact body-only work with a deterministic fallback title', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});
    const body = '<instructions>Keep every line exactly.</instructions>\n\nReturn the result.';

    const first = await contributor.mutation(createDraft, { body });
    const second = await contributor.mutation(createDraft, { body: 'A second body-only draft.' });
    const detail = await contributor.query(getAsset, { assetId: first.assetId });
    const secondDetail = await contributor.query(getAsset, { assetId: second.assetId });

    expect(detail?.body).toBe(body);
    expect(detail?.purpose).toBeUndefined();
    expect(detail?.teamKey).toBeUndefined();
    expect(detail?.jobKey).toBeUndefined();
    expect(detail?.title).toMatch(/^Saved AI work · \d{4}-\d{2}-\d{2}$/);
    expect(secondDetail?.title).toBe(detail?.title);
  });

  it('preserves a long optional description without adding it all to search text', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    const purpose = 'Context '.repeat(142) + 'x';

    const created = await owner.mutation(createDraft, {
      title: 'Long context draft',
      purpose,
      body: 'Use the supplied context without inventing facts.',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });

    expect(purpose).toHaveLength(1_137);
    expect(detail?.purpose).toBe(purpose);
  });

  it('preserves large prompt bodies while independently bounding indexed search text', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    const body = `<workflow>\n${'é'.repeat(249_000)}\n</workflow>`;

    const created = await owner.mutation(createDraft, { body });
    const detail = await owner.query(getAsset, { assetId: created.assetId });
    const asset = await t.run((ctx) => ctx.db.get('assets', created.assetId));

    expect(detail?.body).toBe(body);
    expect(new TextEncoder().encode(asset?.searchText ?? '').byteLength).toBeLessThanOrEqual(32_000);
  });

  it('upserts defaults and lets contributors share custom terms across their workspace', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await contributor.mutation(bootstrapWorkspace, {});
    await teammate.mutation(bootstrapWorkspace, {});

    const createdTeam = await contributor.mutation(createTaxonomyTerm, {
      kind: 'team',
      label: 'Customer Success',
    });
    const defaults = await teammate.query(listTaxonomyTerms, { kind: 'work_type' });
    const created = await teammate.mutation(createDraft, {
      body: 'Prepare a renewal risk review.',
      teamKey: createdTeam.key,
      jobKey: 'research-account',
    });
    const detail = await teammate.query(getAsset, { assetId: created.assetId });

    expect(defaults.map((term) => term.key)).toContain('research-account');
    expect(await teammate.query(listTaxonomyTerms, { kind: 'team' })).toContainEqual(createdTeam);
    expect(detail?.teamKey).toBe(createdTeam.key);
  });

  it('normalizes duplicate labels and resolves save-time custom labels transactionally', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});

    const first = await owner.mutation(createTaxonomyTerm, {
      kind: 'team',
      label: '  Client   Success ',
    });
    const duplicate = await owner.mutation(createTaxonomyTerm, {
      kind: 'team',
      label: 'client success',
    });
    const created = await owner.mutation(createDraft, {
      body: 'Build an onboarding plan.',
      teamLabel: 'Implementation Services',
      jobLabel: 'Launch a customer',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });
    const terms = await owner.query(listTaxonomyTerms, {});

    expect(duplicate.termId).toBe(first.termId);
    expect(terms.filter((term) => term.kind === 'team' && term.key === first.key)).toHaveLength(1);
    expect(terms).toContainEqual(expect.objectContaining({ kind: 'team', key: detail?.teamKey }));
    expect(terms).toContainEqual(expect.objectContaining({ kind: 'work_type', key: detail?.jobKey }));
  });

  it('isolates taxonomy by workspace and reserves maintenance for curators', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    const outsider = t.withIdentity(identity('owner_beta', 'org_beta', 'org:admin'));
    await contributor.mutation(bootstrapWorkspace, {});
    await curator.mutation(bootstrapWorkspace, {});
    await outsider.mutation(bootstrapWorkspace, {});
    const term = await contributor.mutation(createTaxonomyTerm, {
      kind: 'work_type',
      label: 'Plan a renewal',
    });

    await expect(
      contributor.mutation(updateTaxonomyTerm, { termId: term.termId, status: 'archived' }),
    ).rejects.toThrow(/curator/i);
    await expect(
      outsider.mutation(updateTaxonomyTerm, { termId: term.termId, label: 'Stolen label' }),
    ).rejects.toThrow(/not found/i);
    expect(await outsider.query(listTaxonomyTerms, { kind: 'work_type' })).not.toContainEqual(
      expect.objectContaining({ termId: term.termId }),
    );

    const renamed = await curator.mutation(updateTaxonomyTerm, {
      termId: term.termId,
      label: 'Plan the renewal',
      status: 'archived',
    });
    expect(renamed).toMatchObject({ label: 'Plan the renewal', status: 'archived' });
    expect(await contributor.query(listTaxonomyTerms, { kind: 'work_type' })).not.toContainEqual(
      expect.objectContaining({ termId: term.termId }),
    );
  });

  it('does not let contributors recreate an archived duplicate label', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    await contributor.mutation(bootstrapWorkspace, {});
    await curator.mutation(bootstrapWorkspace, {});
    const term = await contributor.mutation(createTaxonomyTerm, {
      kind: 'team',
      label: 'Customer enablement',
    });
    await curator.mutation(updateTaxonomyTerm, { termId: term.termId, status: 'archived' });

    await expect(
      contributor.mutation(createTaxonomyTerm, {
        kind: 'team',
        label: '  CUSTOMER   ENABLEMENT ',
      }),
    ).rejects.toThrow(/archived/i);
  });

  it('does not let contributors save with an archived duplicate label', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    await contributor.mutation(bootstrapWorkspace, {});
    await curator.mutation(bootstrapWorkspace, {});
    const term = await contributor.mutation(createTaxonomyTerm, {
      kind: 'work_type',
      label: 'Prepare an adoption review',
    });
    await curator.mutation(updateTaxonomyTerm, { termId: term.termId, status: 'archived' });

    await expect(
      contributor.mutation(createDraft, {
        body: 'Prepare the adoption review from verified workspace evidence.',
        jobLabel: ' prepare an ADOPTION   review ',
      }),
    ).rejects.toThrow(/archived/i);
  });

  it('updates only private draft metadata with active workspace taxonomy keys', async () => {
    const { owner, created } = await seedDraft();

    await expect(
      owner.mutation(updatePrivateDraftMetadata, {
        assetId: created.assetId,
        title: '  Updated proposal workflow  ',
        purpose: 'Keep this description exact after trimming its surrounding whitespace.',
        teamKey: 'marketing',
        jobKey: 'create-campaign',
      }),
    ).resolves.toEqual({ updated: true });
    expect(await owner.query(getAsset, { assetId: created.assetId })).toMatchObject({
      title: 'Updated proposal workflow',
      teamKey: 'marketing',
      jobKey: 'create-campaign',
    });

    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await expect(
      owner.mutation(updatePrivateDraftMetadata, {
        assetId: created.assetId,
        title: 'This must not silently change shared work',
      }),
    ).rejects.toThrow(/private draft/i);
  });
});

describe('AI Work Library version governance', () => {
  it('keeps indexed search text bounded through save, share, and approval', async () => {
    const { t, owner, created } = await seedDraft();
    const body = `<workflow>\n${'é'.repeat(249_000)}\n</workflow>`;
    const searchBytes = (value: string | undefined) =>
      new TextEncoder().encode(value ?? '').byteLength;

    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body,
      changeNote: 'Exercise a large replacement through governance.',
    });
    const saved = await t.run((ctx) => ctx.db.get('assets', created.assetId));
    expect(searchBytes(saved?.searchText)).toBeLessThanOrEqual(32_000);
    expect(searchBytes(saved?.pendingSearchText)).toBeLessThanOrEqual(32_000);

    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const shared = await t.run((ctx) => ctx.db.get('assets', created.assetId));
    expect(searchBytes(shared?.searchText)).toBeLessThanOrEqual(32_000);
    expect(searchBytes(shared?.pendingSearchText)).toBeLessThanOrEqual(32_000);

    await owner.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 2,
      scope: 'team',
      note: 'The large replacement is ready for team use.',
    });
    const approved = await t.run((ctx) => ctx.db.get('assets', created.assetId));
    expect(searchBytes(approved?.searchText)).toBeLessThanOrEqual(32_000);
    expect(searchBytes(approved?.pendingSearchText)).toBeLessThanOrEqual(32_000);
    expect((await owner.query(getAsset, { assetId: created.assetId }))?.body).toBe(body);
  });

  it('keeps prior content immutable when a contributor saves a new version', async () => {
    const { owner, created } = await seedDraft();

    const saved = await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Draft a proposal for {{client_name}} using approved {{discovery_notes}}.',
      changeNote: 'Clarify the approved source material.',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });

    expect(saved).toEqual({ versionNumber: 2 });
    expect(detail?.versionNumber).toBe(2);
    expect(detail).toMatchObject({
      title: 'Turn discovery notes into a proposal',
      purpose: 'Create a review-ready proposal without rebuilding the prompt each time.',
      kind: 'prompt',
      teamKey: 'client-delivery',
      jobKey: 'create-proposal',
      visibility: 'private',
    });
    expect(detail?.inputs).toEqual([
      { key: 'client_name', label: 'Client name', kind: 'text', required: true },
      {
        key: 'discovery_notes',
        label: 'Discovery notes',
        kind: 'long_text',
        required: true,
      },
    ]);
    expect(detail?.versions).toEqual([
      {
        versionNumber: 2,
        body: 'Draft a proposal for {{client_name}} using approved {{discovery_notes}}.',
      },
      {
        versionNumber: 1,
        body: 'Draft a proposal for {{client_name}} using {{discovery_notes}}.',
      },
    ]);
    expect(detail?.approvals).toEqual([]);
  });

  it('reconciles friendly inputs when prompt variables change in a new version', async () => {
    const { owner, created } = await seedDraft();

    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Draft for {{account_name}} using {{source_notes}} by {{due_date}}.',
      changeNote: 'Use the fields required by the revised prompt.',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });

    expect(detail?.inputs).toEqual([
      { key: 'account_name', label: 'Account name', kind: 'text', required: true },
      { key: 'source_notes', label: 'Source notes', kind: 'long_text', required: true },
      { key: 'due_date', label: 'Due date', kind: 'text', required: true },
    ]);
  });

  it('hides an edited unapproved draft from teammates until it is shared again', async () => {
    const { t, owner, created } = await seedDraft();
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Private revision for {{client_name}}.',
      changeNote: 'Revise before asking the team to review again.',
    });

    const teammateLibrary = await teammate.query(listLibrary, { scope: 'library', limit: 20 });
    const ownerWork = await owner.query(listLibrary, { scope: 'my_work', limit: 20 });
    expect(teammateLibrary.items).toEqual([]);
    expect(ownerWork.items).toEqual([
      expect.objectContaining({ assetId: created.assetId, reviewState: 'draft' }),
    ]);
  });

  it('allows curators to approve a team version and reserves workspace approval for admins', async () => {
    const { t, owner, created } = await seedDraft();

    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});
    await expect(
      contributor.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: 'Looks ready.',
      }),
    ).rejects.toThrow(/curator/i);

    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    await curator.mutation(bootstrapWorkspace, {});
    await expect(
      curator.mutation(shareAsset, {
        assetId: created.assetId,
        visibility: 'workspace',
      }),
    ).rejects.toThrow(/admin/i);
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: 'Skip review.',
      }),
    ).rejects.toThrow(/shared/i);
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: '   ',
      }),
    ).rejects.toThrow(/review note/i);
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: 'Too short',
      }),
    ).rejects.toThrow(/at least 10/i);
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'workspace',
        note: 'Publish everywhere.',
      }),
    ).rejects.toThrow(/admin/i);
    await expect(
      owner.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'workspace',
        note: 'Skip team approval.',
      }),
    ).rejects.toThrow(/team approval/i);

    const teamApproval = await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'Ready for client delivery.',
      testedModels: ['Claude Sonnet 4.5', 'GPT-5'],
    });
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 1,
        scope: 'team',
        note: 'Attempt to replace the immutable evidence.',
        testedModels: ['Different model'],
      }),
    ).rejects.toThrow(/already recorded/i);
    const workspaceQueue = await owner.query(listLibrary, { scope: 'approvals', limit: 20 });
    const workspaceApproval = await owner.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'workspace',
      note: 'Approved as a workspace standard.',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });

    expect(teamApproval).toEqual({ reviewState: 'team_approved', versionNumber: 1 });
    expect(workspaceQueue.items.map((item) => item.assetId)).toEqual([created.assetId]);
    expect(workspaceApproval).toEqual({ reviewState: 'workspace_approved', versionNumber: 1 });
    expect(detail?.approvals).toEqual([
      expect.objectContaining({
        versionNumber: 1,
        scope: 'workspace',
        note: 'Approved as a workspace standard.',
        testedModels: [],
      }),
      expect.objectContaining({
        versionNumber: 1,
        scope: 'team',
        reviewerUserId: 'https://clerk.test|curator_alpha',
        note: 'Ready for client delivery.',
        testedModels: ['Claude Sonnet 4.5', 'GPT-5'],
      }),
    ]);
  });

  it('keeps an approved version usable while its replacement returns through review', async () => {
    const { t, owner, created } = await seedDraft();
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    const teammate = t.withIdentity(
      identity('teammate_alpha', 'org_alpha', 'org:contributor'),
    );
    await curator.mutation(bootstrapWorkspace, {});
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'Approved for the client delivery team.',
    });
    await owner.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'workspace',
      note: 'Approved as the workspace standard.',
    });

    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Replacement draft for {{client_name}} using {{discovery_notes}}.',
      changeNote: 'Clarify the requested outcome.',
    });

    const liveBeforeReview = await teammate.query(getAsset, { assetId: created.assetId });
    const ownerDraft = await owner.query(getAsset, { assetId: created.assetId });
    const libraryBeforeReview = await teammate.query(listLibrary, { limit: 20 });
    expect(liveBeforeReview).toMatchObject({
      body: 'Draft a proposal for {{client_name}} using {{discovery_notes}}.',
      reviewState: 'workspace_approved',
      versionNumber: 1,
      pendingVersion: null,
    });
    expect(ownerDraft).toMatchObject({
      body: 'Draft a proposal for {{client_name}} using {{discovery_notes}}.',
      reviewState: 'workspace_approved',
      versionNumber: 1,
      pendingVersion: {
        body: 'Replacement draft for {{client_name}} using {{discovery_notes}}.',
        reviewState: 'draft',
        versionNumber: 2,
      },
    });
    expect(libraryBeforeReview.items[0]).toMatchObject({
      reviewState: 'workspace_approved',
      versionNumber: 1,
    });
    await teammate.mutation(recordAssetUse, { assetId: created.assetId, source: 'copy' });
    const usageBeforeReview = await t.run((ctx) => ctx.db.query('adoptionEvents').take(10));
    expect(usageBeforeReview.at(-1)?.versionNumber).toBe(1);

    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const approvalQueue = await curator.query(listLibrary, { scope: 'approvals', limit: 20 });
    expect(approvalQueue.items).toEqual([
      expect.objectContaining({
        assetId: created.assetId,
        lastVerifiedAt: null,
        reviewState: 'shared',
        versionNumber: 2,
      }),
    ]);

    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 2,
      scope: 'team',
      note: 'The replacement is ready for team use.',
    });
    const liveAfterReview = await teammate.query(getAsset, { assetId: created.assetId });
    expect(liveAfterReview).toMatchObject({
      body: 'Replacement draft for {{client_name}} using {{discovery_notes}}.',
      reviewState: 'team_approved',
      versionNumber: 2,
      pendingVersion: null,
    });
  });

  it('rejects an approval when the version shown to the reviewer is no longer current', async () => {
    const { t, owner, created } = await seedDraft();
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    await curator.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'Version one is approved for the team.',
    });

    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Version two is waiting for a review.',
      changeNote: 'Create the version the reviewer opens.',
    });
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const seenByReviewer = await curator.query(getAsset, { assetId: created.assetId });
    expect(seenByReviewer?.pendingVersion?.versionNumber).toBe(2);

    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Version three replaced the open review.',
      changeNote: 'Change the pending version before approval submits.',
    });
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        expectedVersionNumber: 2,
        scope: 'team',
        note: 'This evidence was written for version two.',
      }),
    ).rejects.toThrow(/changed|version/i);

    const live = await curator.query(getAsset, { assetId: created.assetId });
    expect(live).toMatchObject({ versionNumber: 1, reviewState: 'team_approved' });
    expect(live?.pendingVersion).toMatchObject({ versionNumber: 3, reviewState: 'draft' });
    const approvals = await t.run((ctx) => ctx.db.query('assetApprovals').take(20));
    expect(approvals.map((approval) => approval.versionNumber)).toEqual([1]);
  });

  it('keeps an unshared replacement draft out of a non-editor version history', async () => {
    const { t, owner, created } = await seedDraft();
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await curator.mutation(bootstrapWorkspace, {});
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'The first version is ready for team use.',
    });
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'PRIVATE PENDING DRAFT: do not disclose this text.',
      changeNote: 'Start a private replacement.',
    });

    const teammateDetail = await teammate.query(getAsset, { assetId: created.assetId });
    const ownerDetail = await owner.query(getAsset, { assetId: created.assetId });
    expect(teammateDetail?.versions).toEqual([
      expect.objectContaining({ versionNumber: 1 }),
    ]);
    expect(JSON.stringify(teammateDetail)).not.toContain('PRIVATE PENDING DRAFT');
    expect(ownerDetail?.versions).toEqual(
      expect.arrayContaining([expect.objectContaining({ body: 'PRIVATE PENDING DRAFT: do not disclose this text.' })]),
    );
  });

  it('shares only the selected current draft, not discarded private history', async () => {
    const { t, owner, created } = await seedDraft();
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'DISCARDED PRIVATE DRAFT with confidential working notes.',
      changeNote: 'Explore a private direction before sharing.',
    });
    await owner.mutation(addComment, {
      assetId: created.assetId,
      body: 'PRIVATE FEEDBACK that belongs only to the discarded draft.',
      presentedVersionNumber: 2,
    });
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Selected team draft for {{client_name}}.',
      changeNote: 'Choose the version that is safe to share.',
    });
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });

    const teammateDetail = await teammate.query(getAsset, { assetId: created.assetId });
    expect(teammateDetail?.versions).toEqual([
      { body: 'Selected team draft for {{client_name}}.', versionNumber: 3 },
    ]);
    expect(teammateDetail?.comments).toEqual([]);
    expect(JSON.stringify(teammateDetail)).not.toContain('DISCARDED PRIVATE DRAFT');
    expect(JSON.stringify(teammateDetail)).not.toContain('PRIVATE FEEDBACK');
  });

  it('searches a shared replacement in approvals without changing the trusted Library search', async () => {
    const { t, owner, created } = await seedDraft();
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await curator.mutation(bootstrapWorkspace, {});
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'Keep the first version trusted while revising it.',
    });
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'This replacement includes zirconquartzsignal for reviewer search only.',
      changeNote: 'Add unique replacement review language.',
    });
    const ownerDraftSearch = await owner.query(listLibrary, {
      scope: 'my_work',
      search: 'zirconquartzsignal',
      limit: 20,
    });
    expect(ownerDraftSearch.items).toEqual([
      expect.objectContaining({
        assetId: created.assetId,
        lastVerifiedAt: null,
        versionNumber: 2,
      }),
    ]);
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });

    const approvalSearch = await curator.query(listLibrary, {
      scope: 'approvals',
      search: 'zirconquartzsignal',
      limit: 20,
    });
    const trustedSearch = await teammate.query(listLibrary, {
      scope: 'library',
      search: 'zirconquartzsignal',
      limit: 20,
    });
    const trustedDetail = await teammate.query(getAsset, { assetId: created.assetId });

    expect(approvalSearch.items).toEqual([
      expect.objectContaining({ assetId: created.assetId, versionNumber: 2, reviewState: 'shared' }),
    ]);
    expect(trustedSearch).toEqual({ items: [], total: 0 });
    expect(trustedDetail).toMatchObject({
      versionNumber: 1,
      body: 'Draft a proposal for {{client_name}} using {{discovery_notes}}.',
    });

    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 2,
      scope: 'team',
      note: 'The replacement is ready for workspace review.',
    });
    const workspaceApprovalSearch = await owner.query(listLibrary, {
      scope: 'approvals',
      search: 'zirconquartzsignal',
      limit: 20,
    });
    expect(workspaceApprovalSearch.items).toEqual([
      expect.objectContaining({
        assetId: created.assetId,
        versionNumber: 2,
        reviewState: 'team_approved',
      }),
    ]);
  });

  it('links feedback to the exact use or review version and rejects an unpresented version', async () => {
    const { t, owner, created } = await seedDraft();
    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    const teammate = t.withIdentity(identity('teammate_alpha', 'org_alpha', 'org:contributor'));
    await curator.mutation(bootstrapWorkspace, {});
    await teammate.mutation(bootstrapWorkspace, {});
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await curator.mutation(approveAsset, {
      assetId: created.assetId,
      expectedVersionNumber: 1,
      scope: 'team',
      note: 'The first version is ready to use.',
    });
    await owner.mutation(saveVersion, {
      assetId: created.assetId,
      body: 'Version two is available for a focused review.',
      changeNote: 'Prepare the next review version.',
    });
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });

    await expect(
      teammate.mutation(addComment, {
        assetId: created.assetId,
        body: 'The live version worked for our proposal handoff.',
        presentedVersionNumber: 1,
      }),
    ).resolves.toEqual({ versionNumber: 1 });
    await expect(
      curator.mutation(addComment, {
        assetId: created.assetId,
        body: 'The review version needs a stronger exclusions section.',
        presentedVersionNumber: 2,
      }),
    ).resolves.toEqual({ versionNumber: 2 });
    await expect(
      teammate.mutation(addComment, {
        assetId: created.assetId,
        body: 'This must not attach to an unseen version.',
        presentedVersionNumber: 99,
      }),
    ).rejects.toThrow(/presented|version/i);

    const detail = await curator.query(getAsset, { assetId: created.assetId });
    expect(detail?.comments).toEqual([
      expect.objectContaining({ versionNumber: 2 }),
      expect.objectContaining({ versionNumber: 1 }),
    ]);
  });

  it('keeps favorites personal and comments linked to the reviewed version', async () => {
    const { t, owner, created } = await seedDraft();
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});

    expect(await contributor.mutation(toggleFavorite, { assetId: created.assetId })).toEqual({
      isFavorite: true,
    });
    expect(
      await contributor.mutation(addComment, {
        assetId: created.assetId,
        body: 'Worked well after adding the client constraints.',
        presentedVersionNumber: 1,
      }),
    ).toEqual({ versionNumber: 1 });

    const contributorDetail = await contributor.query(getAsset, { assetId: created.assetId });
    const ownerDetail = await owner.query(getAsset, { assetId: created.assetId });
    const contributorLibrary = await contributor.query(listLibrary, { limit: 20 });
    const ownerLibrary = await owner.query(listLibrary, { limit: 20 });
    expect(contributorDetail?.isFavorite).toBe(true);
    expect(ownerDetail?.isFavorite).toBe(false);
    expect(contributorDetail?.canEdit).toBe(false);
    expect(ownerDetail?.canEdit).toBe(true);
    expect(contributorLibrary.items[0]?.isFavorite).toBe(true);
    expect(ownerLibrary.items[0]?.isFavorite).toBe(false);
    expect(ownerDetail?.comments).toEqual([
      { body: 'Worked well after adding the client constraints.', versionNumber: 1 },
    ]);
  });

  it('records real cross-user reuse against the workspace and immutable version', async () => {
    const { t, owner, created } = await seedDraft();
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});

    await expect(
      contributor.mutation(recordAssetUse, { assetId: created.assetId, source: 'copy' }),
    ).resolves.toEqual({ recorded: true });

    const events = await t.run((ctx) => ctx.db.query('adoptionEvents').take(20));
    const aggregates = await t.run((ctx) => ctx.db.query('dailyAdoptionAggregates').take(20));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      assetId: created.assetId,
      actorUserId: 'https://clerk.test|contributor_alpha',
      assetOwnerUserId: 'https://clerk.test|owner_alpha',
      eventType: 'asset_used',
      source: 'copy',
      versionNumber: 1,
    });
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0]).toMatchObject({ eventType: 'asset_used', count: 1 });
  });
});
