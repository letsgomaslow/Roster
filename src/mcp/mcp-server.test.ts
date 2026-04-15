import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from './mcp-server';
import { PromptService } from '../core/services/prompt.service';
import { IPromptRepository } from '../core/ports/prompt-repository.interface';
import { Prompt } from '../core/entities/prompt.entity';

// Mock dependencies
class MockPromptRepository implements IPromptRepository {
  async save(prompt: any): Promise<void> {}
  async findById(id: string, version?: string): Promise<any> {
    return null;
  }
  async findByCategory(category: string, limit?: number): Promise<any[]> {
    return [];
  }
  async findLatestVersions(limit?: number): Promise<any[]> {
    return [];
  }
  async search(query: string, category?: string): Promise<any[]> {
    return [];
  }
  async update(id: string, version: string, updates: Partial<any>): Promise<void> {}
  async delete(id: string, version?: string): Promise<void> {}
  async getVersions(id: string): Promise<string[]> {
    return [];
  }
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return { status: 'healthy' };
  }
}

class MockCatalogRepository {
  async save(prompt: any): Promise<void> {}
  async findById(id: string): Promise<any> {
    return null;
  }
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'healthy' };
  }
}

class MockEventBus {
  async publish(event: any): Promise<void> {}
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'healthy' };
  }
}

function latestStdinDataHandler(spy: { mock: { calls: unknown[][] } }) {
  const dataCalls = spy.mock.calls.filter((c) => (c as string[])[0] === 'data');
  return (dataCalls[dataCalls.length - 1] as [string, (buf: Buffer) => void | Promise<void>])?.[1];
}

