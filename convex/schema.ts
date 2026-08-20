import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  assetKindValidator,
  inputDefinitionValidator,
  promptVariantValidator,
  reviewStateValidator,
  visibilityValidator,
  workspaceRoleValidator,
} from './lib/workLibraryValidators';
import { taxonomyKindValidator, taxonomyStatusValidator } from './lib/workLibraryTaxonomy';

export default defineSchema({
  workspaces: defineTable({
    externalId: v.string(),
    slug: v.string(),
    name: v.string(),
    createdByUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_external_id', ['externalId'])
    .index('by_slug', ['slug']),
  memberships: defineTable({
    workspaceId: v.id('workspaces'),
    userId: v.string(),
    role: workspaceRoleValidator,
    displayName: v.string(),
    email: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_workspace_id_and_user_id', ['workspaceId', 'userId'])
    .index('by_user_id_and_workspace_id', ['userId', 'workspaceId']),
  taxonomyTerms: defineTable({
    workspaceId: v.id('workspaces'),
    kind: taxonomyKindValidator,
    key: v.string(),
    label: v.string(),
    normalizedLabel: v.string(),
    status: taxonomyStatusValidator,
    sortOrder: v.number(),
    createdByUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_workspace_id_and_kind_and_key', ['workspaceId', 'kind', 'key'])
    .index('by_workspace_id_and_kind_and_normalized_label', [
      'workspaceId',
      'kind',
      'normalizedLabel',
    ])
    .index('by_workspace_id_and_kind_and_status_and_sort_order', [
      'workspaceId',
      'kind',
      'status',
      'sortOrder',
    ]),
  assets: defineTable({
    workspaceId: v.id('workspaces'),
    kind: assetKindValidator,
    title: v.string(),
    purpose: v.optional(v.string()),
    searchText: v.string(),
    // Optional during the widen/backfill window so existing assets remain deployable.
    pendingSearchText: v.optional(v.string()),
    teamKey: v.optional(v.string()),
    jobKey: v.optional(v.string()),
    visibility: visibilityValidator,
    reviewState: reviewStateValidator,
    ownerUserId: v.string(),
    currentVersionId: v.optional(v.id('assetVersions')),
    approvedVersionId: v.optional(v.id('assetVersions')),
    approvedVersionNumber: v.optional(v.number()),
    approvedReviewState: v.optional(reviewStateValidator),
    starterKey: v.optional(v.string()),
    latestVersionNumber: v.number(),
    lastVerifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_workspace_id_and_updated_at', ['workspaceId', 'updatedAt'])
    .index('by_workspace_id_and_visibility_and_updated_at', [
      'workspaceId',
      'visibility',
      'updatedAt',
    ])
    .index('by_workspace_id_and_visibility_and_team_key_and_updated_at', [
      'workspaceId',
      'visibility',
      'teamKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_visibility_and_job_key_and_updated_at', [
      'workspaceId',
      'visibility',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_visibility_team_job_updated', [
      'workspaceId',
      'visibility',
      'teamKey',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_owner_user_id_and_updated_at', [
      'workspaceId',
      'ownerUserId',
      'updatedAt',
    ])
    .index('by_workspace_id_and_owner_user_id_and_team_key_and_updated_at', [
      'workspaceId',
      'ownerUserId',
      'teamKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_owner_user_id_and_job_key_and_updated_at', [
      'workspaceId',
      'ownerUserId',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_owner_team_job_updated', [
      'workspaceId',
      'ownerUserId',
      'teamKey',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_owner_user_id_and_visibility_and_updated_at', [
      'workspaceId',
      'ownerUserId',
      'visibility',
      'updatedAt',
    ])
    .index('by_workspace_owner_visibility_team_updated', [
      'workspaceId',
      'ownerUserId',
      'visibility',
      'teamKey',
      'updatedAt',
    ])
    .index('by_workspace_owner_visibility_job_updated', [
      'workspaceId',
      'ownerUserId',
      'visibility',
      'jobKey',
      'updatedAt',
    ])
    .index(
      'by_workspace_owner_visibility_team_job_updated',
      ['workspaceId', 'ownerUserId', 'visibility', 'teamKey', 'jobKey', 'updatedAt'],
    )
    .index('by_workspace_id_and_starter_key', ['workspaceId', 'starterKey'])
    .index('by_workspace_id_and_review_state_and_updated_at', [
      'workspaceId',
      'reviewState',
      'updatedAt',
    ])
    .index('by_ws_visibility_review_updated', [
      'workspaceId',
      'visibility',
      'reviewState',
      'updatedAt',
    ])
    .index('by_ws_visibility_review_team_updated', [
      'workspaceId',
      'visibility',
      'reviewState',
      'teamKey',
      'updatedAt',
    ])
    .index('by_ws_visibility_review_job_updated', [
      'workspaceId',
      'visibility',
      'reviewState',
      'jobKey',
      'updatedAt',
    ])
    .index('by_ws_visibility_review_team_job_updated', [
      'workspaceId',
      'visibility',
      'reviewState',
      'teamKey',
      'jobKey',
      'updatedAt',
    ])
    .index('by_ws_visibility_approved_updated', [
      'workspaceId',
      'visibility',
      'approvedReviewState',
      'updatedAt',
    ])
    .index('by_ws_visibility_approved_team_updated', [
      'workspaceId',
      'visibility',
      'approvedReviewState',
      'teamKey',
      'updatedAt',
    ])
    .index('by_ws_visibility_approved_job_updated', [
      'workspaceId',
      'visibility',
      'approvedReviewState',
      'jobKey',
      'updatedAt',
    ])
    .index('by_ws_visibility_approved_team_job_updated', [
      'workspaceId',
      'visibility',
      'approvedReviewState',
      'teamKey',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_review_state_and_team_key_and_updated_at', [
      'workspaceId',
      'reviewState',
      'teamKey',
      'updatedAt',
    ])
    .index('by_workspace_id_and_review_state_and_job_key_and_updated_at', [
      'workspaceId',
      'reviewState',
      'jobKey',
      'updatedAt',
    ])
    .index('by_workspace_review_team_job_updated', [
      'workspaceId',
      'reviewState',
      'teamKey',
      'jobKey',
      'updatedAt',
    ])
    .searchIndex('search_by_workspace', {
      searchField: 'searchText',
      filterFields: [
        'workspaceId',
        'kind',
        'teamKey',
        'jobKey',
        'reviewState',
        'approvedReviewState',
        'visibility',
        'ownerUserId',
      ],
    })
    .searchIndex('search_pending_by_workspace', {
      searchField: 'pendingSearchText',
      filterFields: [
        'workspaceId',
        'kind',
        'teamKey',
        'jobKey',
        'reviewState',
        'approvedReviewState',
        'visibility',
        'ownerUserId',
      ],
    }),
  assetVersions: defineTable({
    workspaceId: v.id('workspaces'),
    assetId: v.id('assets'),
    versionNumber: v.number(),
    body: v.string(),
    inputs: v.array(inputDefinitionValidator),
    variants: v.array(promptVariantValidator),
    changeNote: v.string(),
    authorUserId: v.string(),
    createdAt: v.number(),
  })
    .index('by_asset_id_and_version_number', ['assetId', 'versionNumber'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt']),
  assetApprovals: defineTable({
    workspaceId: v.id('workspaces'),
    assetId: v.id('assets'),
    versionId: v.id('assetVersions'),
    versionNumber: v.number(),
    scope: v.union(v.literal('team'), v.literal('workspace')),
    reviewerUserId: v.string(),
    note: v.string(),
    testedModels: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_asset_id_and_created_at', ['assetId', 'createdAt'])
    .index('by_version_id_and_scope', ['versionId', 'scope']),
  assetFavorites: defineTable({
    workspaceId: v.id('workspaces'),
    assetId: v.id('assets'),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_asset_id_and_user_id', ['assetId', 'userId'])
    .index('by_workspace_id_and_user_id_and_created_at', ['workspaceId', 'userId', 'createdAt']),
  assetComments: defineTable({
    workspaceId: v.id('workspaces'),
    assetId: v.id('assets'),
    versionId: v.id('assetVersions'),
    versionNumber: v.number(),
    authorUserId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_asset_id_and_created_at', ['assetId', 'createdAt']),
  adoptionEvents: defineTable({
    workspaceId: v.id('workspaces'),
    assetId: v.optional(v.id('assets')),
    actorUserId: v.string(),
    assetOwnerUserId: v.optional(v.string()),
    eventType: v.union(
      v.literal('asset_created'),
      v.literal('asset_shared'),
      v.literal('asset_approved'),
      v.literal('asset_used'),
    ),
    source: v.union(
      v.literal('web'),
      v.literal('copy'),
      v.literal('export'),
      v.literal('mcp'),
      v.literal('test'),
      v.literal('playbook'),
    ),
    versionNumber: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_asset_id_and_created_at', ['assetId', 'createdAt'])
    .index('by_workspace_id_and_actor_user_id_and_created_at', [
      'workspaceId',
      'actorUserId',
      'createdAt',
    ]),
  dailyAdoptionAggregates: defineTable({
    workspaceId: v.id('workspaces'),
    date: v.string(),
    eventType: v.union(
      v.literal('asset_created'),
      v.literal('asset_shared'),
      v.literal('asset_approved'),
      v.literal('asset_used'),
    ),
    count: v.number(),
    updatedAt: v.number(),
  }).index('by_workspace_id_and_date_and_event_type', ['workspaceId', 'date', 'eventType']),
  prompts: defineTable({
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
    promptType: v.string(),
    agentConfig: v.optional(v.any()),
    libraryFormat: v.number(),
    artifactKind: v.optional(v.string()),
    runtimeOverlays: v.optional(v.any()),
    executionCount: v.optional(v.number()),
    successRate: v.optional(v.number()),
    lastExecutedAt: v.optional(v.number()),
  })
    .index('by_owner', ['ownerUserId'])
    .index('by_owner_category', ['ownerUserId', 'category'])
    .index('by_owner_prompt', ['ownerUserId', 'promptId'])
    .index('by_owner_and_prompt_type', ['ownerUserId', 'promptType'])
    .index('by_owner_and_updated_at', ['ownerUserId', 'updatedAt']),
  feedback: defineTable({
    ownerUserId: v.string(),
    feedbackId: v.string(),
    type: v.string(),
    severity: v.optional(v.string()),
    page: v.string(),
    route: v.string(),
    message: v.string(),
    context: v.optional(v.any()),
    status: v.string(),
    createdAt: v.number(),
  })
    .index('by_owner_and_created_at', ['ownerUserId', 'createdAt'])
    .index('by_owner_and_type', ['ownerUserId', 'type']),
  productEvents: defineTable({
    ownerUserId: v.string(),
    eventId: v.string(),
    eventName: v.string(),
    context: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_owner_and_created_at', ['ownerUserId', 'createdAt']),
  userProfiles: defineTable({
    ownerUserId: v.string(),
    checklistStepStates: v.object({
      connectHostCompletedAt: v.optional(v.number()),
      verifySetupCompletedAt: v.optional(v.number()),
      createPromptCompletedAt: v.optional(v.number()),
      runOrchestrationCompletedAt: v.optional(v.number()),
    }),
    checklistDismissedAt: v.optional(v.number()),
    onboardingCompletedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_owner_user_id', ['ownerUserId']),
});
