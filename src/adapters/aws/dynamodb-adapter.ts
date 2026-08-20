import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { IPromptRepository, SubagentFilter } from '../../core/ports/prompt-repository.interface';
import { Prompt } from '../../core/entities/prompt.entity';
import type { PromptType, ClaudeModel } from '../../core/entities/prompt.entity';

export class DynamoDBAdapter implements IPromptRepository {
  private client: DynamoDBClient;

  constructor(
    private tableName: string,
    private region: string = process.env.AWS_REGION || 'us-east-1',
  ) {
    this.client = new DynamoDBClient({ region: this.region });
  }

  async save(prompt: Prompt): Promise<void> {
    const item = marshall({
      id: prompt.id,
      version: prompt.version,
      name: prompt.name,
      description: prompt.description,
      template: prompt.template,
      category: prompt.category,
      tags: prompt.tags,
      variables: prompt.variables,
      access_level: prompt.accessLevel,
      author_id: prompt.authorId || 'system',
      created_at: prompt.createdAt.toISOString(),
      updated_at: prompt.updatedAt.toISOString(),
      is_latest: prompt.isLatest ? 'true' : 'false',
      metadata: prompt.metadata,
      prompt_type: prompt.promptType,
      agent_config: prompt.agentConfig ?? {},
    });

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  async findById(id: string, version?: string): Promise<Prompt | null> {
    const key = marshall({
      id: id,
      version: version || 'latest',
    });

    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: key,
    });

    const result = await this.client.send(command);

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item);
    return this.mapToPrompt(item);
  }

  async findByCategory(category: string, limit: number = 50): Promise<Prompt[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: marshall({
        ':category': category,
      }),
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    });

    const result = await this.client.send(command);

    return result.Items?.map((item: any) => this.mapToPrompt(unmarshall(item))) || [];
  }

  async findLatestVersions(limit: number = 100): Promise<Prompt[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'is_latest = :is_latest',
      ExpressionAttributeValues: marshall({
        ':is_latest': 'true',
      }),
      Limit: limit,
    });

    const result = await this.client.send(command);

    return result.Items?.map((item: any) => this.mapToPrompt(unmarshall(item))) || [];
  }

  async search(query: string, category?: string): Promise<Prompt[]> {
    let filterExpression =
      'contains(#name, :query) OR contains(description, :query) OR contains(template, :query)';
    let expressionAttributeValues: any = {
      ':query': query,
    };

    if (category) {
      filterExpression += ' AND category = :category';
      expressionAttributeValues[':category'] = category;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#name': 'name', // 'name' is a reserved keyword
      },
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      Limit: 50,
    });

    const result = await this.client.send(command);

    return result.Items?.map((item: any) => this.mapToPrompt(unmarshall(item))) || [];
  }

  async update(id: string, version: string, updates: Partial<Prompt>): Promise<void> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    if (updates.name) {
      updateExpression.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = updates.name;
    }

    if (updates.description) {
      updateExpression.push('description = :description');
      expressionAttributeValues[':description'] = updates.description;
    }

    if (updates.template) {
      updateExpression.push('template = :template');
      expressionAttributeValues[':template'] = updates.template;
    }

    if (updates.category) {
      updateExpression.push('category = :category');
      expressionAttributeValues[':category'] = updates.category;
    }

    if (updates.tags) {
      updateExpression.push('tags = :tags');
      expressionAttributeValues[':tags'] = updates.tags;
    }

    if (updates.variables) {
      updateExpression.push('variables = :variables');
      expressionAttributeValues[':variables'] = updates.variables;
    }

    updateExpression.push('updated_at = :updated_at');
    expressionAttributeValues[':updated_at'] = new Date().toISOString();

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ id, version }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    });

    await this.client.send(command);
  }

  async delete(id: string, version?: string): Promise<void> {
    if (version) {
      // Delete specific version
      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ id, version }),
      });
      await this.client.send(command);
    } else {
      // Delete all versions - first query all versions
      const queryCommand = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: marshall({ ':id': id }),
      });

      const result = await this.client.send(queryCommand);

      // Delete each version
      for (const item of result.Items || []) {
        const unmarshalled = unmarshall(item);
        const deleteCommand = new DeleteItemCommand({
          TableName: this.tableName,
          Key: marshall({ id: unmarshalled.id, version: unmarshalled.version }),
        });
        await this.client.send(deleteCommand);
      }
    }
  }

  async getVersions(id: string): Promise<string[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: marshall({ ':id': id }),
      ProjectionExpression: 'version',
      ScanIndexForward: false,
    });

    const result = await this.client.send(command);

    return result.Items?.map((item: any) => unmarshall(item).version) || [];
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      // Simple table description call to check connectivity
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: 1,
      });

      await this.client.send(command);

      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tableName: this.tableName,
        },
      };
    }
  }

  async findByType(type: PromptType, limit?: number): Promise<Prompt[]> {
    const allPrompts = await this.findLatestVersions(limit || 1000);
    return allPrompts.filter((p) => p.promptType === type);
  }

  async findSubagents(filter?: SubagentFilter, limit?: number): Promise<Prompt[]> {
    let prompts = await this.findByType('subagent_registry', limit);

    if (!filter) {
      return prompts;
    }

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

    if (projectType) {
      prompts = prompts.filter(
        (p) =>
          p.agentConfig?.compatibleWith?.includes(projectType) ||
          p.id.includes(projectType) ||
          p.category === projectType,
      );
    }

    return prompts;
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
    const agents = await this.findLatestVersions(10000);
    const models = new Set<ClaudeModel>();

    agents.forEach((agent) => {
      const model = agent.getModel();
      if (model) {
        models.add(model);
      }
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
      {
        ...prompt.agentConfig,
        executionCount,
        successRate,
        lastExecutedAt,
      },
    );

    await this.save(updated);
  }

  private mapToPrompt(item: any): Prompt {
    const rawConfig = item.agent_config;
    const agentConfig =
      rawConfig && typeof rawConfig === 'object' && Object.keys(rawConfig).length > 0
        ? {
            ...rawConfig,
            lastExecutedAt:
              rawConfig.lastExecutedAt != null
                ? new Date(rawConfig.lastExecutedAt)
                : rawConfig.last_executed_at != null
                  ? new Date(rawConfig.last_executed_at)
                  : undefined,
          }
        : undefined;

    return new Prompt(
      item.id,
      item.name,
      item.description,
      item.template,
      item.category,
      item.tags || [],
      item.variables || [],
      item.version,
      new Date(item.created_at),
      new Date(item.updated_at),
      item.is_latest === 'true',
      item.metadata || {},
      item.access_level || 'public',
      item.author_id,
      (item.prompt_type as PromptType) || 'standard',
      agentConfig,
    );
  }
}
