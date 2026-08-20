import { v, type Infer } from 'convex/values';

export const workspaceRoleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('curator'),
  v.literal('contributor'),
  v.literal('viewer'),
);

export const assetKindValidator = v.union(v.literal('prompt'), v.literal('playbook'));

export const visibilityValidator = v.union(
  v.literal('private'),
  v.literal('team'),
  v.literal('workspace'),
);

export const reviewStateValidator = v.union(
  v.literal('draft'),
  v.literal('shared'),
  v.literal('team_approved'),
  v.literal('workspace_approved'),
  v.literal('archived'),
);

export const inputDefinitionValidator = v.union(
  v.object({ key: v.string(), label: v.string(), kind: v.literal('text'), required: v.boolean() }),
  v.object({ key: v.string(), label: v.string(), kind: v.literal('long_text'), required: v.boolean() }),
  v.object({ key: v.string(), label: v.string(), kind: v.literal('number'), required: v.boolean() }),
  v.object({ key: v.string(), label: v.string(), kind: v.literal('boolean'), required: v.boolean() }),
  v.object({
    key: v.string(),
    label: v.string(),
    kind: v.literal('select'),
    required: v.boolean(),
    options: v.array(v.string()),
  }),
  v.object({ key: v.string(), label: v.string(), kind: v.literal('date'), required: v.boolean() }),
  v.object({ key: v.string(), label: v.string(), kind: v.literal('file'), required: v.boolean() }),
);

export const promptVariantValidator = v.object({
  targetClient: v.union(
    v.literal('canonical'),
    v.literal('claude'),
    v.literal('chatgpt'),
    v.literal('copilot'),
    v.literal('gemini'),
    v.literal('codex'),
  ),
  bodyOverride: v.optional(v.string()),
  usageGuidance: v.optional(v.string()),
  testedModel: v.optional(v.string()),
  testedAt: v.optional(v.number()),
});

export type WorkspaceRole = Infer<typeof workspaceRoleValidator>;
export type ReviewState = Infer<typeof reviewStateValidator>;
