import { Prompt } from '../core/entities/prompt.entity';
import type { PromptType, ClaudeModel } from '../core/entities/prompt.entity';
import { IPromptRepository, SubagentFilter } from '../core/ports/prompt-repository.interface';
import { ICatalogRepository } from '../core/ports/catalog-repository.interface';
import { IEventBus, PromptEvent } from '../core/ports/event-bus.interface';
import { logger } from '../utils';

// Simple in-memory storage for prompts
const prompts = new Map<string, Prompt>();

export class MemoryPromptRepository implements IPromptRepository {
  async save(prompt: Prompt): Promise<void> {
    prompts.set(prompt.id, prompt);
    logger.info(`Saved prompt: ${prompt.id}`);
  }

  async findById(id: string, version?: string): Promise<Prompt | null> {
    const prompt = prompts.get(id);
    return prompt || null;
  }

  async findByCategory(category: string, limit?: number): Promise<Prompt[]> {
    const categoryPrompts = Array.from(prompts.values())
      .filter((p) => p.category === category)
      .slice(0, limit || 50);
    return categoryPrompts;
  }

  async findLatestVersions(limit?: number): Promise<Prompt[]> {
    const latestPrompts = Array.from(prompts.values())
      .filter((p) => p.isLatest)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit || 50);
    return latestPrompts;
  }

  async search(query: string, category?: string): Promise<Prompt[]> {
    let searchResults = Array.from(prompts.values());

    if (category) {
      searchResults = searchResults.filter((p) => p.category === category);
    }

    const queryLower = query.toLowerCase();
    searchResults = searchResults.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.template.toLowerCase().includes(queryLower) ||
        p.tags.some((tag) => tag.toLowerCase().includes(queryLower)),
    );

    return searchResults;
  }

  async update(id: string, version: string, updates: Partial<Prompt>): Promise<void> {
    const existingPrompt = prompts.get(id);
    if (!existingPrompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    const updatedPrompt = new Prompt(
      existingPrompt.id,
      updates.name || existingPrompt.name,
      updates.description || existingPrompt.description,
      updates.template || existingPrompt.template,
      updates.category || existingPrompt.category,
      updates.tags || existingPrompt.tags,
      updates.variables || existingPrompt.variables,
      version,
      existingPrompt.createdAt,
      new Date(),
      updates.isLatest !== undefined ? updates.isLatest : existingPrompt.isLatest,
      updates.metadata || existingPrompt.metadata,
    );

    prompts.set(id, updatedPrompt);
    logger.info(`Updated prompt: ${id}`);
  }

  async delete(id: string, version?: string): Promise<void> {
    const prompt = prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    prompts.delete(id);
    logger.info(`Deleted prompt: ${id}`);
  }

  async getVersions(id: string): Promise<string[]> {
    const prompt = prompts.get(id);
    return prompt ? [prompt.version] : [];
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return {
      status: 'healthy',
      details: {
        totalPrompts: prompts.size,
        storage: 'memory',
      },
    };
  }

  async findByType(type: PromptType, limit?: number): Promise<Prompt[]> {
    const allPrompts = await this.findLatestVersions(limit || 1000);
    return allPrompts.filter((p) => p.promptType === type);
  }

  async findSubagents(filter?: SubagentFilter, limit?: number): Promise<Prompt[]> {
    let list = await this.findByType('subagent_registry', limit);
    if (!filter) return list;
    if (filter.category) list = list.filter((p) => p.category === filter.category);
    if (filter.tags?.length) {
      list = list.filter((p) => filter.tags!.every((tag) => p.tags.includes(tag)));
    }
    if (filter.model) list = list.filter((p) => p.getModel() === filter.model);
    if (filter.compatibleWith) {
      list = list.filter((p) => p.agentConfig?.compatibleWith?.includes(filter.compatibleWith!));
    }
    return list;
  }

  async findMainAgents(projectType?: string, limit?: number): Promise<Prompt[]> {
    let list = await this.findByType('main_agent_template', limit);
    if (projectType) {
      list = list.filter(
        (p) =>
          p.agentConfig?.compatibleWith?.includes(projectType) ||
          p.id.includes(projectType) ||
          p.category === projectType,
      );
    }
    return list;
  }

  async findProjectTemplates(limit?: number): Promise<Prompt[]> {
    return this.findByType('project_orchestration_template', limit);
  }

  async getSubagentCategories(): Promise<string[]> {
    const subagents = await this.findSubagents();
    return Array.from(new Set(subagents.map((s) => s.category))).sort();
  }

  async getAgentModels(): Promise<ClaudeModel[]> {
    const agents = await this.findLatestVersions(10000);
    const models = new Set<ClaudeModel>();
    agents.forEach((a) => {
      const m = a.getModel();
      if (m) models.add(m);
    });
    return Array.from(models);
  }

  async updateExecutionStats(
    id: string,
    executionCount: number,
    successRate: number,
    lastExecutedAt: Date,
  ): Promise<void> {
    const prompt = await this.findById(id);
    if (!prompt || !prompt.agentConfig) {
      throw new Error(`Agent ${id} not found or not an agent prompt`);
    }
    const updated = new Prompt(
      prompt.id,
      prompt.name,
      prompt.description,
      prompt.template,
      prompt.category,
      prompt.tags,
      prompt.variables,
      prompt.version,
      prompt.createdAt,
      new Date(),
      prompt.isLatest,
      prompt.metadata,
      prompt.accessLevel,
      prompt.authorId,
      prompt.promptType,
      { ...prompt.agentConfig, executionCount, successRate, lastExecutedAt },
    );
    await this.save(updated);
  }
}

