// @ts-nocheck — MCP SDK + Zod input schemas exceed TS recursion depth (TS2589); runtime types are validated by Zod.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PromptService } from '../core/services/prompt.service.js';
import { SlashCommandsService } from '../core/services/slash-commands.service.js';
import { convexAuthStorage } from '../lib/convex-auth-context.js';

const textResult = (data: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    },
  ],
});

function clerkUserContextForSlash() {
  const s = convexAuthStorage.getStore();
  if (!s?.userId) return undefined;
  return { userId: s.userId, subscriptionTier: 'premium' as const };
}

/**
 * Spec-native MCP server (SDK) with the same tools as {@link ./mcp-server.ts} for Streamable HTTP.
 */
export function createPromptsSdkMcpServer(
  promptService: PromptService,
  slash: SlashCommandsService,
): McpServer {
  const server = new McpServer({
    name: 'roster',
    version: '3.14.0',
  });

  server.registerTool(
    'get_prompt',
    {
      description: 'Get a prompt by ID',
      inputSchema: {
        id: z.string(),
        version: z.string().optional(),
      },
    },
    async (args) => {
      const prompt = await promptService.getPrompt(args.id, args.version);
      return textResult(prompt ? prompt.toJSON() : null);
    },
  );

  server.registerTool(
    'list_prompts',
    {
      description: 'List prompts by category or latest',
      inputSchema: {
        category: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const prompts = args.category
        ? await promptService.getPromptsByCategory(args.category, args.limit ?? 50)
        : await promptService.getLatestPrompts(args.limit ?? 50);
      return textResult(prompts.map((p) => p.toJSON()));
    },
  );

  server.registerTool(
    'search_prompts',
    {
      description: 'Search prompts',
      inputSchema: {
        query: z.string(),
        category: z.string().optional(),
      },
    },
    async (args) => {
      const results = await promptService.searchPrompts(args.query, args.category);
      return textResult(results.map((p) => p.toJSON()));
    },
  );

  server.registerTool(
    'apply_template',
    {
      description: 'Apply variables to a prompt template',
      inputSchema: {
        promptId: z.string(),
        variables: z.record(z.unknown()),
      },
    },
    async (args) => {
      const out = await promptService.applyTemplate(
        args.promptId,
        args.variables as Record<string, unknown>,
      );
      return textResult(out);
    },
  );

  server.registerTool(
    'create_prompt',
    {
      description: 'Create a new prompt',
      inputSchema: {
        name: z.string(),
        content: z.string().optional(),
        template: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        variables: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      const template = args.template ?? args.content;
      if (!template) throw new Error('template or content is required');
      const created = await promptService.createPrompt({ ...args, template });
      return textResult(created.toJSON());
    },
  );

  server.registerTool(
    'update_prompt',
    {
      description: 'Update an existing prompt',
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        content: z.string().optional(),
        template: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        variables: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      const { id, ...rest } = args;
      const body =
        rest.template !== undefined || rest.content !== undefined
          ? { ...rest, template: rest.template ?? rest.content }
          : rest;
      const updated = await promptService.updatePrompt(id, body);
      return textResult(updated.toJSON());
    },
  );

  server.registerTool(
    'delete_prompt',
    {
      description: 'Delete a prompt',
      inputSchema: { id: z.string() },
    },
    async (args) => {
      await promptService.deletePrompt(args.id);
      return textResult('Prompt deleted successfully');
    },
  );

  server.registerTool(
    'get_stats',
    {
      description: 'Get aggregate statistics for prompts in storage',
      inputSchema: { limit: z.number().optional() },
    },
    async (args) => {
      const stats = await promptService.getPromptStats(args.limit ?? 2000);
      return textResult(stats);
    },
  );

  server.registerTool(
    'slash_command',
    {
      description: 'Execute a slash command',
      inputSchema: {
        command: z.string(),
        variables: z.record(z.unknown()).optional(),
      },
    },
    async (args) => {
      const result = await slash.executeCommand(
        args.command,
        (args.variables ?? {}) as Record<string, unknown>,
        clerkUserContextForSlash(),
      );
      return textResult(result);
    },
  );

  server.registerTool(
    'list_slash_commands',
    {
      description: 'List slash commands',
      inputSchema: {
        category: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const commands = args.category
        ? await slash.getCommandsByCategory(args.category, clerkUserContextForSlash())
        : await slash.getAvailableCommands(clerkUserContextForSlash());
      return textResult(commands.slice(0, args.limit ?? 20));
    },
  );

  server.registerTool(
    'suggest_slash_commands',
    {
      description: 'Suggest slash commands',
      inputSchema: {
        query: z.string(),
        limit: z.number().optional(),
      },
    },
    async (args) => {
      const suggestions = (
        await slash.getCommandSuggestions(args.query, clerkUserContextForSlash())
      ).slice(0, args.limit ?? 10);
      return textResult(suggestions);
    },
  );

  return server;
}
