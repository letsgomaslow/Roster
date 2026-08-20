import type { Express, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type GetSdkServer = () => McpServer;

/**
 * Stateless MCP Streamable HTTP (POST only) at `basePath`.
 * Each request creates a fresh transport + server instance — suitable for stateless hosting behind load balancers.
 */
export function registerStreamableMcpRoutes(
  app: Express,
  basePath: string,
  getServer: GetSdkServer,
): void {
  const postHandler = async (req: Request, res: Response) => {
    const server = getServer();
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
          id: null,
        });
      }
    }
  };

  app.post(basePath, postHandler);
  app.get(basePath, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed (use POST for stateless MCP)' },
      id: null,
    });
  });
  app.delete(basePath, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed' },
      id: null,
    });
  });
}