export class MemoryCatalogRepository implements ICatalogRepository {
  async syncFromGitHub(repoUrl: string): Promise<void> {
    logger.info(`GitHub sync requested for ${repoUrl} (memory mode - no action needed)`);
  }

  async getPromptTemplate(category: string, name: string): Promise<string> {
    const prompt = Array.from(prompts.values()).find(
      (p) => p.category === category && p.name === name,
    );
    return prompt ? prompt.template : '';
  }

  async getCatalogIndex(): Promise<any> {
    return {
      prompts: Array.from(prompts.values()),
      metadata: {
        total: prompts.size,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  async uploadPrompt(category: string, name: string, content: any): Promise<void> {
    logger.info(`Upload prompt requested: ${category}/${name} (memory mode - no action needed)`);
  }

  async deletePrompt(category: string, name: string): Promise<void> {
    logger.info(`Delete prompt requested: ${category}/${name} (memory mode - no action needed)`);
  }

  async listPrompts(category?: string): Promise<string[]> {
    const filteredPrompts = category
      ? Array.from(prompts.values()).filter((p) => p.category === category)
      : Array.from(prompts.values());
    return filteredPrompts.map((p) => p.name);
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return {
      status: 'healthy',
      details: {
        storage: 'memory',
      },
    };
  }
}

export class MemoryEventBus implements IEventBus {
  async publish(event: PromptEvent): Promise<void> {
    logger.info('Event published (memory mode):', event.type);
  }

  async subscribe(
    eventType: string,
    handler: (event: PromptEvent) => Promise<void>,
  ): Promise<void> {
    logger.info(`Subscribed to ${eventType} events (memory mode)`);
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return {
      status: 'healthy',
      details: {
        storage: 'memory',
      },
    };
  }
}

// Load sample prompts on startup
export function loadSamplePrompts() {
  try {
    const fs = require('fs');
    const path = require('path');
    const sampleDataPath = path.join(process.cwd(), 'data', 'sample-prompts.json');
    const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

    for (const promptData of sampleData.prompts) {
      const prompt = new Prompt(
        promptData.id,
        promptData.name,
        promptData.description || promptData.name,
        promptData.content || promptData.template,
        promptData.category || 'general',
        promptData.tags || [],
        promptData.variables || [],
        'latest',
        new Date(),
        new Date(),
        true,
        promptData.metadata || {},
      );
      prompts.set(prompt.id, prompt);
    }
    logger.info(`Loaded ${sampleData.prompts.length} sample prompts into memory`);
  } catch (error) {
    logger.warn('Could not load sample prompts:', error);
  }
}
