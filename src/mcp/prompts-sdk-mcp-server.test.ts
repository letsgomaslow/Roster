import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createPromptsSdkMcpServer } from './prompts-sdk-mcp-server.js';
import type { PromptService } from '../core/services/prompt.service.js';
import type { SlashCommandsService } from '../core/services/slash-commands.service.js';
import { Prompt } from '../core/entities/prompt.entity.js';

function samplePrompt(id = 'p1'): Prompt {
  return new Prompt(
    id,
    'Name',
    'Desc',
    'Hello {{x}}',
    'general',
    ['t1'],
    [],
    '1',
    new Date(),
    new Date(),
    true,
    { isTemplate: true },
    'public',
  );
}

describe('createPromptsSdkMcpServer (InMemory MCP)', () => {
  let promptService: PromptService;
  let slash: SlashCommandsService;

  beforeEach(() => {
    promptService = {
      getPrompt: vi.fn().mockResolvedValue(samplePrompt()),
      getLatestPrompts: vi.fn().mockResolvedValue([samplePrompt()]),
      getPromptsByCategory: vi.fn().mockResolvedValue([samplePrompt()]),
      searchPrompts: vi.fn().mockResolvedValue([samplePrompt()]),
      applyTemplate: vi.fn().mockResolvedValue('rendered'),
      createPrompt: vi.fn().mockResolvedValue(samplePrompt('new')),
      updatePrompt: vi.fn().mockResolvedValue(samplePrompt('upd')),
      deletePrompt: vi.fn().mockResolvedValue(undefined),
      getPromptStats: vi.fn().mockResolvedValue({
        total: 1,
        templates: 1,
        regular: 0,
        tags: ['t1'],
        categories: ['general'],
        byCategory: { general: 1 },
      }),
    } as unknown as PromptService;

    slash = {
      executeCommand: vi.fn().mockResolvedValue({ ok: true }),
      getCommandsByCategory: vi.fn().mockResolvedValue([{ command: '/x', description: 'd' }]),
      getAvailableCommands: vi.fn().mockResolvedValue([{ command: '/y', description: 'd' }]),
      getCommandSuggestions: vi.fn().mockResolvedValue([{ command: '/z', description: 'd' }]),
    } as unknown as SlashCommandsService;
  });

  async function withClient(fn: (client: Client) => Promise<void>): Promise<void> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const mcp = createPromptsSdkMcpServer(promptService, slash);
    await mcp.connect(serverTransport);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientTransport);
    try {
      await fn(client);
    } finally {
      await client.close();
      await mcp.close();
    }
  }

  it('lists all registered tools including get_stats', async () => {
    await withClient(async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual(
        [
          'apply_template',
          'create_prompt',
          'delete_prompt',
          'get_prompt',
          'get_stats',
          'list_prompts',
          'list_slash_commands',
          'search_prompts',
          'slash_command',
          'suggest_slash_commands',
          'update_prompt',
        ].sort(),
      );
    });
  });

  const toolCases: { name: string; args: Record<string, unknown> }[] = [
    { name: 'get_prompt', args: { id: 'p1' } },
    { name: 'list_prompts', args: {} },
    { name: 'list_prompts', args: { category: 'general', limit: 2 } },
    { name: 'search_prompts', args: { query: 'hi' } },
    { name: 'apply_template', args: { promptId: 'p1', variables: { x: '1' } } },
    { name: 'create_prompt', args: { name: 'n', template: 't' } },
    { name: 'update_prompt', args: { id: 'p1', name: 'x' } },
    { name: 'delete_prompt', args: { id: 'p1' } },
    { name: 'get_stats', args: {} },
    { name: 'slash_command', args: { command: '/review' } },
    { name: 'list_slash_commands', args: {} },
    { name: 'suggest_slash_commands', args: { query: 'rev' } },
  ];

  it.each(toolCases)('callTool $name succeeds', async ({ name, args }) => {
    await withClient(async (client) => {
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError).not.toBe(true);
      expect(res.content).toBeDefined();
      expect(Array.isArray(res.content)).toBe(true);
    });
  });
});
