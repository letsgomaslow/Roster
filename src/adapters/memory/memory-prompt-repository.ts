import { IPromptRepository, SubagentFilter } from '../../core/ports/prompt-repository.interface';
import { Prompt } from '../../core/entities/prompt.entity';
import type { PromptType, ClaudeModel } from '../../core/entities/prompt.entity';

export class MemoryPromptRepository implements IPromptRepository {
  private prompts: Map<string, Prompt> = new Map();

  async save(prompt: Prompt): Promise<void> {
    this.prompts.set(`${prompt.id}:${prompt.version}`, prompt);
  }

  async findById(id: string, version?: string): Promise<Prompt | null> {
    const key = version ? `${id}:${version}` : `${id}:latest`;
    if (version) {
      return this.prompts.get(key) || null;
    }

    // Find latest version
    const versions = Array.from(this.prompts.keys())
      .filter((k) => k.startsWith(`${id}:`))
      .map((k) => k.split(':')[1]);

    if (versions.length === 0) {
      return null;
    }

    const latestVersion = versions.sort().pop()!;
    return this.prompts.get(`${id}:${latestVersion}`) || null;
  }

  async findByCategory(category: string, limit?: number): Promise<Prompt[]> {
    const prompts = Array.from(this.prompts.values())
      .filter((p) => p.category === category)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return limit ? prompts.slice(0, limit) : prompts;
  }

  async findLatestVersions(limit: number = 50): Promise<Prompt[]> {
    return Array.from(this.prompts.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  async search(query: string, category?: string): Promise<Prompt[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.prompts.values()).filter((prompt) => {
      if (category && prompt.category !== category) {
        return false;
      }

      return (
        prompt.name.toLowerCase().includes(lowerQuery) ||
        prompt.description.toLowerCase().includes(lowerQuery) ||
        prompt.template.toLowerCase().includes(lowerQuery) ||
        (prompt.tags && prompt.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
      );
    });
  }

  async update(id: string, version: string, updates: Partial<Prompt>): Promise<void> {
    const existing = await this.findById(id, version);
    if (!existing) {
      throw new Error(`Prompt ${id} version ${version} not found`);
    }

    const updated = new Prompt(
      existing.id,
      updates.name || existing.name,
      updates.description || existing.description,
      updates.template || existing.template,
      updates.category || existing.category,
      updates.tags || existing.tags,
      updates.variables || existing.variables,
      updates.version || existing.version,
      existing.createdAt,
      new Date(),
      existing.isLatest,
      existing.metadata,
      updates.accessLevel || existing.accessLevel,
      updates.authorId || existing.authorId,
    );

    await this.save(updated);
  }

  async delete(id: string, version?: string): Promise<void> {
    if (version) {
      this.prompts.delete(`${id}:${version}`);
    } else {
      // Delete all versions
      const keysToDelete = Array.from(this.prompts.keys()).filter((k) => k.startsWith(`${id}:`));
      keysToDelete.forEach((key) => this.prompts.delete(key));
    }
  }

  async getVersions(id: string): Promise<string[]> {
    return Array.from(this.prompts.keys())
      .filter((k) => k.startsWith(`${id}:`))
      .map((k) => k.split(':')[1])
      .sort();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return { status: 'healthy' };
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
