import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createServerWithAgents } from './server-with-agents';

let server: Server | undefined;

afterEach(async () => {
  delete process.env.ROSTER_LEGACY_ADVANCED_ENABLED;
  delete process.env.ROSTER_LEGACY_ADVANCED_ALLOW_INSECURE_LOCAL;
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

describe('legacy server with agents', () => {
  it('keeps every non-health route unavailable by default', async () => {
    const app = await createServerWithAgents();
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server?.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    const legacy = await fetch(`http://127.0.0.1:${port}/v1/prompts`);

    expect(health.status).toBe(200);
    expect(legacy.status).toBe(404);
  });
});
