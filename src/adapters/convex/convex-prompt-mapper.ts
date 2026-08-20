import { Prompt, PromptType, ClaudeModel, AgentConfig } from '../../core/entities/prompt.entity';

/** Convex document shape (matches convex/schema.ts) */
export type ConvexPromptDoc = {
  _id?: string;
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
  metadata: Record<string, unknown>;
  accessLevel: string;
  authorId?: string;
  promptType: string;
  agentConfig?: AgentConfig;
  libraryFormat: number;
  artifactKind?: string;
  runtimeOverlays?: Record<string, unknown>;
  executionCount?: number;
  successRate?: number;
  lastExecutedAt?: number;
};

export function convexDocToPrompt(doc: ConvexPromptDoc): Prompt {
  const agentConfig = normalizeAgentConfig(doc.agentConfig);
  return new Prompt(
    doc.promptId,
    doc.name,
    doc.description ?? '',
    doc.template ?? '',
    doc.category ?? 'general',
    Array.isArray(doc.tags) ? doc.tags : [],
    Array.isArray(doc.variables) ? (doc.variables as string[]) : [],
    doc.version ?? 'latest',
    new Date(doc.createdAt),
    new Date(doc.updatedAt),
    doc.isLatest !== false,
    (doc.metadata ?? {}) as Record<string, unknown>,
    doc.accessLevel ?? 'public',
    doc.authorId,
    (doc.promptType as PromptType) || 'standard',
    agentConfig,
  );
}

function normalizeAgentConfig(raw: AgentConfig | undefined): AgentConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const a = raw as Record<string, unknown>;
  const last = a.lastExecutedAt;
  return {
    ...raw,
    lastExecutedAt:
      last instanceof Date
        ? last
        : typeof last === 'number'
          ? new Date(last)
          : typeof last === 'string'
            ? new Date(last)
            : undefined,
  } as AgentConfig;
}

export function promptToConvexDoc(prompt: Prompt, ownerUserId: string): ConvexPromptDoc {
  const ac = prompt.agentConfig;
  const agentConfigSerialized = ac
    ? {
        model: ac.model,
        systemPrompt: ac.systemPrompt,
        tools: ac.tools,
        mcpServers: ac.mcpServers,
        subagents: ac.subagents,
        compatibleWith: ac.compatibleWith,
        sourceUrl: ac.sourceUrl,
        executionCount: ac.executionCount,
        successRate: ac.successRate,
        lastExecutedAt: ac.lastExecutedAt?.getTime(),
      }
    : undefined;
  return {
    promptId: prompt.id,
    ownerUserId,
    name: prompt.name,
    description: prompt.description,
    template: prompt.template,
    category: prompt.category,
    tags: prompt.tags,
    variables: prompt.variables as unknown[],
    version: String(prompt.version),
    createdAt: prompt.createdAt.getTime(),
    updatedAt: prompt.updatedAt.getTime(),
    isLatest: prompt.isLatest,
    metadata: prompt.metadata,
    accessLevel: prompt.accessLevel,
    authorId: prompt.authorId ?? ownerUserId,
    promptType: prompt.promptType,
    agentConfig: agentConfigSerialized as AgentConfig | undefined,
    libraryFormat: 1,
    artifactKind: 'prompt',
  };
}
