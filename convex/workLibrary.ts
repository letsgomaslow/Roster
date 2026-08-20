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
import {
  DEFAULT_TAXONOMY_TERMS,
  boundedSearchText,
  cleanTaxonomyLabel,
  fallbackDraftTitle,
  normalizeTaxonomyLabel,
  optionalMetadataText,
  taxonomyKey,
  taxonomyKindValidator,
  taxonomyStatusValidator,
  type TaxonomyKind,
} from './lib/workLibraryTaxonomy';

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

function normalizeTestedModels(values: string[] | undefined): string[] {
  if (!values) return [];
  if (values.length > 20) throw new Error('Tested models must contain 20 entries or fewer');
  return [...new Set(values.map((value) => requiredText('Tested model', value, 120)))];
}

function roleFromClaim(value?: string): WorkspaceRole {
  if (value === 'org:owner') return 'owner';
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
  const role = authoritativeRole(session, membership.role);
  return {
    ...session,
    workspace,
    membership: role === membership.role ? membership : { ...membership, role },
  };
}

function authoritativeRole(session: SessionScope, storedRole: WorkspaceRole): WorkspaceRole {
  if (session.externalWorkspaceId.startsWith('personal:')) return 'owner';
  if (storedRole === 'owner' && session.claimedRole === 'admin') return 'owner';
  return session.claimedRole;
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

function canEditAsset(asset: Doc<'assets'>, access: WorkspaceAccess): boolean {
  return (
    canContribute(access.membership.role) &&
    (asset.ownerUserId === access.userId || canCurate(access.membership.role))
  );
}

function assertEditable(asset: Doc<'assets'>, access: WorkspaceAccess): void {
  if (!canContribute(access.membership.role)) throw new Error('Contributor access is required');
  if (!canEditAsset(asset, access)) {
    throw new Error('Only the owner or a curator can edit this asset');
  }
}

function taxonomyTermResult(term: Doc<'taxonomyTerms'>) {
  return {
    termId: term._id,
    kind: term.kind,
    key: term.key,
    label: term.label,
    status: term.status,
    sortOrder: term.sortOrder,
  };
}

async function taxonomyTermByKey(
  ctx: FunctionCtx,
  workspaceId: Id<'workspaces'>,
  kind: TaxonomyKind,
  key: string,
) {
  return await ctx.db
    .query('taxonomyTerms')
    .withIndex('by_workspace_id_and_kind_and_key', (q) =>
      q.eq('workspaceId', workspaceId).eq('kind', kind).eq('key', key),
    )
    .unique();
}

async function ensureDefaultTaxonomyTerms(
  ctx: MutationCtx,
  workspaceId: Id<'workspaces'>,
  userId: string,
  now: number,
) {
  for (const [sortOrder, item] of DEFAULT_TAXONOMY_TERMS.entries()) {
    const existing = await taxonomyTermByKey(ctx, workspaceId, item.kind, item.key);
    if (existing) continue;
    await ctx.db.insert('taxonomyTerms', {
      workspaceId,
      ...item,
      normalizedLabel: normalizeTaxonomyLabel(item.label),
      status: 'active',
      sortOrder,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function uniqueTaxonomyKey(
  ctx: MutationCtx,
  workspaceId: Id<'workspaces'>,
  kind: TaxonomyKind,
  label: string,
) {
  const base = taxonomyKey(label);
  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await taxonomyTermByKey(ctx, workspaceId, kind, candidate))) return candidate;
  }
  throw new Error('Could not create a unique taxonomy key');
}

async function upsertTaxonomyTerm(
  ctx: MutationCtx,
  access: WorkspaceAccess,
  kind: TaxonomyKind,
  rawLabel: string,
) {
  const label = cleanTaxonomyLabel(rawLabel);
  const normalizedLabel = normalizeTaxonomyLabel(label);
  const existing = await ctx.db
    .query('taxonomyTerms')
    .withIndex('by_workspace_id_and_kind_and_normalized_label', (q) =>
      q
        .eq('workspaceId', access.workspace._id)
        .eq('kind', kind)
        .eq('normalizedLabel', normalizedLabel),
    )
    .unique();
  if (existing?.status === 'archived') {
    throw new Error('Archived taxonomy terms cannot be reused');
  }
  if (existing) return existing;
  const now = Date.now();
  const termId = await ctx.db.insert('taxonomyTerms', {
    workspaceId: access.workspace._id,
    kind,
    key: await uniqueTaxonomyKey(ctx, access.workspace._id, kind, label),
    label,
    normalizedLabel,
    status: 'active',
    sortOrder: now,
    createdByUserId: access.userId,
    createdAt: now,
    updatedAt: now,
  });
  const term = await ctx.db.get('taxonomyTerms', termId);
  if (!term) throw new Error('Taxonomy term creation failed');
  return term;
}

async function resolveActiveTaxonomyKey(
  ctx: MutationCtx,
  access: WorkspaceAccess,
  kind: TaxonomyKind,
  rawKey: string | undefined,
) {
  const key = optionalMetadataText(rawKey, kind === 'team' ? 'Team' : 'Work type', 80);
  if (!key) return undefined;
  const term = await taxonomyTermByKey(ctx, access.workspace._id, kind, key);
  if (!term || term.status !== 'active') throw new Error('Active workspace taxonomy term is required');
  return term.key;
}

function reviewStateForApproval(scope: 'team' | 'workspace'): ReviewState {
  return scope === 'workspace' ? 'workspace_approved' : 'team_approved';
}

type ApprovedReviewState = 'team_approved' | 'workspace_approved';

function isApprovedReviewState(state: ReviewState): state is ApprovedReviewState {
  return state === 'team_approved' || state === 'workspace_approved';
}

function approvedVersionFor(asset: Doc<'assets'>) {
  if (
    asset.approvedVersionId &&
    asset.approvedVersionNumber &&
    asset.approvedReviewState &&
    isApprovedReviewState(asset.approvedReviewState)
  ) {
    return {
      versionId: asset.approvedVersionId,
      versionNumber: asset.approvedVersionNumber,
      reviewState: asset.approvedReviewState,
    };
  }
  if (asset.currentVersionId && isApprovedReviewState(asset.reviewState)) {
    return {
      versionId: asset.currentVersionId,
      versionNumber: asset.latestVersionNumber,
      reviewState: asset.reviewState,
    };
  }
  return null;
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

function reconcileInputs(body: string, existing: Doc<'assetVersions'>['inputs']) {
  const existingByKey = new Map(existing.map((input) => [input.key, input]));
  return starterInputs(body).map((input) => existingByKey.get(input.key) ?? input);
}

async function insertStarterAsset(ctx: MutationCtx, access: WorkspaceAccess, item: StarterAsset) {
  const now = Date.now();
  const assetId = await ctx.db.insert('assets', {
    workspaceId: access.workspace._id,
    kind: 'prompt',
    title: item.title,
    purpose: item.purpose,
    searchText: `${item.title} ${item.purpose} ${item.body}`.toLowerCase(),
    pendingSearchText: `${item.title} ${item.purpose} ${item.body}`.toLowerCase(),
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
    } else if (membership.role !== authoritativeRole(session, membership.role)) {
      await ctx.db.patch('memberships', membership._id, {
        role: authoritativeRole(session, membership.role),
        displayName: session.displayName,
        email: session.email,
        updatedAt: now,
      });
      membership = await ctx.db.get('memberships', membership._id);
    }
    if (!membership) throw new Error('Membership initialization failed');
    await ensureDefaultTaxonomyTerms(ctx, workspace._id, session.userId, now);
    return { workspaceId: workspace._id, name: workspace.name, role: membership.role };
  },
});

export const listTaxonomyTerms = query({
  args: { kind: v.optional(taxonomyKindValidator) },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const kinds: TaxonomyKind[] = args.kind ? [args.kind] : ['team', 'work_type'];
    const groups = await Promise.all(
      kinds.map((kind) =>
        ctx.db
          .query('taxonomyTerms')
          .withIndex('by_workspace_id_and_kind_and_status_and_sort_order', (q) =>
            q
              .eq('workspaceId', access.workspace._id)
              .eq('kind', kind)
              .eq('status', 'active'),
          )
          .take(500),
      ),
    );
    return groups.flat().map(taxonomyTermResult);
  },
});

export const createTaxonomyTerm = mutation({
  args: { kind: taxonomyKindValidator, label: v.string() },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    if (!canContribute(access.membership.role)) throw new Error('Contributor access is required');
    await ensureDefaultTaxonomyTerms(ctx, access.workspace._id, access.userId, Date.now());
    return taxonomyTermResult(await upsertTaxonomyTerm(ctx, access, args.kind, args.label));
  },
});

