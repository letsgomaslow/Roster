#!/usr/bin/env node

import fs from 'node:fs';
import https from 'node:https';

// AWS adapters are imported dynamically to avoid dependencies
import { PromptService } from './core/services/prompt.service';
import { McpServer } from './mcp/mcp-server';
import { MetricsCollector } from './monitoring/cloudwatch-metrics';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { URL } from 'url';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { PaymentService } from './core/services/payment.service';
import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import { convexAuthStorage, getCanonicalConvexOwnerId } from './lib/convex-auth-context.js';
import { getLegacyAdvancedRuntimeAccess } from './lib/legacy-advanced-access.js';
import { createPromptsSdkMcpServer } from './mcp/prompts-sdk-mcp-server.js';
import { registerStreamableMcpRoutes } from './mcp/register-streamable-mcp.js';
import { SlashCommandsService } from './core/services/slash-commands.service.js';
import { SubagentService } from './core/services/subagent.service.js';
import { MainAgentService } from './core/services/main-agent.service.js';
import { OrchestrateService } from './core/services/orchestrate.service.js';
import { ProjectScaffoldService } from './core/services/project-scaffold.service.js';
import { ReportGenerationService } from './core/services/report-generation.service.js';
import { createSubagentsRouter } from './http/routes/subagents.router.js';
import { createMainAgentsRouter } from './http/routes/main-agents.router.js';
import { createOrchestrateRouter } from './http/routes/orchestrate.router.js';

// Create a logger that outputs to stderr for MCP mode compatibility
// In MCP stdio mode, disable logging to avoid interfering with JSON-RPC protocol
const logger =
  process.env.MODE === 'mcp'
    ? { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } // No-op logger for MCP
    : pino(
        {
          level: process.env.LOG_LEVEL || 'info',
        },
        process.stderr,
      ); // Normal logger for other modes

// In MCP mode, silence all console output to prevent interference with JSON-RPC protocol
if (process.env.MODE === 'mcp') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Initialize DynamoDB client for user data
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Middleware to extract user context from Authorization header
async function extractUserContext(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, you'd validate the JWT token here
      // For now, we'll assume the token contains user info or extract from Cognito

      // Extract user info from request (this would be done by API Gateway Cognito authorizer)
      const userId = req.headers['x-user-id'] as string;
      const userEmail = req.headers['x-user-email'] as string;

      if (userId) {
        // Get user subscription info from DynamoDB
        const userResult = await dynamoClient.send(
          new GetItemCommand({
            TableName: process.env.USERS_TABLE!,
            Key: { user_id: { S: userId } },
          }),
        );

        if (userResult.Item) {
          (req as any).userContext = {
            userId,
            email: userEmail,
            subscriptionTier: userResult.Item.subscription_tier?.S || 'free',
          };
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error extracting user context:', error);
    next();
  }
}

// Rate limiting middleware (will be defined after services are initialized)
function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Implementation will be added after promptService is initialized
  next();
}

