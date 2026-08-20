import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { Id } from './_generated/dataModel';

const promptTypeValidator = v.union(
  v.literal('standard'),
  v.literal('subagent_registry'),
  v.literal('main_agent_template'),
  v.literal('project_orchestration_template'),
);

const feedbackTypeValidator = v.union(
  v.literal('bug'),
  v.literal('confusing_ux'),
  v.literal('missing_capability'),
  v.literal('feature_request'),
);

const feedbackSeverityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('critical'),
);

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string; tokenIdentifier: string; issuer?: string } | null>;
  };
};

type OwnerScope = {
  canonicalOwnerId: string;
  ownerIds: string[];
};

type PromptDoc = {
  promptId: string;
  ownerUserId: string;
  orgId?: string;
  name: string;
  description: string;
  template: string;
  category: string;
  tags: string[];
  variables: unknown[];
  version: string;
  createdAt: number;
  updatedAt: number;
  isLatest: boolean;
  metadata: unknown;
  accessLevel: string;
  authorId?: string;
  promptType: string;
  agentConfig?: {
    model?: string;
    systemPrompt?: string;
    tools?: string[];
    mcpServers?: string[];
    subagents?: string[];
    compatibleWith?: string[];
    sourceUrl?: string;
    executionCount?: number;
    successRate?: number;
    lastExecutedAt?: number;
  };
  libraryFormat: number;
  artifactKind?: string;
  runtimeOverlays?: unknown;
  executionCount?: number;
  successRate?: number;
  lastExecutedAt?: number;
};

type PromptRow = PromptDoc & { _id: Id<'prompts'> };

async function resolveOwnerScope(ctx: AuthCtx): Promise<OwnerScope> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const ownerIds = [identity.tokenIdentifier];
    if (identity.subject && identity.subject !== identity.tokenIdentifier) {
      ownerIds.push(identity.subject);
    }
    return {
      canonicalOwnerId: identity.tokenIdentifier,
      ownerIds,
    };
  }
  const dev = process.env.CONVEX_DEV_OWNER_USER_ID;
  if (dev) {
    return {
      canonicalOwnerId: dev,
      ownerIds: [dev],
    };
  }
  throw new Error('Unauthorized');
}

