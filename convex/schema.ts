import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
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
});