async function startServer() {
  try {
    // Accept frontend-style publishable key var for local/dev parity.
    const clerkPublishableKey =
      process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (clerkPublishableKey && !process.env.CLERK_PUBLISHABLE_KEY) {
      process.env.CLERK_PUBLISHABLE_KEY = clerkPublishableKey;
    }

    const mode = process.env.MODE || 'mcp';
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    const storageType = process.env.STORAGE_TYPE || 'memory';

    // Initialize adapters based on storage type
    let promptRepository: any;
    let catalogRepository: any;
    let eventBus: any;

    if (storageType === 'file') {
      const { FilePromptRepository } = await import('./adapters/file/file-prompt-repository.js');
      const { FileCatalogRepository } = await import('./adapters/file/file-catalog-repository.js');
      const { MemoryEventBus } = await import('./adapters/memory/memory-event-bus.js');

      const promptsDir = process.env.PROMPTS_DIR || './data/prompts';
      promptRepository = new FilePromptRepository(promptsDir);
      catalogRepository = new FileCatalogRepository(promptsDir);
      eventBus = new MemoryEventBus();
    } else if (storageType === 'postgres') {
      // PostgreSQL support temporarily disabled - needs pg module installation
      throw new Error(
        'PostgreSQL storage is not yet implemented. Use file or memory storage instead.',
      );
    } else if (storageType === 'memory') {
      const { MemoryPromptRepository } =
        await import('./adapters/memory/memory-prompt-repository.js');
      const { FileCatalogRepository } = await import('./adapters/file/file-catalog-repository.js');
      const { MemoryEventBus } = await import('./adapters/memory/memory-event-bus.js');

      promptRepository = new MemoryPromptRepository();
      catalogRepository = new FileCatalogRepository(process.env.PROMPTS_DIR || './data/prompts');
      eventBus = new MemoryEventBus();
    } else if (storageType === 'convex') {
      if (!process.env.CONVEX_URL) {
        throw new Error('STORAGE_TYPE=convex requires CONVEX_URL');
      }
      const hasClerk = !!clerkPublishableKey && !!process.env.CLERK_SECRET_KEY;
      const hasDevOwner = !!process.env.CONVEX_DEV_OWNER_USER_ID;
      if (!hasClerk && !hasDevOwner) {
        throw new Error(
          'STORAGE_TYPE=convex requires CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY, or CONVEX_DEV_OWNER_USER_ID (dev only)',
        );
      }
      const { ConvexPromptRepository } =
        await import('./adapters/convex/convex-prompt-repository.js');
      const { MemoryCatalogRepository } = await import('./adapters/memory-adapter.js');
      const { MemoryEventBus } = await import('./adapters/memory/memory-event-bus.js');
      promptRepository = new ConvexPromptRepository(process.env.CONVEX_URL);
      catalogRepository = new MemoryCatalogRepository();
      eventBus = new MemoryEventBus();
    } else {
      // AWS-based storage (legacy default)
      const { DynamoDBAdapter } = await import('./adapters/aws/dynamodb-adapter.js');
      const { S3CatalogAdapter } = await import('./adapters/aws/s3-adapter.js');
      const { SQSAdapter } = await import('./adapters/aws/sqs-adapter.js');

      promptRepository = new DynamoDBAdapter(process.env.PROMPTS_TABLE || 'mcp-prompts');
      catalogRepository = new S3CatalogAdapter(process.env.PROMPTS_BUCKET || 'mcp-prompts-catalog');
      eventBus = new SQSAdapter(process.env.PROCESSING_QUEUE || 'mcp-prompts-processing');
    }

    const metricsCollector = new MetricsCollector();

    // Initialize services
    const promptService = new PromptService(promptRepository, catalogRepository, eventBus);
    const paymentService = new PaymentService();
    const mcpServer = new McpServer(promptService, promptRepository);
    const subagentService = new SubagentService(promptRepository, eventBus);
    const mainAgentService = new MainAgentService(promptRepository, subagentService, eventBus);
    const orchestrateService = new OrchestrateService(
      promptRepository,
      subagentService,
      mainAgentService,
      eventBus,
    );
    const projectScaffoldService = new ProjectScaffoldService(promptRepository, eventBus);
    const reportGenerationService = new ReportGenerationService(eventBus);

    // Update rate limiting function with service reference
    const actualRateLimit = function (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) {
      const userContext = (req as any).userContext;
      const clientId = userContext?.userId || req.ip || 'anonymous';

      const limits = promptService.getRateLimit(userContext);
      const now = Date.now();
      const windowStart = Math.floor(now / limits.windowMs) * limits.windowMs;

      const key = `${clientId}:${windowStart}`;
      const current = rateLimitStore.get(key) || {
        count: 0,
        resetTime: windowStart + limits.windowMs,
      };

      if (now > current.resetTime) {
        current.count = 0;
        current.resetTime = windowStart + limits.windowMs;
      }

      current.count++;
      rateLimitStore.set(key, current);

      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        // 1% chance to clean up
        for (const [k, v] of rateLimitStore.entries()) {
          if (now > v.resetTime) {
            rateLimitStore.delete(k);
          }
        }
      }

      res.set({
        'X-RateLimit-Limit': limits.requests.toString(),
        'X-RateLimit-Remaining': Math.max(0, limits.requests - current.count).toString(),
        'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
      });

      if (current.count > limits.requests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime - now) / 1000),
        });
      }

      next();
    };

    if (mode === 'mcp') {
      // Start MCP server
      await mcpServer.start();
      // Don't log in MCP mode to avoid interfering with stdio protocol
    } else if (mode === 'http') {
      // Start HTTP server
      const app = express();
      const hasClerkKeys = !!clerkPublishableKey && !!process.env.CLERK_SECRET_KEY;
      const slashCommandsService = new SlashCommandsService(promptRepository);

      app.use(helmet());
      app.use(cors());
      app.use(express.json());

      // Serve static files
      app.use(express.static('public'));

      // Health check endpoint (no auth)
      app.get('/health', async (req, res) => {
        try {
          const health = await Promise.all([
            promptRepository.healthCheck(),
            catalogRepository.healthCheck(),
            eventBus.healthCheck(),
          ]);

          const allHealthy = health.every((h) => h.status === 'healthy');

          res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'healthy' : 'unhealthy',
            services: {
              prompts: health[0],
              catalog: health[1],
              events: health[2],
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Health check failed:', error);
          res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      if (hasClerkKeys) {
        app.use(clerkMiddleware());
      }

      app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const publicPaths = new Set(['/health', '/v1/webhook/stripe']);
        if (publicPaths.has(req.path)) {
          return next();
        }
        if (hasClerkKeys) {
          return requireAuth()(req, res, async () => {
            try {
              const auth = getAuth(req);
              const template = process.env.CLERK_CONVEX_JWT_TEMPLATE ?? 'convex';
              let token: string | undefined;
              if (storageType === 'convex') {
                token = (await auth.getToken({ template })) ?? undefined;
              }
              const ownerId = storageType === 'convex' ? getCanonicalConvexOwnerId(token) : undefined;
              (req as any).userContext = {
                userId: auth.userId ?? undefined,
                email: (auth.sessionClaims as Record<string, unknown>)?.email as string | undefined,
                subscriptionTier: 'premium' as const,
              };
              convexAuthStorage.run(
                {
                  token,
                  userId: auth.userId ?? undefined,
                  ownerId: ownerId ?? auth.userId ?? undefined,
                },
                () => next(),
              );
            } catch (e) {
              next(e);
            }
          });
        }
        extractUserContext(req, res, () => {
          if (storageType === 'convex' && process.env.CONVEX_DEV_OWNER_USER_ID) {
            const devId = process.env.CONVEX_DEV_OWNER_USER_ID;
            (req as any).userContext = {
              userId: devId,
              subscriptionTier: 'premium' as const,
            };
            return convexAuthStorage.run(
              { token: undefined, userId: devId, ownerId: devId },
              () => next(),
            );
          }
          return convexAuthStorage.run(
            { token: undefined, userId: undefined, ownerId: undefined },
            () => next(),
          );
        });
      });

      app.use(actualRateLimit);

      const requireLegacyAdvancedRuntime = (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        const runtimeAuth = hasClerkKeys ? getAuth(req) : null;
        const access = getLegacyAdvancedRuntimeAccess({
          enabledValue: process.env.ROSTER_LEGACY_ADVANCED_ENABLED,
          environment: process.env.NODE_ENV,
          hasClerkKeys,
          insecureLocalValue: process.env.ROSTER_LEGACY_ADVANCED_ALLOW_INSECURE_LOCAL,
          userId: runtimeAuth?.userId ?? undefined,
          orgId: runtimeAuth?.orgId ?? undefined,
          orgRole: runtimeAuth?.orgRole ?? undefined,
        });
        if (!access.allowed) {
          res.status(access.status).json({ error: access.error });
          return;
        }
        next();
      };

      // The legacy MCP/control-plane runtime is a single default-off boundary.
      // Keep the signed Stripe webhook outside it; every other legacy route is gated here.
      app.use('/mcp', requireLegacyAdvancedRuntime);
      app.use('/v1', (req, res, next) => {
        if (req.path === '/webhook/stripe') {
          next();
          return;
        }
        requireLegacyAdvancedRuntime(req, res, next);
      });

      // MCP capabilities endpoint
      app.get('/mcp', (req, res) => {
        res.json(mcpServer.getCapabilities());
      });

      // MCP tools endpoint
      app.get('/mcp/tools', (req, res) => {
        res.json(mcpServer.getTools());
      });

      // Execute MCP tool
      app.post('/mcp/tools', async (req, res) => {
        try {
          const { tool, arguments: args } = req.body;
          const result = await mcpServer.executeTool(tool, args);
          res.json({ result });
        } catch (error) {
          logger.error('Tool execution failed:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      registerStreamableMcpRoutes(app, '/mcp/streamable', () =>
        createPromptsSdkMcpServer(promptService, slashCommandsService),
      );

      // Prompts API endpoints
      app.get('/v1/prompts', async (req, res) => {
        try {
          const { category, limit = '50' } = req.query;
          const userContext = (req as any).userContext;

          const prompts = category
            ? await promptService.getPromptsByCategory(
                category as string,
                parseInt(limit as string),
              )
            : await promptService.getLatestPrompts(parseInt(limit as string), userContext);

          // Filter prompts based on access control
          const accessiblePrompts = prompts.filter((p) =>
            promptService.hasAccessToPrompt(p, userContext),
          );

          res.json({
            prompts: accessiblePrompts.map((p) => p.toJSON()),
            total: accessiblePrompts.length,
            userTier: userContext?.subscriptionTier || 'anonymous',
          });
        } catch (error) {
          logger.error('Failed to list prompts:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.get('/v1/prompts/:id', async (req, res) => {
        try {
          const prompt = await promptService.getPrompt(req.params.id);
          const userContext = (req as any).userContext;

          if (!prompt) {
            return res.status(404).json({ error: 'Prompt not found' });
          }

          // Check access control
          if (!promptService.hasAccessToPrompt(prompt, userContext)) {
            return res.status(403).json({ error: 'Access denied to this prompt' });
          }

          res.json({ prompt: prompt.toJSON() });
        } catch (error) {
          logger.error('Failed to get prompt:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/prompts', async (req, res) => {
        try {
          const userContext = (req as any).userContext;

          if (!userContext?.userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          const allowCreate =
            storageType === 'convex' || promptService.canCreatePrompt(userContext);
          if (!allowCreate) {
            return res.status(403).json({
              error: 'Prompt creation requires a premium subscription',
            });
          }

          const template = req.body.template ?? req.body.content;
          const promptData = {
            ...req.body,
            template,
            author_id: userContext.userId,
            access_level:
              req.body.access_level ||
              (userContext.subscriptionTier === 'premium' ? 'premium' : 'private'),
          };

          const prompt = await promptService.createPrompt(promptData);
          res.status(201).json({
            prompt: prompt.toJSON(),
            message: 'Prompt created successfully',
          });
        } catch (error) {
          logger.error('Failed to create prompt:', error);
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.put('/v1/prompts/:id', async (req, res) => {
        try {
          const prompt = await promptService.updatePrompt(req.params.id, req.body);
          res.json({
            prompt: prompt.toJSON(),
            message: 'Prompt updated successfully',
          });
        } catch (error) {
          logger.error('Failed to update prompt:', error);
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.delete('/v1/prompts/:id', async (req, res) => {
        try {
          await promptService.deletePrompt(req.params.id);
          res.json({ message: 'Prompt deleted successfully' });
        } catch (error) {
          logger.error('Failed to delete prompt:', error);
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/prompts/:id/apply', async (req, res) => {
        try {
          const result = await promptService.applyTemplate(req.params.id, req.body.variables || {});
          res.json({
            result,
            appliedVariables: req.body.variables || {},
          });
        } catch (error) {
          logger.error('Failed to apply template:', error);
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.use('/v1/subagents', createSubagentsRouter(subagentService));
      app.use('/v1/main-agents', createMainAgentsRouter(mainAgentService));
      app.use(
        '/v1/orchestrate',
        createOrchestrateRouter(
          orchestrateService,
          projectScaffoldService,
          reportGenerationService,
        ),
      );

      app.get('/v1/stats', async (req, res) => {
        try {
          const allPrompts = await promptRepository.findLatestVersions(10000);

          res.json({
            total: allPrompts.length,
            byType: {
              standard: allPrompts.filter((p: any) => p.promptType === 'standard').length,
              subagent: allPrompts.filter((p: any) => p.promptType === 'subagent_registry').length,
              mainAgent: allPrompts.filter((p: any) => p.promptType === 'main_agent_template').length,
              projectTemplate: allPrompts.filter(
                (p: any) => p.promptType === 'project_orchestration_template',
              ).length,
            },
            subagents: {
              total: allPrompts.filter((p: any) => p.isSubagent()).length,
              categories: await promptRepository.getSubagentCategories(),
              models: await promptRepository.getAgentModels(),
            },
            generatedAt: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Failed to get stats:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Slash commands endpoints
      app.get('/v1/slash-commands', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { category, limit = '20' } = req.query;

          const slashCommandsService = new (
            await import('./core/services/slash-commands.service')
          ).SlashCommandsService(promptRepository);
          const commands = category
            ? await slashCommandsService.getCommandsByCategory(category as string, userContext)
            : await slashCommandsService.getAvailableCommands(userContext);

          res.json({
            commands: commands.slice(0, parseInt(limit as string)),
            total: commands.length,
          });
        } catch (error) {
          logger.error('Failed to list slash commands:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.get('/v1/slash-commands/suggest', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { q: query, limit = '10' } = req.query;

          if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter is required' });
          }

          const slashCommandsService = new (
            await import('./core/services/slash-commands.service')
          ).SlashCommandsService(promptRepository);
          const suggestions = await slashCommandsService.getCommandSuggestions(query, userContext);

          res.json({
            suggestions: suggestions.slice(0, parseInt(limit as string)),
            total: suggestions.length,
          });
        } catch (error) {
          logger.error('Failed to get slash command suggestions:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/slash-commands/execute', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { command, variables = {} } = req.body;

          if (!command || typeof command !== 'string') {
            return res.status(400).json({ error: 'Command is required' });
          }

          const slashCommandsService = new (
            await import('./core/services/slash-commands.service')
          ).SlashCommandsService(promptRepository);
          const result = await slashCommandsService.executeCommand(command, variables, userContext);

          res.json(result);
        } catch (error) {
          logger.error('Failed to execute slash command:', error);
          res.status(400).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Payment endpoints
      app.get('/v1/subscription/plans', async (req, res) => {
        try {
          const plans = paymentService.getPlans();
          res.json({ plans });
        } catch (error) {
          logger.error('Failed to get subscription plans:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.get('/v1/subscription/status', async (req, res) => {
        try {
          const userContext = (req as any).userContext;

          if (!userContext) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!process.env.USERS_TABLE || storageType === 'convex') {
            return res.json({
              userId: userContext.userId,
              email: userContext.email,
              subscriptionTier: userContext.subscriptionTier || 'premium',
              rateLimit: promptService.getRateLimit(userContext),
            });
          }

          // Get user subscription info from DynamoDB
          const userResult = await dynamoClient.send(
            new GetItemCommand({
              TableName: process.env.USERS_TABLE!,
              Key: { user_id: { S: userContext.userId } },
            }),
          );

          if (!userResult.Item) {
            return res.status(404).json({ error: 'User not found' });
          }

          const subscriptionStatus = {
            userId: userContext.userId,
            email: userContext.email,
            subscriptionTier: userResult.Item.subscription_tier?.S || 'free',
            subscriptionId: userResult.Item.subscription_id?.S,
            subscriptionExpiresAt: userResult.Item.subscription_expires_at?.S,
            rateLimit: promptService.getRateLimit(userContext),
          };

          res.json(subscriptionStatus);
        } catch (error) {
          logger.error('Failed to get subscription status:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/payment/create-intent', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { amount, currency = 'usd', planId } = req.body;

          if (!userContext) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
          }

          const paymentIntent = await paymentService.createPaymentIntent(amount, currency);

          res.json(paymentIntent);
        } catch (error) {
          logger.error('Failed to create payment intent:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/subscription/create', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { planId, paymentMethodId } = req.body;

          if (!userContext) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!process.env.USERS_TABLE || storageType === 'convex') {
            return res.status(501).json({
              error:
                'Subscription provisioning requires USERS_TABLE (DynamoDB) and non-convex storage mode',
            });
          }

          if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
          }

          const subscription = await paymentService.createSubscription(
            userContext.userId,
            userContext.email,
            planId,
            paymentMethodId,
          );

          // Update user subscription in database
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: process.env.USERS_TABLE!,
              Key: { user_id: { S: userContext.userId } },
              UpdateExpression:
                'SET subscription_tier = :tier, subscription_id = :subId, subscription_expires_at = :expires, updated_at = :updated',
              ExpressionAttributeValues: {
                ':tier': { S: planId.startsWith('premium') ? 'premium' : 'free' },
                ':subId': { S: subscription.subscriptionId },
                ':expires': { S: subscription.currentPeriodEnd.toISOString() },
                ':updated': { S: new Date().toISOString() },
              },
            }),
          );

          res.json(subscription);
        } catch (error) {
          logger.error('Failed to create subscription:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post('/v1/subscription/cancel', async (req, res) => {
        try {
          const userContext = (req as any).userContext;
          const { subscriptionId, cancelAtPeriodEnd = true } = req.body;

          if (!userContext) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!process.env.USERS_TABLE || storageType === 'convex') {
            return res.status(501).json({
              error:
                'Subscription cancel requires USERS_TABLE (DynamoDB) and non-convex storage mode',
            });
          }

          await paymentService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);

          // Update user subscription in database
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: process.env.USERS_TABLE!,
              Key: { user_id: { S: userContext.userId } },
              UpdateExpression: 'SET subscription_tier = :tier, updated_at = :updated',
              ExpressionAttributeValues: {
                ':tier': { S: 'free' },
                ':updated': { S: new Date().toISOString() },
              },
            }),
          );

          res.json({ message: 'Subscription cancelled successfully' });
        } catch (error) {
          logger.error('Failed to cancel subscription:', error);
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      app.post(
        '/v1/webhook/stripe',
        express.raw({ type: 'application/json' }),
        async (req, res) => {
          try {
            const signature = req.headers['stripe-signature'] as string;
            await paymentService.handleWebhook(req.body, signature);
            res.json({ received: true });
          } catch (error) {
            logger.error('Webhook processing failed:', error);
            res.status(400).json({
              error: error instanceof Error ? error.message : 'Webhook processing failed',
            });
          }
        },
      );

      const logEndpoints = (scheme: 'http' | 'https') => {
        const displayHost = host === '0.0.0.0' ? 'localhost' : host;
        logger.info(
          `MCP Prompts ${scheme.toUpperCase()} server started on ${scheme}://${displayHost}:${port}`,
        );
        logger.info('Available endpoints:');
        logger.info('  GET  /health - Health check');
        logger.info('  GET  /mcp - MCP capabilities');
        logger.info('  GET  /mcp/tools - List MCP tools');
        logger.info('  POST /mcp/tools - Execute MCP tool');
        logger.info('  POST /mcp/streamable - MCP Streamable HTTP (spec-native, stateless)');
        logger.info('  GET  /v1/prompts - List prompts');
        logger.info('  GET  /v1/prompts/:id - Get prompt');
        logger.info('  POST /v1/prompts - Create prompt');
        logger.info('  PUT  /v1/prompts/:id - Update prompt');
        logger.info('  DELETE /v1/prompts/:id - Delete prompt');
        logger.info('  POST /v1/prompts/:id/apply - Apply template variables');
        logger.info('  GET  /v1/slash-commands - List slash commands');
        logger.info('  GET  /v1/slash-commands/suggest - Get command suggestions');
        logger.info('  POST /v1/slash-commands/execute - Execute slash command');
        logger.info('  GET  /v1/subscription/plans - Get subscription plans');
        logger.info('  GET  /v1/subscription/status - Get subscription status');
        logger.info('  POST /v1/payment/create-intent - Create payment intent');
        logger.info('  POST /v1/subscription/create - Create subscription');
        logger.info('  POST /v1/subscription/cancel - Cancel subscription');
        logger.info('  POST /v1/webhook/stripe - Stripe webhooks');
      };

      const keyPath = process.env.HTTPS_KEY_PATH;
      const certPath = process.env.HTTPS_CERT_PATH;
      const devLocalHttpsFlag = String(process.env.DEV_LOCAL_HTTPS || '').toLowerCase();
      const devLocalHttps =
        devLocalHttpsFlag === '1' || devLocalHttpsFlag === 'true' || devLocalHttpsFlag === 'yes';
      const hasAnyCertPath = Boolean(keyPath || certPath);
      const isProd = process.env.NODE_ENV === 'production';

      if ((keyPath && !certPath) || (!keyPath && certPath)) {
        throw new Error(
          'HTTPS_KEY_PATH and HTTPS_CERT_PATH must both be set to enable TLS (or omit both for HTTP)',
        );
      }

      if (isProd) {
        if (hasAnyCertPath || devLocalHttps) {
          logger.warn(
            'In-process TLS env vars (HTTPS_KEY_PATH, HTTPS_CERT_PATH, DEV_LOCAL_HTTPS) are ignored when NODE_ENV=production; listen on HTTP and terminate TLS at your load balancer or reverse proxy.',
          );
        }
        app.listen(port, host, () => logEndpoints('http'));
      } else if (devLocalHttps && (!keyPath || !certPath)) {
        throw new Error(
          'DEV_LOCAL_HTTPS is set but both HTTPS_KEY_PATH and HTTPS_CERT_PATH are required for local TLS (or unset DEV_LOCAL_HTTPS).',
        );
      } else if (hasAnyCertPath && !devLocalHttps) {
        throw new Error(
          'HTTPS_KEY_PATH and HTTPS_CERT_PATH are set; add DEV_LOCAL_HTTPS=1 for local development TLS only, or unset HTTPS_* variables.',
        );
      } else if (keyPath && certPath && devLocalHttps) {
        const tlsOpts: https.ServerOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        const caPath = process.env.HTTPS_CA_PATH;
        if (caPath) {
          tlsOpts.ca = fs.readFileSync(caPath);
        }
        const pass = process.env.HTTPS_KEY_PASSPHRASE;
        if (pass) {
          tlsOpts.passphrase = pass;
        }
        https.createServer(tlsOpts, app).listen(port, host, () => logEndpoints('https'));
      } else {
        app.listen(port, host, () => logEndpoints('http'));
      }
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error:', error);
  if (error instanceof Error) {
    logger.error('Fatal error details:', error.message);
    logger.error('Fatal error stack:', error.stack);
  }
  process.exit(1);
});