function dedupeLatestPromptRows<T extends PromptRow>(rows: T[]) {
  const deduped = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.promptId}:${row.version}`;
    const current = deduped.get(key);
    if (!current || row.updatedAt > current.updatedAt) {
      deduped.set(key, row);
    }
  }
  return [...deduped.values()];
}

async function collectPromptRowsForOwners(
  ownerIds: string[],
  fetchRows: (ownerId: string) => Promise<PromptRow[]>,
) {
  const batches = await Promise.all(ownerIds.map((ownerId) => fetchRows(ownerId)));
  return dedupeLatestPromptRows(batches.flat());
}

async function collectFeedbackRowsForOwners(
  ownerIds: string[],
  fetchRows: (ownerId: string) => Promise<any[]>,
) {
  const batches = await Promise.all(ownerIds.map((ownerId) => fetchRows(ownerId)));
  const deduped = new Map<string, any>();
  for (const row of batches.flat()) {
    const key = `${row.feedbackId}:${row.createdAt}`;
    const current = deduped.get(key);
    if (!current || row.createdAt > current.createdAt) {
      deduped.set(key, row);
    }
  }
  return [...deduped.values()].sort((a, b) => b.createdAt - a.createdAt);
}

function promptSummary(row: PromptDoc) {
  return {
    promptId: row.promptId,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags,
    version: row.version,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    accessLevel: row.accessLevel,
    promptType: row.promptType,
    variableCount: Array.isArray(row.variables) ? row.variables.length : 0,
    executionCount:
      row.agentConfig?.executionCount ?? row.executionCount ?? 0,
    successRate: row.agentConfig?.successRate ?? row.successRate ?? null,
    model: row.agentConfig?.model ?? null,
  };
}

function sortByUpdatedDesc<T extends { updatedAt: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.updatedAt - a.updatedAt);
}

function buildPromptFacets(rows: PromptDoc[]) {
  const categories: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const promptTypes: Record<string, number> = {};

  for (const row of rows) {
    categories[row.category] = (categories[row.category] ?? 0) + 1;
    promptTypes[row.promptType] = (promptTypes[row.promptType] ?? 0) + 1;
    for (const tag of row.tags) {
      tags[tag] = (tags[tag] ?? 0) + 1;
    }
  }

  return {
    categories,
    tags,
    promptTypes,
  };
}

function applyPromptFilters(
  rows: PromptDoc[],
  {
    search,
    promptType,
  }: {
    search?: string;
    promptType?: string;
  },
) {
  const lower = search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (promptType && row.promptType !== promptType) return false;
    if (!lower) return true;
    return (
      row.name.toLowerCase().includes(lower) ||
      row.description.toLowerCase().includes(lower) ||
      row.template.toLowerCase().includes(lower) ||
      row.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  });
}

const promptDocValidator = v.object({
  promptId: v.string(),
  ownerUserId: v.string(),
  orgId: v.optional(v.string()),
  name: v.string(),
  description: v.string(),
  template: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  variables: v.array(v.any()),
  version: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  isLatest: v.boolean(),
  metadata: v.any(),
  accessLevel: v.string(),
  authorId: v.optional(v.string()),
  promptType: promptTypeValidator,
  agentConfig: v.optional(v.any()),
  libraryFormat: v.number(),
  artifactKind: v.optional(v.string()),
  runtimeOverlays: v.optional(v.any()),
  executionCount: v.optional(v.number()),
  successRate: v.optional(v.number()),
  lastExecutedAt: v.optional(v.number()),
});

export const health = query({
  args: {},
  handler: async () => ({ status: 'healthy' as const }),
});

export const getByPromptId = query({
  args: { promptId: v.string(), version: v.optional(v.string()) },
  handler: async (ctx, { promptId, version }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) => q.eq('ownerUserId', ownerId).eq('promptId', promptId))
        .take(25) as Promise<PromptRow[]>,
    );
    const sorted = sortByUpdatedDesc(rows as PromptDoc[]);
    const row = version ? sorted.find((entry) => entry.version === version) ?? null : sorted[0] ?? null;
    return row;
  },
});

export const getPromptDetail = query({
  args: { promptId: v.string(), version: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) =>
          q.eq('ownerUserId', ownerId).eq('promptId', args.promptId),
        )
        .take(25) as Promise<PromptRow[]>,
    );
    const sorted = sortByUpdatedDesc(rows as PromptDoc[]);
    const row = args.version
      ? sorted.find((entry) => entry.version === args.version) ?? null
      : sorted[0] ?? null;

    return {
      prompt: row,
      versions: sorted.map((entry) => ({
        version: entry.version,
        updatedAt: entry.updatedAt,
        isLatest: entry.isLatest,
      })),
    };
  },
});

export const listByOwner = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const scope = await resolveOwnerScope(ctx);
    const lim = Math.min(limit ?? 500, 2000);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner', (q) => q.eq('ownerUserId', ownerId))
        .take(lim) as Promise<PromptRow[]>,
    );
    return sortByUpdatedDesc(rows as PromptDoc[]);
  },
});

export const listByCategory = query({
  args: { category: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { category, limit }) => {
    const scope = await resolveOwnerScope(ctx);
    const lim = Math.min(limit ?? 500, 2000);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_category', (q) =>
          q.eq('ownerUserId', ownerId).eq('category', category),
        )
        .take(lim) as Promise<PromptRow[]>,
    );
    return sortByUpdatedDesc(rows as PromptDoc[]);
  },
});

export const listLibrary = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    promptType: v.optional(promptTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { search, category, promptType, limit }) => {
    const scope = await resolveOwnerScope(ctx);
    const lim = Math.min(limit ?? 80, 200);

    let baseRows: PromptDoc[];
    if (promptType) {
      baseRows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
        ctx.db
          .query('prompts')
          .withIndex('by_owner_and_prompt_type', (q) =>
            q.eq('ownerUserId', ownerId).eq('promptType', promptType),
          )
          .take(1000) as Promise<PromptRow[]>,
      )) as PromptDoc[];
      if (category) {
        baseRows = baseRows.filter((row) => row.category === category);
      }
    } else if (category) {
      baseRows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
        ctx.db
          .query('prompts')
          .withIndex('by_owner_category', (q) =>
            q.eq('ownerUserId', ownerId).eq('category', category),
          )
          .take(1000) as Promise<PromptRow[]>,
      )) as PromptDoc[];
    } else {
      baseRows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
        ctx.db
          .query('prompts')
          .withIndex('by_owner', (q) => q.eq('ownerUserId', ownerId))
          .take(2000) as Promise<PromptRow[]>,
      )) as PromptDoc[];
    }

    const filtered = sortByUpdatedDesc(applyPromptFilters(baseRows, { search, promptType }));

    return {
      items: filtered.slice(0, lim).map(promptSummary),
      total: filtered.length,
      facets: buildPromptFacets(baseRows),
    };
  },
});

export const searchPrompts = query({
  args: { query: v.string(), category: v.optional(v.string()) },
  handler: async (ctx, { query: qStr, category }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner', (q) => q.eq('ownerUserId', ownerId))
        .take(2000) as Promise<PromptRow[]>,
    )) as PromptDoc[];
    return sortByUpdatedDesc(applyPromptFilters(rows, { search: qStr })).filter((entry) =>
      category ? entry.category === category : true,
    );
  },
});

export const dashboardSnapshot = query({
  args: {
    promptLimit: v.optional(v.number()),
    agentLimit: v.optional(v.number()),
  },
  handler: async (ctx, { promptLimit, agentLimit }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner', (q) => q.eq('ownerUserId', ownerId))
        .take(2000) as Promise<PromptRow[]>,
    )) as PromptDoc[];
    const sorted = sortByUpdatedDesc(rows);
    const recentPrompts = sorted.slice(0, Math.min(promptLimit ?? 6, 12)).map(promptSummary);
    const recentAgents = sorted
      .filter((row) => row.promptType !== 'standard')
      .slice(0, Math.min(agentLimit ?? 4, 8))
      .map(promptSummary);

    const counts = {
      total: rows.length,
      byPromptType: buildPromptFacets(rows).promptTypes,
      byCategory: buildPromptFacets(rows).categories,
    };

    const feedback = await collectFeedbackRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('feedback')
        .withIndex('by_owner_and_created_at', (q) => q.eq('ownerUserId', ownerId))
        .order('desc')
        .take(5),
    );

    return {
      counts,
      recentPrompts,
      recentAgents,
      recentFeedbackCount: feedback.length,
    };
  },
});

export const listAgentCatalog = query({
  args: {
    promptType: promptTypeValidator,
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { promptType, search, limit }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_and_prompt_type', (q) =>
          q.eq('ownerUserId', ownerId).eq('promptType', promptType),
        )
        .take(1000) as Promise<PromptRow[]>,
    )) as PromptDoc[];
    const filtered = sortByUpdatedDesc(applyPromptFilters(rows, { search }));

    return {
      items: filtered.slice(0, Math.min(limit ?? 60, 120)).map(promptSummary),
      total: filtered.length,
    };
  },
});

export const savePrompt = mutation({
  args: { doc: promptDocValidator },
  handler: async (ctx, { doc }) => {
    const scope = await resolveOwnerScope(ctx);
    if (doc.ownerUserId !== scope.canonicalOwnerId) {
      throw new Error('ownerUserId must match authenticated user');
    }
    const matches = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) =>
          q.eq('ownerUserId', ownerId).eq('promptId', doc.promptId),
        )
        .take(25) as Promise<PromptRow[]>,
    );
    const existing = sortByUpdatedDesc(matches).find((entry) => entry.version === doc.version) ?? matches[0];
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...doc,
        ownerUserId: scope.canonicalOwnerId,
      });
      return existing._id;
    }
    return await ctx.db.insert('prompts', { ...doc, ownerUserId: scope.canonicalOwnerId });
  },
});

export const deletePrompt = mutation({
  args: { promptId: v.string(), version: v.optional(v.string()) },
  handler: async (ctx, { promptId, version }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) => q.eq('ownerUserId', ownerId).eq('promptId', promptId))
        .take(25) as Promise<PromptRow[]>,
    );
    const sorted = sortByUpdatedDesc(rows);
    const row = version ? sorted.find((entry) => entry.version === version) ?? null : sorted[0] ?? null;
    if (!row) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});

export const listVersions = query({
  args: { promptId: v.string() },
  handler: async (ctx, { promptId }) => {
    const scope = await resolveOwnerScope(ctx);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) => q.eq('ownerUserId', ownerId).eq('promptId', promptId))
        .take(25) as Promise<PromptRow[]>,
    );
    return sortByUpdatedDesc(rows).map((row) => row.version);
  },
});

export const findByPromptType = query({
  args: { promptType: promptTypeValidator, limit: v.optional(v.number()) },
  handler: async (ctx, { promptType, limit }) => {
    const scope = await resolveOwnerScope(ctx);
    const lim = Math.min(limit ?? 1000, 2000);
    const rows = await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('prompts')
        .withIndex('by_owner_and_prompt_type', (q) =>
          q.eq('ownerUserId', ownerId).eq('promptType', promptType),
        )
        .take(lim) as Promise<PromptRow[]>,
    );
    return sortByUpdatedDesc(rows);
  },
});

export const updateExecutionStatsMutation = mutation({
  args: {
    promptId: v.string(),
    executionCount: v.number(),
    successRate: v.number(),
    lastExecutedAt: v.number(),
  },
  handler: async (ctx, { promptId, executionCount, successRate, lastExecutedAt }) => {
    const scope = await resolveOwnerScope(ctx);
    const row = sortByUpdatedDesc(
      (await collectPromptRowsForOwners(scope.ownerIds, (ownerId) =>
        ctx.db
          .query('prompts')
          .withIndex('by_owner_prompt', (q) =>
            q.eq('ownerUserId', ownerId).eq('promptId', promptId),
          )
          .take(25) as Promise<PromptRow[]>,
      )) as PromptRow[],
    )[0];
    if (!row) throw new Error(`Prompt ${promptId} not found`);
    const agentConfig = row.agentConfig
      ? { ...row.agentConfig, executionCount, successRate, lastExecutedAt }
      : { executionCount, successRate, lastExecutedAt };
    await ctx.db.patch(row._id, {
      agentConfig,
      ownerUserId: scope.canonicalOwnerId,
      executionCount,
      successRate,
      lastExecutedAt,
      updatedAt: Date.now(),
    });
  },
});

export const submitFeedback = mutation({
  args: {
    type: feedbackTypeValidator,
    severity: v.optional(feedbackSeverityValidator),
    page: v.string(),
    route: v.string(),
    message: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const scope = await resolveOwnerScope(ctx);
    const createdAt = Date.now();
    const feedbackId = `fb_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;
    return await ctx.db.insert('feedback', {
      ownerUserId: scope.canonicalOwnerId,
      feedbackId,
      type: args.type,
      severity: args.severity,
      page: args.page,
      route: args.route,
      message: args.message,
      context: args.context,
      status: 'new',
      createdAt,
    });
  },
});

