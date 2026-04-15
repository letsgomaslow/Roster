export type PromptSummary = {
  promptId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  updatedAt: number;
  createdAt: number;
  accessLevel: string;
  promptType: string;
  variableCount: number;
  executionCount: number;
  successRate: number | null;
  model: string | null;
};

export type PromptDetail = {
  prompt: {
    promptId: string;
    name: string;
    description: string;
    template: string;
    category: string;
    tags: string[];
    variables: unknown[];
    version: string;
    updatedAt: number;
    createdAt: number;
    accessLevel: string;
    promptType: string;
    metadata: unknown;
    authorId?: string;
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
  } | null;
  versions: Array<{
    version: string;
    updatedAt: number;
    isLatest: boolean;
  }>;
};

export type LibraryResponse = {
  items: PromptSummary[];
  total: number;
  facets: {
    categories: Record<string, number>;
    tags: Record<string, number>;
    promptTypes: Record<string, number>;
  };
};

export type DashboardSnapshot = {
  counts: {
    total: number;
    byPromptType: Record<string, number>;
    byCategory: Record<string, number>;
  };
  recentPrompts: PromptSummary[];
  recentAgents: PromptSummary[];
  recentFeedbackCount: number;
};

export type FeedbackHistoryItem = {
  _id: string;
  feedbackId: string;
  type: string;
  severity?: string;
  page: string;
  route: string;
  message: string;
  context?: unknown;
  status: string;
  createdAt: number;
};

export type RosterTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type ToolExecutionResult = {
  result?: unknown;
  content?: Array<{ type: string; text?: string }>;
  error?: string;
};

export type AgentRecord = {
  id?: string;
  promptId?: string;
  name: string;
  description?: string;
  category?: string;
  promptType?: string;
  tags?: string[];
  agentConfig?: {
    model?: string;
    tools?: string[];
    mcpServers?: string[];
    compatibleWith?: string[];
    subagents?: string[];
    systemPrompt?: string;
  };
  updatedAt?: string | number;
};

export type RunSummary = {
  executionId: string;
  projectPath: string;
  projectType: string;
  mode: string;
  status: string;
  startTime: string;
  endTime?: string;
};

export type RunDetail = RunSummary & {
  phaseCount?: number;
  recommendations?: number;
};

export type DashboardApiPayload = {
  health: {
    success: boolean;
    status: number;
    data: { status?: string; services?: Record<string, unknown> } | null;
  };
  tools: {
    success: boolean;
    status: number;
    data: RosterTool[] | null;
  };
  stats: {
    success: boolean;
    status: number;
    data:
      | {
          total: number;
          byType: Record<string, number>;
          subagents?: {
            total: number;
            categories?: string[];
            models?: string[];
          };
          generatedAt?: string;
        }
      | null;
  };
  runs: {
    success: boolean;
    status: number;
    data: { executions?: RunSummary[]; total?: number } | null;
  };
  subscription: {
    success: boolean;
    status: number;
    data:
      | {
          userId?: string;
          email?: string;
          subscriptionTier?: string;
          rateLimit?: { requests: number; windowMs: number };
        }
      | null;
  };
};

export type IntegrationSetupPayload = {
  title: string;
  summary: string;
  steps: string[];
  configLabel: string;
  config: string;
};
