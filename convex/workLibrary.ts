import { v } from 'convex/values';
import type { UserIdentity } from 'convex/server';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
  assetKindValidator,
  inputDefinitionValidator,
  visibilityValidator,
  type ReviewState,
  type WorkspaceRole,
} from './lib/workLibraryValidators';
import { STARTER_ASSETS, type StarterAsset } from './lib/starterAssets';

type FunctionCtx = QueryCtx | MutationCtx;

type SessionScope = {
  externalWorkspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId: string;
  displayName: string;
  email?: string;
  claimedRole: WorkspaceRole;
};

type WorkspaceAccess = SessionScope & {
  workspace: Doc<'workspaces'>;
  membership: Doc<'memberships'>;
};

function claim(identity: UserIdentity, key: string): string | undefined {
  const value = identity[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'workspace';
}

function requiredText(label: string, value: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength.toLocaleString('en-US')} characters or fewer`);
  }
  return normalized;
}

function exactBody(value: string): string {
  if (!value.trim()) throw new Error('Prompt content is required');
  if (value.length > 500_000) throw new Error('Prompt content must be 500,000 characters or fewer');
  return value;
}

function roleFromClaim(value?: string): WorkspaceRole {
  if (value === 'org:admin') return 'admin';
  if (value === 'org:curator') return 'curator';
  if (value === 'org:viewer') return 'viewer';
  return 'contributor';
}

async function resolveSession(ctx: FunctionCtx): Promise<SessionScope> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');
  const orgId = claim(identity, 'org_id');
  const workspaceName = claim(identity, 'org_name') ?? identity.name ?? 'My workspace';
  return {
    externalWorkspaceId: orgId ?? `personal:${identity.tokenIdentifier}`,
    workspaceName,
    workspaceSlug: claim(identity, 'org_slug') ?? slugify(workspaceName),
    userId: identity.tokenIdentifier,
    displayName: identity.name ?? identity.email ?? 'Roster member',
    email: identity.email,
    claimedRole: orgId ? roleFromClaim(claim(identity, 'org_role')) : 'owner',
  };
}

async function workspaceByExternalId(ctx: FunctionCtx, externalId: string) {
  return await ctx.db
    .query('workspaces')
    .withIndex('by_external_id', (q) => q.eq('externalId', externalId))
    .unique();
}

async function membershipFor(ctx: FunctionCtx, workspaceId: Id<'workspaces'>, userId: string) {
  return await ctx.db
    .query('memberships')
    .withIndex('by_workspace_id_and_user_id', (q) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId),
    )
    .unique();
}

async function requireWorkspaceAccess(ctx: FunctionCtx): Promise<WorkspaceAccess> {
  const session = await resolveSession(ctx);
  const workspace = await workspaceByExternalId(ctx, session.externalWorkspaceId);
  if (!workspace) throw new Error('Workspace is not initialized');
  const membership = await membershipFor(ctx, workspace._id, session.userId);
  if (!membership) throw new Error('Workspace membership is required');
  return { ...session, workspace, membership };
}

function canContribute(role: WorkspaceRole): boolean {
  return role !== 'viewer';
}

function canCurate(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'curator';
}

function canAdminister(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

function assertAssetAccess(asset: Doc<'assets'> | null, workspaceId: Id<'workspaces'>) {
  return asset?.workspaceId === workspaceId ? asset : null;
}

function assertEditable(asset: Doc<'assets'>, access: WorkspaceAccess): void {
  if (!canContribute(access.membership.role)) throw new Error('Contributor access is required');
  if (asset.ownerUserId !== access.userId && !canCurate(access.membership.role)) {
    throw new Error('Only the owner or a curator can edit this asset');
  }
}

function reviewStateForApproval(scope: 'team' | 'workspace'): ReviewState {
  return scope === 'workspace' ? 'workspace_approved' : 'team_approved';
}

const usageSourceValidator = v.union(
  v.literal('copy'),
  v.literal('export'),
  v.literal('mcp'),
  v.literal('test'),
  v.literal('playbook'),
);

async function incrementDailyUse(ctx: MutationCtx, workspaceId: Id<'workspaces'>, now: number) {
  const date = new Date(now).toISOString().slice(0, 10);
  const aggregate = await ctx.db
    .query('dailyAdoptionAggregates')
    .withIndex('by_workspace_id_and_date_and_event_type', (q) =>
      q.eq('workspaceId', workspaceId).eq('date', date).eq('eventType', 'asset_used'),
    )
    .unique();
  if (aggregate) {
    await ctx.db.patch('dailyAdoptionAggregates', aggregate._id, {
      count: aggregate.count + 1,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.insert('dailyAdoptionAggregates', {
    workspaceId,
    date,
    eventType: 'asset_used',
    count: 1,
    updatedAt: now,
  });
}

function starterInputs(body: string) {
  const keys = [...body.matchAll(/\{\{([a-z][a-z0-9_]{0,63})\}\}/g)].map((match) => match[1]);
  return [...new Set(keys)].map((key) => ({
    key,
    label: key.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()),
    kind: key.includes('notes') || key.includes('content') || key.includes('document')
      ? ('long_text' as const)
      : ('text' as const),
    required: true,
  }));
}

async function insertStarterAsset(ctx: MutationCtx, access: WorkspaceAccess, item: StarterAsset) {
  const now = Date.now();
  const assetId = await ctx.db.insert('assets', {
    workspaceId: access.workspace._id,
    kind: 'prompt',
    title: item.title,
    purpose: item.purpose,
    searchText: `${item.title} ${item.purpose} ${item.body}`.toLowerCase(),
    teamKey: item.teamKey,
    jobKey: item.jobKey,
    visibility: 'team',
    reviewState: 'shared',
    ownerUserId: access.userId,
    starterKey: item.key,
    latestVersionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  const versionId = await ctx.db.insert('assetVersions', {
    workspaceId: access.workspace._id,
    assetId,
    versionNumber: 1,
    body: item.body,
    inputs: starterInputs(item.body),
    variants: [],
    changeNote: 'Roster starter draft',
    authorUserId: access.userId,
    createdAt: now,
  });
  await ctx.db.patch('assets', assetId, { currentVersionId: versionId });
}

export const bootstrapWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const session = await resolveSession(ctx);
    const now = Date.now();
    let workspace = await workspaceByExternalId(ctx, session.externalWorkspaceId);
    let created = false;
    if (!workspace) {
      const workspaceId = await ctx.db.insert('workspaces', {
        externalId: session.externalWorkspaceId,
        slug: session.workspaceSlug,
        name: session.workspaceName,
        createdByUserId: session.userId,
        createdAt: now,
        updatedAt: now,
      });
      workspace = await ctx.db.get('workspaces', workspaceId);
      created = true;
    }
    if (!workspace) throw new Error('Workspace initialization failed');

    let membership = await membershipFor(ctx, workspace._id, session.userId);
    if (!membership) {
      const firstMemberRole = session.externalWorkspaceId.startsWith('personal:')
        ? 'owner'
        : session.claimedRole === 'admin'
          ? 'owner'
          : session.claimedRole;
      const membershipId = await ctx.db.insert('memberships', {
        workspaceId: workspace._id,
        userId: session.userId,
        role: created ? firstMemberRole : session.claimedRole,
        displayName: session.displayName,
        email: session.email,
        createdAt: now,
        updatedAt: now,
      });
      membership = await ctx.db.get('memberships', membershipId);
    } else if (membership.role !== 'owner' && membership.role !== session.claimedRole) {
      await ctx.db.patch('memberships', membership._id, {
        role: session.claimedRole,
        displayName: session.displayName,
        email: session.email,
        updatedAt: now,
      });
      membership = await ctx.db.get('memberships', membership._id);
    }
    if (!membership) throw new Error('Membership initialization failed');
    return { workspaceId: workspace._id, name: workspace.name, role: membership.role };
  },
});

export const createDraft = mutation({
  args: {
    title: v.string(),
    purpose: v.string(),
    body: v.string(),
    teamKey: v.string(),
    jobKey: v.string(),
    kind: v.optional(assetKindValidator),
    inputs: v.optional(v.array(inputDefinitionValidator)),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    if (!canContribute(access.membership.role)) throw new Error('Contributor access is required');
    const title = requiredText('Title', args.title, 160);
    const purpose = requiredText('Purpose', args.purpose, 1_000);
    const teamKey = requiredText('Team', args.teamKey, 80);
    const jobKey = requiredText('Job to be done', args.jobKey, 80);
    const body = exactBody(args.body);
    const now = Date.now();
    const assetId = await ctx.db.insert('assets', {
      workspaceId: access.workspace._id,
      kind: args.kind ?? 'prompt',
      title,
      purpose,
      searchText: `${title} ${purpose} ${body}`.toLowerCase(),
      teamKey,
      jobKey,
      visibility: 'private',
      reviewState: 'draft',
      ownerUserId: access.userId,
      latestVersionNumber: 1,
      createdAt: now,
      updatedAt: now,
    });
    const versionId = await ctx.db.insert('assetVersions', {
      workspaceId: access.workspace._id,
      assetId,
      versionNumber: 1,
      body,
      inputs: args.inputs ?? [],
      variants: [],
      changeNote: 'Initial draft',
      authorUserId: access.userId,
      createdAt: now,
    });
    await ctx.db.patch('assets', assetId, { currentVersionId: versionId });
    return { assetId, versionNumber: 1 };
  },
});

export const listLibrary = query({
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    teamKey: v.optional(v.string()),
    jobKey: v.optional(v.string()),
    scope: v.optional(v.union(v.literal('library'), v.literal('my_work'), v.literal('approvals'))),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const rows =
      args.scope === 'my_work'
        ? await ctx.db
            .query('assets')
            .withIndex('by_workspace_id_and_owner_user_id_and_updated_at', (q) =>
              q.eq('workspaceId', access.workspace._id).eq('ownerUserId', access.userId),
            )
            .order('desc')
            .take(limit)
        : await ctx.db
            .query('assets')
            .withIndex('by_workspace_id_and_updated_at', (q) =>
              q.eq('workspaceId', access.workspace._id),
            )
            .order('desc')
            .take(limit);
    const search = args.search?.trim().toLowerCase();
    const visible = rows.filter((asset) => {
      if (asset.visibility === 'private' && asset.ownerUserId !== access.userId) return false;
      if (args.teamKey && asset.teamKey !== args.teamKey) return false;
      if (args.jobKey && asset.jobKey !== args.jobKey) return false;
      if (args.scope === 'approvals' && asset.reviewState !== 'shared') return false;
      return !search || asset.searchText.includes(search);
    });
    return {
      items: visible.map((asset) => ({
        assetId: asset._id,
        title: asset.title,
        purpose: asset.purpose,
        kind: asset.kind,
        teamKey: asset.teamKey,
        jobKey: asset.jobKey,
        visibility: asset.visibility,
        ownerUserId: asset.ownerUserId,
        reviewState: asset.reviewState,
        versionNumber: asset.latestVersionNumber,
        lastVerifiedAt: asset.lastVerifiedAt ?? null,
        updatedAt: asset.updatedAt,
      })),
      total: visible.length,
    };
  },
});

export const getAsset = query({
  args: { assetId: v.id('assets') },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset) return null;
    if (asset.visibility === 'private' && asset.ownerUserId !== access.userId) return null;
    const versions = await ctx.db
      .query('assetVersions')
      .withIndex('by_asset_id_and_version_number', (q) => q.eq('assetId', asset._id))
      .order('desc')
      .take(50);
    const approvals = await ctx.db
      .query('assetApprovals')
      .withIndex('by_asset_id_and_created_at', (q) => q.eq('assetId', asset._id))
      .order('desc')
      .take(50);
    const favorite = await ctx.db
      .query('assetFavorites')
      .withIndex('by_asset_id_and_user_id', (q) =>
        q.eq('assetId', asset._id).eq('userId', access.userId),
      )
      .unique();
    const comments = await ctx.db
      .query('assetComments')
      .withIndex('by_asset_id_and_created_at', (q) => q.eq('assetId', asset._id))
      .order('desc')
      .take(50);
    const current = versions.find((version) => version._id === asset.currentVersionId);
    if (!current) throw new Error('Asset version is missing');
    return {
      assetId: asset._id,
      title: asset.title,
      purpose: asset.purpose,
      kind: asset.kind,
      teamKey: asset.teamKey,
      jobKey: asset.jobKey,
      visibility: asset.visibility,
      ownerUserId: asset.ownerUserId,
      reviewState: asset.reviewState,
      versionNumber: current.versionNumber,
      body: current.body,
      inputs: current.inputs,
      variants: current.variants,
      lastVerifiedAt: asset.lastVerifiedAt ?? null,
      updatedAt: asset.updatedAt,
      isFavorite: Boolean(favorite),
      comments: comments.map((comment) => ({
        body: comment.body,
        versionNumber: comment.versionNumber,
      })),
      versions: versions.map((version) => ({
        versionNumber: version.versionNumber,
        body: version.body,
      })),
      approvals: approvals.map((approval) => ({
        versionNumber: approval.versionNumber,
        scope: approval.scope,
      })),
    };
  },
});

export const saveVersion = mutation({
  args: { assetId: v.id('assets'), body: v.string(), changeNote: v.string() },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset) throw new Error('Asset not found');
    assertEditable(asset, access);
    const body = exactBody(args.body);
    const changeNote = requiredText('Change note', args.changeNote, 1_000);
    const now = Date.now();
    const versionNumber = asset.latestVersionNumber + 1;
    const currentVersion = asset.currentVersionId
      ? await ctx.db.get('assetVersions', asset.currentVersionId)
      : null;
    if (!currentVersion) throw new Error('Asset version is missing');
    const versionId = await ctx.db.insert('assetVersions', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      versionNumber,
      body,
      inputs: currentVersion.inputs,
      variants: currentVersion.variants,
      changeNote,
      authorUserId: access.userId,
      createdAt: now,
    });
    await ctx.db.patch('assets', asset._id, {
      currentVersionId: versionId,
      latestVersionNumber: versionNumber,
      reviewState: 'draft',
      searchText: `${asset.title} ${asset.purpose} ${body}`.toLowerCase(),
      updatedAt: now,
    });
    return { versionNumber };
  },
});

export const shareAsset = mutation({
  args: { assetId: v.id('assets'), visibility: visibilityValidator },
  handler: async (ctx, args) => {
    if (args.visibility === 'private') throw new Error('Shared visibility is required');
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset) throw new Error('Asset not found');
    assertEditable(asset, access);
    if (asset.reviewState !== 'draft' && asset.reviewState !== 'shared') {
      throw new Error('Approved or archived work cannot be returned to shared review');
    }
    await ctx.db.patch('assets', asset._id, {
      visibility: args.visibility,
      reviewState: 'shared',
      updatedAt: Date.now(),
    });
    return { reviewState: 'shared' as const };
  },
});

export const approveAsset = mutation({
  args: {
    assetId: v.id('assets'),
    scope: v.union(v.literal('team'), v.literal('workspace')),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    if (args.scope === 'workspace' && !canAdminister(access.membership.role)) {
      throw new Error('Admin access is required for workspace approval');
    }
    if (args.scope === 'team' && !canCurate(access.membership.role)) {
      throw new Error('Curator access is required for team approval');
    }
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset?.currentVersionId) throw new Error('Asset not found');
    if (args.scope === 'team' && !['shared', 'team_approved'].includes(asset.reviewState)) {
      throw new Error('The current version must be shared before team approval');
    }
    if (
      args.scope === 'workspace' &&
      !['team_approved', 'workspace_approved'].includes(asset.reviewState)
    ) {
      throw new Error('Team approval is required before workspace approval');
    }
    const existing = await ctx.db
      .query('assetApprovals')
      .withIndex('by_version_id_and_scope', (q) =>
        q.eq('versionId', asset.currentVersionId!).eq('scope', args.scope),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert('assetApprovals', {
        workspaceId: access.workspace._id,
        assetId: asset._id,
        versionId: asset.currentVersionId,
        versionNumber: asset.latestVersionNumber,
        scope: args.scope,
        reviewerUserId: access.userId,
        note: args.note,
        testedModels: [],
        createdAt: Date.now(),
      });
    }
    const reviewState = reviewStateForApproval(args.scope);
    await ctx.db.patch('assets', asset._id, {
      reviewState,
      visibility: args.scope === 'workspace' ? 'workspace' : 'team',
      lastVerifiedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { reviewState, versionNumber: asset.latestVersionNumber };
  },
});

export const toggleFavorite = mutation({
  args: { assetId: v.id('assets') },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset || (asset.visibility === 'private' && asset.ownerUserId !== access.userId)) {
      throw new Error('Asset not found');
    }
    const existing = await ctx.db
      .query('assetFavorites')
      .withIndex('by_asset_id_and_user_id', (q) =>
        q.eq('assetId', asset._id).eq('userId', access.userId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete('assetFavorites', existing._id);
      return { isFavorite: false };
    }
    await ctx.db.insert('assetFavorites', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      userId: access.userId,
      createdAt: Date.now(),
    });
    return { isFavorite: true };
  },
});

export const addComment = mutation({
  args: { assetId: v.id('assets'), body: v.string() },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset?.currentVersionId) throw new Error('Asset not found');
    if (asset.visibility === 'private' && asset.ownerUserId !== access.userId) {
      throw new Error('Asset not found');
    }
    const body = requiredText('Comment', args.body, 5_000);
    await ctx.db.insert('assetComments', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      versionId: asset.currentVersionId,
      versionNumber: asset.latestVersionNumber,
      authorUserId: access.userId,
      body,
      createdAt: Date.now(),
    });
    return { versionNumber: asset.latestVersionNumber };
  },
});

export const recordAssetUse = mutation({
  args: { assetId: v.id('assets'), source: usageSourceValidator },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset || (asset.visibility === 'private' && asset.ownerUserId !== access.userId)) {
      throw new Error('Asset not found');
    }
    const now = Date.now();
    await ctx.db.insert('adoptionEvents', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      actorUserId: access.userId,
      assetOwnerUserId: asset.ownerUserId,
      eventType: 'asset_used',
      source: args.source,
      versionNumber: asset.latestVersionNumber,
      createdAt: now,
    });
    await incrementDailyUse(ctx, access.workspace._id, now);
    return { recorded: true as const };
  },
});

export const seedStarterLibrary = mutation({
  args: {},
  handler: async (ctx) => {
    const access = await requireWorkspaceAccess(ctx);
    if (!canAdminister(access.membership.role)) throw new Error('Admin access is required');
    let created = 0;
    let existing = 0;
    for (const item of STARTER_ASSETS) {
      const found = await ctx.db
        .query('assets')
        .withIndex('by_workspace_id_and_starter_key', (q) =>
          q.eq('workspaceId', access.workspace._id).eq('starterKey', item.key),
        )
        .unique();
      if (found) {
        existing += 1;
      } else {
        await insertStarterAsset(ctx, access, item);
        created += 1;
      }
    }
    return { created, existing };
  },
});