export const listFeedbackHistory = query({
  args: {
    type: v.optional(feedbackTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, limit }) => {
    const scope = await resolveOwnerScope(ctx);
    let rows = await collectFeedbackRowsForOwners(scope.ownerIds, (ownerId) =>
      ctx.db
        .query('feedback')
        .withIndex('by_owner_and_created_at', (q) => q.eq('ownerUserId', ownerId))
        .order('desc')
        .take(Math.min(limit ?? 24, 100)),
    );

    if (type) {
      rows = rows.filter((row) => row.type === type);
    }

    return rows;
  },
});

export const trackProductEvent = mutation({
  args: {
    eventName: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, { eventName, context }) => {
    const scope = await resolveOwnerScope(ctx);
    const createdAt = Date.now();
    return await ctx.db.insert('productEvents', {
      ownerUserId: scope.canonicalOwnerId,
      eventId: `evt_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
      eventName,
      context,
      createdAt,
    });
  },
});

export const importBulk = mutation({
  args: {
    secret: v.string(),
    ownerUserId: v.string(),
    prompts: v.array(promptDocValidator),
  },
  handler: async (ctx, args) => {
    if (!process.env.IMPORT_SECRET || args.secret !== process.env.IMPORT_SECRET) {
      throw new Error('Forbidden');
    }
    let n = 0;
    for (const doc of args.prompts) {
      const ownerUserId = args.ownerUserId;
      const existing = await ctx.db
        .query('prompts')
        .withIndex('by_owner_prompt', (q) =>
          q.eq('ownerUserId', ownerUserId).eq('promptId', doc.promptId),
        )
        .first();
      const row = { ...doc, ownerUserId };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert('prompts', row);
      }
      n++;
    }
    return { imported: n };
  },
});