describe('McpServer', () => {
  let mcpServer: McpServer;
  let promptService: PromptService;
  let mockPromptRepository: MockPromptRepository;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stdinOnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create mocks
    mockPromptRepository = new MockPromptRepository();
    const mockCatalogRepository = new MockCatalogRepository();
    const mockEventBus = new MockEventBus();
    promptService = new PromptService(
      mockPromptRepository as any,
      mockCatalogRepository as any,
      mockEventBus as any,
    );

    mcpServer = new McpServer(promptService, mockPromptRepository);

    const out = process.stdout as NodeJS.WriteStream & {
      setEncoding?: (enc: BufferEncoding) => NodeJS.WriteStream;
    };
    if (typeof out.setEncoding !== 'function') {
      out.setEncoding = function () {
        return this;
      };
    }
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(out, 'setEncoding' as keyof typeof out).mockImplementation(() => out);
    vi.spyOn(process.stdout, 'on').mockReturnValue(process.stdout as NodeJS.WriteStream);
    vi.spyOn(process.stdout, 'once').mockReturnValue(process.stdout as NodeJS.WriteStream);
    const origStdinOn = process.stdin.on.bind(process.stdin);
    stdinOnSpy = vi
      .spyOn(process.stdin, 'on')
      .mockImplementation((event: string, listener: any) => {
        if (event === 'end') {
          return process.stdin;
        }
        return origStdinOn(event, listener);
      });
    vi.spyOn(process.stdin, 'setEncoding').mockImplementation(() => process.stdin);
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as typeof process.exit);
    process.stdin.setMaxListeners?.(0);

    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should wait for initialize request before responding', async () => {
      await mcpServer.start();

      // Verify stdin listener was set up
      expect(stdinOnSpy).toHaveBeenCalledWith('data', expect.any(Function));

      // No response should be sent until initialize is received
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it('should handle initialize request correctly', async () => {
      await mcpServer.start();

      const dataHandler = latestStdinDataHandler(stdinOnSpy);
      expect(dataHandler).toBeDefined();

      const initializeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      await dataHandler(Buffer.from(JSON.stringify(initializeRequest) + '\n'));

      // Should send initialize response
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2025-11-25');
      expect(response.result.serverInfo.name).toBe('roster');
      expect(response.result.serverInfo.version).toBe('3.14.0');
    });

    it('should handle initialized notification', async () => {
      await mcpServer.start();

      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // First initialize
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initRequest) + '\n'));
      stdoutWriteSpy.mockClear();

      // Then initialized notification
      const initializedNotification = {
        jsonrpc: '2.0',
        method: 'initialized',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initializedNotification) + '\n'));

      // Notifications don't get responses
      // Should not send any response for initialized notification
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it('should reject requests before initialization', async () => {
      await mcpServer.start();

      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // Try to call a tool before initialize
      const toolRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(toolRequest) + '\n'));

      // Should send error response
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32002);
      expect(response.error.message).toBe('Invalid Request');
    });

    it('should reject duplicate initialize requests', async () => {
      await mcpServer.start();

      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // First initialize
      const initRequest1 = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initRequest1) + '\n'));
      stdoutWriteSpy.mockClear();

      // Try to initialize again
      const initRequest2 = {
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initRequest2) + '\n'));

      // Should send error
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32002);
    });
  });

  describe('Tools', () => {
    beforeEach(async () => {
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // Initialize first
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initRequest) + '\n'));
      stdoutWriteSpy.mockClear();
    });

    it('should handle tools/list request', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const toolsListRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(toolsListRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThan(0);

      // Check for expected tools
      const toolNames = response.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_prompt');
      expect(toolNames).toContain('list_prompts');
      expect(toolNames).toContain('search_prompts');
      expect(toolNames).toContain('get_stats');
      expect(toolNames).toContain('delete_prompt');
      expect(toolNames).toContain('slash_command');
    });

    it('should handle tools/call request', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // Mock the prompt service method
      vi.spyOn(promptService, 'getLatestPrompts').mockResolvedValue([]);

      const toolsCallRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_prompts',
          arguments: {},
        },
      };
      await dataHandler(Buffer.from(JSON.stringify(toolsCallRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
    });

    it('should handle invalid tool name', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const toolsCallRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'invalid_tool',
          arguments: {},
        },
      };
      await dataHandler(Buffer.from(JSON.stringify(toolsCallRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe('Method not found');
    });

    it('should handle missing tool name in tools/call', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const toolsCallRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          arguments: {},
        },
      };
      await dataHandler(Buffer.from(JSON.stringify(toolsCallRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toBe('Invalid params');
    });
  });

  describe('All registered tools via tools/call', () => {
    type SlashCommandsServiceLike = {
      executeCommand: (c: string, v: Record<string, unknown>) => Promise<unknown>;
      getCommandsByCategory: (c: string) => Promise<unknown[]>;
      getAvailableCommands: () => Promise<unknown[]>;
      getCommandSuggestions: (q: string) => Promise<unknown[]>;
    };

    const mkPrompt = (id = 'p1') =>
      new Prompt(
        id,
        'Name',
        'Desc',
        'Hello {{x}}',
        'general',
        [],
        [],
        '1',
        new Date(),
        new Date(),
        true,
        { isTemplate: true },
        'public',
      );

    beforeEach(async () => {
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);
      await dataHandler(
        Buffer.from(
          JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n',
        ),
      );
      stdoutWriteSpy.mockClear();

      vi.spyOn(promptService, 'getPrompt').mockResolvedValue(mkPrompt());
      vi.spyOn(promptService, 'getLatestPrompts').mockResolvedValue([mkPrompt()]);
      vi.spyOn(promptService, 'getPromptsByCategory').mockResolvedValue([mkPrompt()]);
      vi.spyOn(promptService, 'searchPrompts').mockResolvedValue([mkPrompt()]);
      vi.spyOn(promptService, 'applyTemplate').mockResolvedValue('rendered');
      vi.spyOn(promptService, 'createPrompt').mockResolvedValue(mkPrompt('new'));
      vi.spyOn(promptService, 'updatePrompt').mockResolvedValue(mkPrompt('upd'));
      vi.spyOn(promptService, 'deletePrompt').mockResolvedValue(undefined);
      vi.spyOn(promptService, 'getPromptStats').mockResolvedValue({
        total: 1,
        templates: 1,
        regular: 0,
        tags: ['t'],
        categories: ['general'],
        byCategory: { general: 1 },
      });

      const slash = (mcpServer as unknown as { slashCommandsService: SlashCommandsServiceLike })
        .slashCommandsService;
      vi.spyOn(slash, 'executeCommand').mockResolvedValue({ ok: true });
      vi.spyOn(slash, 'getCommandsByCategory').mockResolvedValue([
        { command: '/a', description: 'd', category: 'c', promptId: 'p' },
      ]);
      vi.spyOn(slash, 'getAvailableCommands').mockResolvedValue([
        { command: '/b', description: 'd', category: 'c', promptId: 'p' },
      ]);
      vi.spyOn(slash, 'getCommandSuggestions').mockResolvedValue([
        { command: '/c', description: 'd', category: 'c', promptId: 'p' },
      ]);
    });

    const toolCases: { name: string; args: Record<string, unknown> }[] = [
      { name: 'get_prompt', args: { id: 'p1' } },
      { name: 'list_prompts', args: {} },
      { name: 'list_prompts', args: { category: 'general', limit: 3 } },
      { name: 'search_prompts', args: { query: 'hi' } },
      { name: 'apply_template', args: { promptId: 'p1', variables: { x: '1' } } },
      { name: 'create_prompt', args: { name: 'n', content: 'body' } },
      { name: 'update_prompt', args: { id: 'p1', name: 'x' } },
      { name: 'delete_prompt', args: { id: 'p1' } },
      { name: 'get_stats', args: {} },
      { name: 'slash_command', args: { command: '/review' } },
      { name: 'list_slash_commands', args: {} },
      { name: 'suggest_slash_commands', args: { query: 'rev' } },
    ];

    it.each(toolCases)('tools/call $name succeeds', async ({ name, args }) => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);
      const rpcId = Math.floor(Math.random() * 1e9);
      await dataHandler(
        Buffer.from(
          JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            method: 'tools/call',
            params: { name, arguments: args },
          }) + '\n',
        ),
      );
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0] as string);
      expect(response.error).toBeUndefined();
      expect(response.result?.content).toBeInstanceOf(Array);
    });

    it('tools/call search_prompts without query returns error payload', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);
      await dataHandler(
        Buffer.from(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 99,
            method: 'tools/call',
            params: { name: 'search_prompts', arguments: {} },
          }) + '\n',
        ),
      );
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0] as string);
      expect(response.error?.code).toBe(-32603);
      expect(String(response.error?.data)).toContain('Query');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // Initialize first
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(initRequest) + '\n'));
      stdoutWriteSpy.mockClear();
    });

    it('should handle invalid JSON', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      await dataHandler(Buffer.from('invalid json\n'));

      // Should handle gracefully without crashing
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON-RPC version', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const invalidRequest = {
        jsonrpc: '1.0',
        id: 1,
        method: 'test',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(invalidRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32600);
    });

    it('should handle unknown method', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const unknownMethodRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'unknown_method',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(unknownMethodRequest) + '\n'));

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const response = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe('Method not found');
    });

    it('should handle notifications without IDs', async () => {
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const notification = {
        jsonrpc: '2.0',
        method: 'test_notification',
        params: {},
      };
      await dataHandler(Buffer.from(JSON.stringify(notification) + '\n'));

      // Notifications don't get responses
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe('Connection Handling', () => {
    it('should handle stdout close gracefully', async () => {
      const closedSpy = vi.spyOn(process.stdout, 'closed', 'get').mockReturnValue(true);
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };

      await expect(
        dataHandler(Buffer.from(JSON.stringify(initRequest) + '\n')),
      ).resolves.not.toThrow();
      closedSpy.mockRestore();
    });

    it('should handle stdout destroyed state', async () => {
      const destroyedSpy = vi.spyOn(process.stdout, 'destroyed', 'get').mockReturnValue(true);
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };

      await expect(
        dataHandler(Buffer.from(JSON.stringify(initRequest) + '\n')),
      ).resolves.not.toThrow();
      destroyedSpy.mockRestore();
    });
  });

  describe('Message Buffering', () => {
    beforeEach(() => {
      vi.spyOn(process.stdout, 'closed', 'get').mockReturnValue(false);
      vi.spyOn(process.stdout, 'destroyed', 'get').mockReturnValue(false);
    });

    it('should handle incomplete JSON messages', async () => {
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      // Send incomplete message
      await dataHandler(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"initialize"'));

      // Should not process incomplete message
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      // Complete the message
      await dataHandler(Buffer.from(',"params":{}}\n'));

      // Now should process
      expect(stdoutWriteSpy).toHaveBeenCalled();
    });

    it('should handle multiple messages in one chunk', async () => {
      await mcpServer.start();
      const dataHandler = latestStdinDataHandler(stdinOnSpy);

      const msg1 = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });
      const msg2 = JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialized',
        params: {},
      });

      await dataHandler(Buffer.from(msg1 + '\n' + msg2 + '\n'));

      // Should process both messages
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1); // Only initialize gets a response
    });
  });
});
