import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { IPromptRepository, SubagentFilter } from '../../core/ports/prompt-repository.interface';
import { Prompt, PromptType, ClaudeModel } from '../../core/entities/prompt.entity';
import { convexAuthStorage } from '../../lib/convex-auth-context.js';
import {
  convexDocToPrompt,
  promptToConvexDoc,
  type ConvexPromptDoc,
} from './convex-prompt-mapper.js';

const qHealth = makeFunctionReference<'query'>('prompts:health');
const qGetByPromptId = makeFunctionReference<'query'>('prompts:getByPromptId');
const qListByOwner = makeFunctionReference<'query'>('prompts:listByOwner');
const qListByCategory = makeFunctionReference<'query'>('prompts:listByCategory');
const qSearch = makeFunctionReference<'query'>('prompts:searchPrompts');
const qListVersions = makeFunctionReference<'query'>('prompts:listVersions');
const qFindByPromptType = makeFunctionReference<'query'>('prompts:findByPromptType');
const mSave = makeFunctionReference<'mutation'>('prompts:savePrompt');
const mDelete = makeFunctionReference<'mutation'>('prompts:deletePrompt');
const mUpdateStats = makeFunctionReference<'mutation'>('prompts:updateExecutionStatsMutation');

export class ConvexPromptRepository implements IPromptRepository {
  constructor(private readonly convexUrl: string) {}

  private anonymousClient(): ConvexHttpClient {
    return new ConvexHttpClient(this.convexUrl, { logger: false });
  }

  private authedClient(): ConvexHttpClient {
    const c = new ConvexHttpClient(this.convexUrl, { logger: false });
    const token = convexAuthStorage.getStore()?.token;
    if (token) {
      c.setAuth(token);
    }
    return c;
  }

  async save(prompt: Prompt): Promise<void> {
    const ownerUserId =
      convexAuthStorage.getStore()?.ownerId ??
      convexAuthStorage.getStore()?.userId ??
      process.env.CONVEX_DEV_OWNER_USER_ID;
    if (!ownerUserId) {
      throw new Error(
        'ConvexPromptRepository.save requires Clerk session or CONVEX_DEV_OWNER_USER_ID',
      );
    }
    const doc = promptToConvexDoc(prompt, ownerUserId);
    await this.authedClient().mutation(mSave, { doc });
  }

  async findById(id: string, version?: string): Promise<Prompt | null> {
    const row = await this.authedClient().query(qGetByPromptId, { promptId: id, version });
    if (!row) return null;
    return convexDocToPrompt(row as ConvexPromptDoc);
  }

  async findByCategory(category: string, limit?: number): Promise<Prompt[]> {
    const rows = await this.authedClient().query(qListByCategory, { category, limit });
    return (rows as ConvexPromptDoc[]).map(convexDocToPrompt);
  }

  async findLatestVersions(limit: number = 50): Promise<Prompt[]> {
    const rows = await this.authedClient().query(qListByOwner, { limit });
    return (rows as ConvexPromptDoc[]).map(convexDocToPrompt);
  }

  async search(query: string, category?: string): Promise<Prompt[]> {
    const rows = await this.authedClient().query(qSearch, { query, category });
    return (rows as ConvexPromptDoc[]).map(convexDocToPrompt);
  }

  async update(id: string, version: string, updates: Partial<Prompt>): Promise<void> {
    const existing = await this.findById(id, version);
    if (!existing) {
      throw new Error(`Prompt ${id} version ${version} not found`);
    }
    const merged = new Prompt(
      existing.id,
      updates.name ?? existing.name,
      updates.description ?? existing.description,
      updates.template ?? existing.template,
      updates.category ?? existing.category,
      updates.tags ?? existing.tags,
      updates.variables ?? existing.variables,
      updates.version ?? existing.version,
      existing.createdAt,
      new Date(),
      existing.isLatest,
      { ...existing.metadata, ...(updates.metadata ?? {}) },
      updates.accessLevel ?? existing.accessLevel,
      updates.authorId ?? existing.authorId,
      updates.promptType ?? existing.promptType,
      updates.agentConfig ?? existing.agentConfig,
    );
    await this.save(merged);
  }

  async delete(id: string, version?: string): Promise<void> {
    await this.authedClient().mutation(mDelete, { promptId: id, version });
  }

  async getVersions(id: string): Promise<string[]> {
    const v = await this.authedClient().query(qListVersions, { promptId: id });
    return (v as string[]) ?? [];
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: unknown }> {
    try {
      await this.anonymousClient().query(qHealth, {});
      return { status: 'healthy' };
    } catch (e) {
      return { status: 'unhealthy', details: e };
    }
  }

  async findByType(type: PromptType, limit?: number): Promise<Prompt[]> {
    const rows = await this.authedClient().query(qFindByPromptType, {
      promptType: type,
      limit,
    });
    return (rows as ConvexPromptDoc[]).map(convexDocToPrompt);
  }

  async findSubagents(filter?: SubagentFilter, limit?: number): Promise<Prompt[]> {
    let prompts = await this.findByType('subagent_registry', limit);
    if (!filter) return prompts;
    if (filter.category) {
      prompts = prompts.filter((p) => p.category === filter.category);
    }
    if (filter.tags && filter.tags.length > 0) {
      prompts = prompts.filter((p) => filter.tags!.every((tag) => p.tags.includes(tag)));
    }
    if (filter.model) {
      prompts = prompts.filter((p) => p.getModel() === filter.model);
    }
    if (filter.compatibleWith) {
      prompts = prompts.filter((p) =>
        p.agentConfig?.compatibleWith?.includes(filter.compatibleWith!),
      );
    }
    return prompts;
  }

  async findMainAgents(projectType?: string, limit?: number): Promise<Prompt[]> {
    let prompts = await this.findByType('main_agent_template', limit);
    if (!projectType) return prompts;
    return prompts.filter(
      (p) =>
        p.agentConfig?.compatibleWith?.includes(projectType) ||
        p.id.includes(projectType) ||
        p.category === projectType,
    );
  }

  async findProjectTemplates(limit?: number): Promise<Prompt[]> {
    return this.findByType('project_orchestration_template', limit);
  }

  async getSubagentCategories(): Promise<string[]> {
    const subagents = await this.findSubagents();
    const categories = new Set(subagents.map((s) => s.category));
    return Array.from(categories).sort();
  }

  async getAgentModels(): Promise<ClaudeModel[]> {
    const agents = await this.findLatestVersions(2000);
    const models = new Set<ClaudeModel>();
    agents.forEach((agent) => {
      const model = agent.getModel();
      if (model) models.add(model);
    });
    return Array.from(models);
  }

  async updateExecutionStats(
    id: string,
    executionCount: number,
    successRate: number,
    lastExecutedAt: Date,
  ): Promise<void> {
    await this.authedClient().mutation(mUpdateStats, {
      promptId: id,
      executionCount,
      successRate,
      lastExecutedAt: lastExecutedAt.getTime(),
    });
  }
}
