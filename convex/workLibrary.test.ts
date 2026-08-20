/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

type WorkspaceSummary = {
  workspaceId: string;
  name: string;
  role: 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer';
};

type AssetSummary = {
  assetId: string;
  title: string;
  purpose: string;
  kind: 'prompt' | 'playbook';
  teamKey: string;
  jobKey: string;
  visibility: 'private' | 'team' | 'workspace';
  ownerUserId: string;
  reviewState: 'draft' | 'shared' | 'team_approved' | 'workspace_approved' | 'archived';
  versionNumber: number;
};

type AssetDetail = AssetSummary & {
  body: string;
  inputs: Array<{ key: string; label: string; kind: 'text' | 'long_text'; required: boolean }>;
  versions: Array<{ versionNumber: number; body: string }>;
  approvals: Array<{ versionNumber: number; scope: 'team' | 'workspace' }>;
  isFavorite: boolean;
  comments: Array<{ body: string; versionNumber: number }>;
};

const bootstrapWorkspace = makeFunctionReference<'mutation', Record<string, never>, WorkspaceSummary>(
  'workLibrary:bootstrapWorkspace',
);
const createDraft = makeFunctionReference<
  'mutation',
  {
    title: string;
    purpose: string;
    body: string;
    teamKey: string;
    jobKey: string;
    kind?: 'prompt' | 'playbook';
    inputs?: Array<{
      key: string;
      label: string;
      kind: 'text' | 'long_text';
      required: boolean;
    }>;
  },
  { assetId: string; versionNumber: number }
>('workLibrary:createDraft');
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
  { assetId: string; scope: 'team' | 'workspace'; note: string },
  { reviewState: 'team_approved' | 'workspace_approved'; versionNumber: number }
>('workLibrary:approveAsset');
const toggleFavorite = makeFunctionReference<
  'mutation',
  { assetId: string },
  { isFavorite: boolean }
>('workLibrary:toggleFavorite');
const addComment = makeFunctionReference<
  'mutation',
  { assetId: string; body: string },
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
  orgRole: 'org:admin' | 'org:curator' | 'org:contributor' | 'org:viewer',
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

  it('synchronizes non-owner access when the Clerk organization role changes', async () => {
    const t = convexTest(schema, modules);
    const contributor = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:contributor'));
    const curator = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:curator'));
    const viewer = t.withIdentity(identity('member_alpha', 'org_alpha', 'org:viewer'));

    expect(await contributor.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'contributor' });
    expect(await curator.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'curator' });
    expect(await viewer.mutation(bootstrapWorkspace, {})).toMatchObject({ role: 'viewer' });
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

  it('enforces content boundaries in the domain layer, not only in the form', async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity('owner_alpha', 'org_alpha', 'org:admin'));
    await owner.mutation(bootstrapWorkspace, {});
    await expect(
      owner.mutation(createDraft, {
        title: '   ',
        purpose: 'Useful outcome',
        body: 'Prompt body',
        teamKey: 'marketing',
        jobKey: 'create-campaign',
      }),
    ).rejects.toThrow(/title/i);
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
  });
});

describe('AI Work Library version governance', () => {
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

  it('allows curators to approve a team version and reserves workspace approval for admins', async () => {
    const { t, owner, created } = await seedDraft();

    const contributor = t.withIdentity(
      identity('contributor_alpha', 'org_alpha', 'org:contributor'),
    );
    await contributor.mutation(bootstrapWorkspace, {});
    await expect(
      contributor.mutation(approveAsset, {
        assetId: created.assetId,
        scope: 'team',
        note: 'Looks ready.',
      }),
    ).rejects.toThrow(/curator/i);

    const curator = t.withIdentity(identity('curator_alpha', 'org_alpha', 'org:curator'));
    await curator.mutation(bootstrapWorkspace, {});
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        scope: 'team',
        note: 'Skip review.',
      }),
    ).rejects.toThrow(/shared/i);
    await owner.mutation(shareAsset, { assetId: created.assetId, visibility: 'team' });
    await expect(
      curator.mutation(approveAsset, {
        assetId: created.assetId,
        scope: 'workspace',
        note: 'Publish everywhere.',
      }),
    ).rejects.toThrow(/admin/i);
    await expect(
      owner.mutation(approveAsset, {
        assetId: created.assetId,
        scope: 'workspace',
        note: 'Skip team approval.',
      }),
    ).rejects.toThrow(/team approval/i);

    const teamApproval = await curator.mutation(approveAsset, {
      assetId: created.assetId,
      scope: 'team',
      note: 'Ready for client delivery.',
    });
    const workspaceApproval = await owner.mutation(approveAsset, {
      assetId: created.assetId,
      scope: 'workspace',
      note: 'Approved as a workspace standard.',
    });
    const detail = await owner.query(getAsset, { assetId: created.assetId });

    expect(teamApproval).toEqual({ reviewState: 'team_approved', versionNumber: 1 });
    expect(workspaceApproval).toEqual({ reviewState: 'workspace_approved', versionNumber: 1 });
    expect(detail?.approvals).toEqual([
      { versionNumber: 1, scope: 'workspace' },
      { versionNumber: 1, scope: 'team' },
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
      }),
    ).toEqual({ versionNumber: 1 });

    const contributorDetail = await contributor.query(getAsset, { assetId: created.assetId });
    const ownerDetail = await owner.query(getAsset, { assetId: created.assetId });
    expect(contributorDetail?.isFavorite).toBe(true);
    expect(ownerDetail?.isFavorite).toBe(false);
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