export const updateTaxonomyTerm = mutation({
  args: {
    termId: v.id('taxonomyTerms'),
    label: v.optional(v.string()),
    status: v.optional(taxonomyStatusValidator),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    if (!canCurate(access.membership.role)) throw new Error('Curator access is required');
    const term = await ctx.db.get('taxonomyTerms', args.termId);
    if (!term || term.workspaceId !== access.workspace._id) throw new Error('Taxonomy term not found');
    if (args.label === undefined && args.status === undefined) {
      throw new Error('A taxonomy label or status change is required');
    }
    const label = args.label === undefined ? term.label : cleanTaxonomyLabel(args.label);
    const normalizedLabel = normalizeTaxonomyLabel(label);
    const duplicate = await ctx.db
      .query('taxonomyTerms')
      .withIndex('by_workspace_id_and_kind_and_normalized_label', (q) =>
        q
          .eq('workspaceId', access.workspace._id)
          .eq('kind', term.kind)
          .eq('normalizedLabel', normalizedLabel),
      )
      .unique();
    if (duplicate && duplicate._id !== term._id) throw new Error('Taxonomy label already exists');
    await ctx.db.patch('taxonomyTerms', term._id, {
      label,
      normalizedLabel,
      ...(args.status === undefined ? {} : { status: args.status }),
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get('taxonomyTerms', term._id);
    if (!updated) throw new Error('Taxonomy term update failed');
    return taxonomyTermResult(updated);
  },
});

export const createDraft = mutation({
  args: {
    title: v.optional(v.string()),
    purpose: v.optional(v.string()),
    body: v.string(),
    teamKey: v.optional(v.string()),
    jobKey: v.optional(v.string()),
    teamLabel: v.optional(v.string()),
    jobLabel: v.optional(v.string()),
    kind: v.optional(assetKindValidator),
    inputs: v.optional(v.array(inputDefinitionValidator)),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    if (!canContribute(access.membership.role)) throw new Error('Contributor access is required');
    const body = exactBody(args.body);
    const now = Date.now();
    await ensureDefaultTaxonomyTerms(ctx, access.workspace._id, access.userId, now);
    if (args.teamKey && args.teamLabel) throw new Error('Choose a team key or team label');
    if (args.jobKey && args.jobLabel) throw new Error('Choose a work type key or work type label');
    const title = optionalMetadataText(args.title, 'Title', 160) ?? fallbackDraftTitle(now);
    const purpose = optionalMetadataText(args.purpose, 'Purpose', 20_000);
    const teamKey = args.teamLabel
      ? (await upsertTaxonomyTerm(ctx, access, 'team', args.teamLabel)).key
      : await resolveActiveTaxonomyKey(ctx, access, 'team', args.teamKey);
    const jobKey = args.jobLabel
      ? (await upsertTaxonomyTerm(ctx, access, 'work_type', args.jobLabel)).key
      : await resolveActiveTaxonomyKey(ctx, access, 'work_type', args.jobKey);
    const assetId = await ctx.db.insert('assets', {
      workspaceId: access.workspace._id,
      kind: args.kind ?? 'prompt',
      title,
      ...(purpose === undefined ? {} : { purpose }),
      searchText: boundedSearchText([title, purpose, body]),
      pendingSearchText: '',
      ...(teamKey === undefined ? {} : { teamKey }),
      ...(jobKey === undefined ? {} : { jobKey }),
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

export const updatePrivateDraftMetadata = mutation({
  args: {
    assetId: v.id('assets'),
    title: v.optional(v.string()),
    purpose: v.optional(v.string()),
    teamKey: v.optional(v.string()),
    jobKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset) throw new Error('Asset not found');
    assertEditable(asset, access);
    if (asset.visibility !== 'private' || asset.reviewState !== 'draft') {
      throw new Error('Only private draft metadata can be updated in place');
    }
    const version = asset.currentVersionId
      ? await ctx.db.get('assetVersions', asset.currentVersionId)
      : null;
    if (!version) throw new Error('Asset version is missing');
    const now = Date.now();
    await ensureDefaultTaxonomyTerms(ctx, access.workspace._id, access.userId, now);
    const title = args.title === undefined
      ? asset.title
      : optionalMetadataText(args.title, 'Title', 160) ?? fallbackDraftTitle(now);
    const purpose = args.purpose === undefined
      ? asset.purpose
      : optionalMetadataText(args.purpose, 'Purpose', 20_000);
    const teamKey = args.teamKey === undefined
      ? asset.teamKey
      : await resolveActiveTaxonomyKey(ctx, access, 'team', args.teamKey);
    const jobKey = args.jobKey === undefined
      ? asset.jobKey
      : await resolveActiveTaxonomyKey(ctx, access, 'work_type', args.jobKey);
    await ctx.db.patch('assets', asset._id, {
      title,
      purpose,
      teamKey,
      jobKey,
      searchText: boundedSearchText([title, purpose, version.body]),
      updatedAt: now,
    });
    return { updated: true as const };
  },
});

type AssetListFilters = {
  teamKey?: string;
  jobKey?: string;
  limit: number;
};

const LIBRARY_REVIEW_STATES: ReviewState[] = [
  'shared',
  'team_approved',
  'workspace_approved',
];
const APPROVED_REVIEW_STATES = ['team_approved', 'workspace_approved'] as const;

function mergeAssetRows(groups: Array<Array<Doc<'assets'>>>, limit: number) {
  const rows = new Map<Id<'assets'>, Doc<'assets'>>();
  for (const group of groups) {
    for (const asset of group) rows.set(asset._id, asset);
  }
  return [...rows.values()].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, limit);
}

function mergeAssetRowsByGroupPriority(groups: Array<Array<Doc<'assets'>>>, limit: number) {
  const rows = new Map<Id<'assets'>, Doc<'assets'>>();
  for (const group of groups) {
    for (const asset of group) {
      if (!rows.has(asset._id)) rows.set(asset._id, asset);
      if (rows.size === limit) return [...rows.values()];
    }
  }
  return [...rows.values()];
}

export function normalizeLibrarySearch(value: string | undefined): string | undefined {
  const encoder = new TextEncoder();
  const terms = value?.slice(0, 4_096).match(/[\p{L}\p{N}]+/gu)?.slice(0, 16) ?? [];
  const normalized = terms
    .map((term) => {
      let bytes = 0;
      let candidate = '';
      for (const character of term) {
        const characterBytes = encoder.encode(character).byteLength;
        if (bytes + characterBytes > 32) break;
        bytes += characterBytes;
        candidate += character;
      }
      return candidate;
    })
    .filter(Boolean)
    .join(' ');
  return normalized || undefined;
}

async function listByVisibility(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  visibility: Doc<'assets'>['visibility'],
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_visibility_team_job_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('visibility', visibility)
            .eq('teamKey', filters.teamKey!)
            .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_visibility_and_team_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_visibility_and_job_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_workspace_id_and_visibility_and_updated_at', (q) =>
      q.eq('workspaceId', workspaceId).eq('visibility', visibility),
    )
    .order('desc')
    .take(filters.limit);
}

async function listOwnedAssets(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  ownerUserId: string,
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_owner_team_job_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('ownerUserId', ownerUserId)
            .eq('teamKey', filters.teamKey!)
            .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_owner_user_id_and_team_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('ownerUserId', ownerUserId)
          .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_owner_user_id_and_job_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('ownerUserId', ownerUserId)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_workspace_id_and_owner_user_id_and_updated_at', (q) =>
      q.eq('workspaceId', workspaceId).eq('ownerUserId', ownerUserId),
    )
    .order('desc')
    .take(filters.limit);
}

async function listOwnedPrivateAssets(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  ownerUserId: string,
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_owner_visibility_team_job_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('ownerUserId', ownerUserId)
            .eq('visibility', 'private')
            .eq('teamKey', filters.teamKey!)
            .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_owner_visibility_team_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('ownerUserId', ownerUserId)
            .eq('visibility', 'private')
            .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_owner_visibility_job_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('ownerUserId', ownerUserId)
            .eq('visibility', 'private')
            .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_workspace_id_and_owner_user_id_and_visibility_and_updated_at', (q) =>
      q
        .eq('workspaceId', workspaceId)
        .eq('ownerUserId', ownerUserId)
        .eq('visibility', 'private'),
    )
    .order('desc')
    .take(filters.limit);
}

async function listByReviewState(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  reviewState: ReviewState,
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex(
        'by_workspace_review_team_job_updated',
        (q) =>
          q
            .eq('workspaceId', workspaceId)
            .eq('reviewState', reviewState)
            .eq('teamKey', filters.teamKey!)
            .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_review_state_and_team_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('reviewState', reviewState)
          .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_workspace_id_and_review_state_and_job_key_and_updated_at', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('reviewState', reviewState)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_workspace_id_and_review_state_and_updated_at', (q) =>
      q.eq('workspaceId', workspaceId).eq('reviewState', reviewState),
    )
    .order('desc')
    .take(filters.limit);
}

async function listByVisibilityAndReviewState(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  visibility: 'team' | 'workspace',
  reviewState: ReviewState,
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_review_team_job_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('reviewState', reviewState)
          .eq('teamKey', filters.teamKey!)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_review_team_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('reviewState', reviewState)
          .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_review_job_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('reviewState', reviewState)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_ws_visibility_review_updated', (q) =>
      q
        .eq('workspaceId', workspaceId)
        .eq('visibility', visibility)
        .eq('reviewState', reviewState),
    )
    .order('desc')
    .take(filters.limit);
}

async function listByVisibilityAndApprovedState(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  visibility: 'team' | 'workspace',
  approvedReviewState: (typeof APPROVED_REVIEW_STATES)[number],
  filters: AssetListFilters,
) {
  if (filters.teamKey && filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_approved_team_job_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('approvedReviewState', approvedReviewState)
          .eq('teamKey', filters.teamKey!)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.teamKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_approved_team_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('approvedReviewState', approvedReviewState)
          .eq('teamKey', filters.teamKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  if (filters.jobKey) {
    return await ctx.db
      .query('assets')
      .withIndex('by_ws_visibility_approved_job_updated', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .eq('visibility', visibility)
          .eq('approvedReviewState', approvedReviewState)
          .eq('jobKey', filters.jobKey!),
      )
      .order('desc')
      .take(filters.limit);
  }
  return await ctx.db
    .query('assets')
    .withIndex('by_ws_visibility_approved_updated', (q) =>
      q
        .eq('workspaceId', workspaceId)
        .eq('visibility', visibility)
        .eq('approvedReviewState', approvedReviewState),
    )
    .order('desc')
    .take(filters.limit);
}

async function searchAssets(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  search: string,
  filters: AssetListFilters & {
    visibility?: Doc<'assets'>['visibility'];
    ownerUserId?: string;
    reviewState?: ReviewState;
    approvedReviewState?: (typeof APPROVED_REVIEW_STATES)[number];
  },
) {
  return await ctx.db
    .query('assets')
    .withSearchIndex('search_by_workspace', (q) => {
      let searchQuery = q.search('searchText', search).eq('workspaceId', workspaceId);
      if (filters.visibility) searchQuery = searchQuery.eq('visibility', filters.visibility);
      if (filters.ownerUserId) searchQuery = searchQuery.eq('ownerUserId', filters.ownerUserId);
      if (filters.reviewState) searchQuery = searchQuery.eq('reviewState', filters.reviewState);
      if (filters.approvedReviewState) {
        searchQuery = searchQuery.eq('approvedReviewState', filters.approvedReviewState);
      }
      if (filters.teamKey) searchQuery = searchQuery.eq('teamKey', filters.teamKey);
      if (filters.jobKey) searchQuery = searchQuery.eq('jobKey', filters.jobKey);
      return searchQuery;
    })
    .take(filters.limit);
}

async function searchPendingAssets(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  search: string,
  filters: AssetListFilters & {
    reviewState?: ReviewState;
    ownerUserId?: string;
  },
) {
  return await ctx.db
    .query('assets')
    .withSearchIndex('search_pending_by_workspace', (q) => {
      let searchQuery = q.search('pendingSearchText', search).eq('workspaceId', workspaceId);
      if (filters.reviewState) searchQuery = searchQuery.eq('reviewState', filters.reviewState);
      if (filters.ownerUserId) searchQuery = searchQuery.eq('ownerUserId', filters.ownerUserId);
      if (filters.teamKey) searchQuery = searchQuery.eq('teamKey', filters.teamKey);
      if (filters.jobKey) searchQuery = searchQuery.eq('jobKey', filters.jobKey);
      return searchQuery;
    })
    .take(filters.limit);
}

function pendingApprovalStates(role: WorkspaceRole): ReviewState[] {
  if (role === 'owner' || role === 'admin') return ['team_approved', 'shared'];
  if (role === 'curator') return ['shared'];
  return [];
}

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
    const filters = { limit, teamKey: args.teamKey, jobKey: args.jobKey };
    const search = normalizeLibrarySearch(args.search);
    let groups: Array<Array<Doc<'assets'>>>;
    if (args.scope === 'my_work') {
      groups = search
        ? await Promise.all([
            searchAssets(ctx, access.workspace._id, search, {
              ...filters,
              ownerUserId: access.userId,
            }),
            searchPendingAssets(ctx, access.workspace._id, search, {
              ...filters,
              ownerUserId: access.userId,
            }),
          ])
        : [await listOwnedAssets(ctx, access.workspace._id, access.userId, filters)];
    } else if (args.scope === 'approvals') {
      const states = pendingApprovalStates(access.membership.role);
      const approvalQueries = states.flatMap((reviewState) => {
        if (!search) {
          return [listByReviewState(ctx, access.workspace._id, reviewState, filters)];
        }
        const currentSearch = searchAssets(ctx, access.workspace._id, search, {
          ...filters,
          reviewState,
        });
        return reviewState === 'shared'
          ? [
              searchPendingAssets(ctx, access.workspace._id, search, {
                ...filters,
                reviewState,
              }),
              currentSearch,
            ]
          : [currentSearch];
      });
      groups = await Promise.all(approvalQueries);
    } else if (search) {
      const governedSearches = LIBRARY_REVIEW_STATES.flatMap((reviewState) =>
        (['team', 'workspace'] as const).map((visibility) =>
          searchAssets(ctx, access.workspace._id, search, {
            ...filters,
            reviewState,
            visibility,
          }),
        ),
      );
      const approvedSearches = APPROVED_REVIEW_STATES.flatMap((approvedReviewState) =>
        (['team', 'workspace'] as const).map((visibility) =>
          searchAssets(ctx, access.workspace._id, search, {
            ...filters,
            approvedReviewState,
            visibility,
          }),
        ),
      );
      groups = await Promise.all([
        ...governedSearches,
        ...approvedSearches,
        searchAssets(ctx, access.workspace._id, search, {
          ...filters,
          visibility: 'private',
          ownerUserId: access.userId,
        }),
      ]);
    } else {
      const governedLists = LIBRARY_REVIEW_STATES.flatMap((reviewState) =>
        (['team', 'workspace'] as const).map((visibility) =>
          listByVisibilityAndReviewState(
            ctx,
            access.workspace._id,
            visibility,
            reviewState,
            filters,
          ),
        ),
      );
      const approvedLists = APPROVED_REVIEW_STATES.flatMap((approvedReviewState) =>
        (['team', 'workspace'] as const).map((visibility) =>
          listByVisibilityAndApprovedState(
            ctx,
            access.workspace._id,
            visibility,
            approvedReviewState,
            filters,
          ),
        ),
      );
      groups = await Promise.all([
        ...governedLists,
        ...approvedLists,
        listOwnedPrivateAssets(ctx, access.workspace._id, access.userId, filters),
      ]);
    }
    const visible =
      args.scope === 'approvals'
        ? mergeAssetRowsByGroupPriority(groups, limit)
        : mergeAssetRows(groups, limit);
    const favorites = await Promise.all(
      visible.map((asset) =>
        ctx.db
          .query('assetFavorites')
          .withIndex('by_asset_id_and_user_id', (q) =>
            q.eq('assetId', asset._id).eq('userId', access.userId),
          )
          .unique(),
      ),
    );
    return {
      items: visible.map((asset, index) => {
        const approvedVersion = approvedVersionFor(asset);
        const presentApprovedVersion = args.scope !== 'my_work' && args.scope !== 'approvals';
        const presentedVersionNumber =
          presentApprovedVersion && approvedVersion
            ? approvedVersion.versionNumber
            : asset.latestVersionNumber;
        return {
          assetId: asset._id,
          title: asset.title,
          purpose: asset.purpose,
          kind: asset.kind,
          teamKey: asset.teamKey,
          jobKey: asset.jobKey,
          visibility: asset.visibility,
          ownerUserId: asset.ownerUserId,
          reviewState:
            presentApprovedVersion && approvedVersion
              ? approvedVersion.reviewState
              : asset.reviewState,
          versionNumber: presentedVersionNumber,
          isFavorite: Boolean(favorites[index]),
          lastVerifiedAt:
            approvedVersion?.versionNumber === presentedVersionNumber
              ? (asset.lastVerifiedAt ?? null)
              : null,
          updatedAt: asset.updatedAt,
        };
      }),
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
    if (asset.visibility === 'private' && !canEditAsset(asset, access)) return null;
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
    const approvedReference = approvedVersionFor(asset);
    const approved = approvedReference
      ? approvedReference.versionId === current._id
        ? current
        : await ctx.db.get('assetVersions', approvedReference.versionId)
      : null;
    if (approvedReference && !approved) throw new Error('Approved asset version is missing');
    const pending = approved && approved._id !== current._id ? current : null;
    const canEdit = canEditAsset(asset, access);
    const canSeePending = canEdit || asset.reviewState !== 'draft';
    if (!canSeePending && !approvedReference) return null;
    const presented = approved ?? current;
    const visibleVersions = canEdit
      ? versions
      : versions.filter(
          (version) =>
            version._id === approved?._id ||
            (asset.reviewState !== 'draft' && version._id === current._id),
        );
    const visibleVersionIds = new Set(visibleVersions.map((version) => version._id));
    return {
      assetId: asset._id,
      title: asset.title,
      purpose: asset.purpose,
      kind: asset.kind,
      teamKey: asset.teamKey,
      jobKey: asset.jobKey,
      visibility: asset.visibility,
      ownerUserId: asset.ownerUserId,
      reviewState: approvedReference?.reviewState ?? asset.reviewState,
      versionNumber: presented.versionNumber,
      body: presented.body,
      canEdit,
      inputs: presented.inputs,
      variants: presented.variants,
      pendingVersion:
        pending && canSeePending
          ? {
              versionNumber: pending.versionNumber,
              body: pending.body,
              inputs: pending.inputs,
              variants: pending.variants,
              reviewState: asset.reviewState,
            }
          : null,
      lastVerifiedAt: asset.lastVerifiedAt ?? null,
      updatedAt: asset.updatedAt,
      isFavorite: Boolean(favorite),
      comments: comments.filter((comment) => visibleVersionIds.has(comment.versionId)).map((comment) => ({
        body: comment.body,
        versionNumber: comment.versionNumber,
      })),
      versions: visibleVersions.map((version) => ({
        versionNumber: version.versionNumber,
        body: version.body,
      })),
      approvals: approvals
        .filter((approval) => visibleVersionIds.has(approval.versionId))
        .map((approval) => ({
          versionNumber: approval.versionNumber,
          scope: approval.scope,
          reviewerUserId: approval.reviewerUserId,
          note: approval.note,
          testedModels: approval.testedModels,
          createdAt: approval.createdAt,
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
    const approvedReference = approvedVersionFor(asset);
    const currentVersion = asset.currentVersionId
      ? await ctx.db.get('assetVersions', asset.currentVersionId)
      : null;
    if (!currentVersion) throw new Error('Asset version is missing');
    const versionId = await ctx.db.insert('assetVersions', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      versionNumber,
      body,
      inputs: reconcileInputs(body, currentVersion.inputs),
      variants: currentVersion.variants,
      changeNote,
      authorUserId: access.userId,
      createdAt: now,
    });
    await ctx.db.patch('assets', asset._id, {
      currentVersionId: versionId,
      ...(approvedReference
        ? {
            approvedVersionId: approvedReference.versionId,
            approvedVersionNumber: approvedReference.versionNumber,
            approvedReviewState: approvedReference.reviewState,
          }
        : {}),
      latestVersionNumber: versionNumber,
      visibility: approvedReference ? asset.visibility : 'private',
      reviewState: 'draft',
      searchText: approvedReference
        ? asset.searchText
        : boundedSearchText([asset.title, asset.purpose, body]),
      pendingSearchText: approvedReference
        ? boundedSearchText([asset.title, asset.purpose, body])
        : '',
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
    if (args.visibility === 'workspace' && !canAdminister(access.membership.role)) {
      throw new Error('Admin access is required for workspace sharing');
    }
    if (asset.reviewState !== 'draft' && asset.reviewState !== 'shared') {
      throw new Error('Approved or archived work cannot be returned to shared review');
    }
    const currentVersion = asset.currentVersionId
      ? await ctx.db.get('assetVersions', asset.currentVersionId)
      : null;
    if (!currentVersion) throw new Error('Asset version is missing');
    await ctx.db.patch('assets', asset._id, {
      visibility: args.visibility,
      reviewState: 'shared',
      pendingSearchText: boundedSearchText([asset.title, asset.purpose, currentVersion.body]),
      updatedAt: Date.now(),
    });
    return { reviewState: 'shared' as const };
  },
});

export const approveAsset = mutation({
  args: {
    assetId: v.id('assets'),
    expectedVersionNumber: v.number(),
    scope: v.union(v.literal('team'), v.literal('workspace')),
    note: v.string(),
    testedModels: v.optional(v.array(v.string())),
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
    const currentVersion = await ctx.db.get('assetVersions', asset.currentVersionId);
    if (!currentVersion) throw new Error('Asset version is missing');
    if (
      currentVersion.versionNumber !== args.expectedVersionNumber ||
      asset.latestVersionNumber !== args.expectedVersionNumber
    ) {
      throw new Error('This version changed before your approval was recorded. Refresh the review first.');
    }
    const note = requiredText('Review note', args.note, 2_000);
    if (note.length < 10) throw new Error('Review note must be at least 10 characters');
    const testedModels = normalizeTestedModels(args.testedModels);
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
    if (existing) throw new Error('Approval evidence is already recorded for this version');
    await ctx.db.insert('assetApprovals', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      versionId: asset.currentVersionId,
      versionNumber: asset.latestVersionNumber,
      scope: args.scope,
      reviewerUserId: access.userId,
      note,
      testedModels,
      createdAt: Date.now(),
    });
    const reviewState = reviewStateForApproval(args.scope);
    await ctx.db.patch('assets', asset._id, {
      reviewState,
      visibility: args.scope === 'workspace' ? 'workspace' : 'team',
      approvedVersionId: currentVersion._id,
      approvedVersionNumber: currentVersion.versionNumber,
      approvedReviewState: reviewState,
      searchText: boundedSearchText([asset.title, asset.purpose, currentVersion.body]),
      pendingSearchText: '',
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
  args: { assetId: v.id('assets'), body: v.string(), presentedVersionNumber: v.number() },
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAccess(ctx);
    const asset = assertAssetAccess(await ctx.db.get('assets', args.assetId), access.workspace._id);
    if (!asset?.currentVersionId) throw new Error('Asset not found');
    if (asset.visibility === 'private' && asset.ownerUserId !== access.userId) {
      throw new Error('Asset not found');
    }
    const body = requiredText('Comment', args.body, 5_000);
    const currentVersion = await ctx.db.get('assetVersions', asset.currentVersionId);
    if (!currentVersion) throw new Error('Asset version is missing');
    const approvedReference = approvedVersionFor(asset);
    const canSeePending = canEditAsset(asset, access) || asset.reviewState !== 'draft';
    const visibleVersion =
      approvedReference?.versionNumber === args.presentedVersionNumber
        ? approvedReference
        : canSeePending && currentVersion.versionNumber === args.presentedVersionNumber
          ? { versionId: currentVersion._id, versionNumber: currentVersion.versionNumber }
          : null;
    if (!visibleVersion) throw new Error('Feedback must be linked to a version currently presented to you');
    await ctx.db.insert('assetComments', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      versionId: visibleVersion.versionId,
      versionNumber: visibleVersion.versionNumber,
      authorUserId: access.userId,
      body,
      createdAt: Date.now(),
    });
    return { versionNumber: visibleVersion.versionNumber };
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
    const versionNumber = approvedVersionFor(asset)?.versionNumber ?? asset.latestVersionNumber;
    await ctx.db.insert('adoptionEvents', {
      workspaceId: access.workspace._id,
      assetId: asset._id,
      actorUserId: access.userId,
      assetOwnerUserId: asset.ownerUserId,
      eventType: 'asset_used',
      source: args.source,
      versionNumber,
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
