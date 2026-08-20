import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  buildHeaders: vi.fn(),
  forwardRequest: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));

vi.mock('@/lib/roster-bff-headers', () => ({
  buildRosterBffHeaders: mocks.buildHeaders,
}));

vi.mock('@/lib/roster-forward', () => ({
  forwardRosterRequest: mocks.forwardRequest,
  getRosterBaseUrl: () => 'http://roster.test',
}));

import { DELETE, GET, POST, PUT } from './route';

type RouteHandler = typeof POST;

const context = {
  params: Promise.resolve({ path: ['orchestrate'] }),
};

function request(method: string): Request {
  return new Request('http://app.test/api/roster/orchestrate', {
    body: method === 'GET' ? undefined : JSON.stringify({ projectPath: '/tmp/project' }),
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    method,
  });
}

describe('Roster BFF technical-write authorization', () => {
  beforeEach(() => {
    process.env.ROSTER_LEGACY_ADVANCED_ENABLED = 'true';
    mocks.auth.mockReset();
    mocks.buildHeaders.mockReset();
    mocks.forwardRequest.mockReset();
    mocks.auth.mockResolvedValue({
      orgId: 'org_alpha',
      orgRole: 'org:admin',
      userId: 'user_admin',
    });
    mocks.buildHeaders.mockResolvedValue({ Accept: 'application/json' });
    mocks.forwardRequest.mockResolvedValue({
      body: { executionId: 'run-1' },
      contentType: 'application/json',
      status: 200,
    });
  });

  it.each(['org:curator', 'org:contributor', 'org:viewer'])(
    'rejects a POST from the verified %s role before forwarding',
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ orgId: 'org_alpha', orgRole, userId: 'user_member' });

      const response = await POST(request('POST'), context);
      const payload = (await response.json()) as { error?: string };

      expect(response.status).toBe(403);
      expect(payload.error).toBe('Advanced access requires a workspace owner or admin');
      expect(mocks.forwardRequest).not.toHaveBeenCalled();
    },
  );

  it.each<{ handler: RouteHandler; method: 'POST' | 'PUT' | 'DELETE' }>([
    { handler: POST, method: 'POST' },
    { handler: PUT, method: 'PUT' },
    { handler: DELETE, method: 'DELETE' },
  ])('enforces the verified role for $method requests', async ({ handler, method }) => {
    mocks.auth.mockResolvedValue({
      orgId: 'org_alpha',
      orgRole: 'org:contributor',
      userId: 'user_member',
    });

    const response = await handler(request(method), context);

    expect(response.status).toBe(403);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it.each(['org:admin', 'org:owner'])(
    'allows a technical write for the verified %s role',
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ orgId: 'org_alpha', orgRole, userId: 'user_admin' });

      const response = await POST(request('POST'), context);

      expect(response.status).toBe(200);
      expect(mocks.forwardRequest).toHaveBeenCalledOnce();
    },
  );

  it('fails closed when an authenticated write has no organization role claim', async () => {
    mocks.auth.mockResolvedValue({ orgId: 'org_alpha', orgRole: undefined, userId: 'user_member' });

    const response = await POST(request('POST'), context);

    expect(response.status).toBe(403);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it('allows a signed-in personal workspace owner to use Advanced writes', async () => {
    mocks.auth.mockResolvedValue({ orgId: null, orgRole: null, userId: 'personal_owner' });

    const response = await POST(request('POST'), context);

    expect(response.status).toBe(200);
    expect(mocks.forwardRequest).toHaveBeenCalledOnce();
  });

  it('rejects a contributor GET for Advanced-only data before forwarding', async () => {
    mocks.auth.mockResolvedValue({
      orgId: 'org_alpha',
      orgRole: 'org:contributor',
      userId: 'user_member',
    });

    const response = await GET(request('GET'), context);

    expect(response.status).toBe(403);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it('keeps a signed-in member health check read-only and forwardable', async () => {
    mocks.auth.mockResolvedValue({
      orgId: 'org_alpha',
      orgRole: 'org:contributor',
      userId: 'user_member',
    });

    const response = await GET(request('GET'), {
      params: Promise.resolve({ path: ['health'] }),
    });

    expect(response.status).toBe(200);
    expect(mocks.forwardRequest).toHaveBeenCalledOnce();
  });

  it('keeps the legacy runtime unavailable until explicitly enabled', async () => {
    delete process.env.ROSTER_LEGACY_ADVANCED_ENABLED;

    const response = await GET(request('GET'), context);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Legacy Advanced tools are not enabled');
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it('treats MCP diagnostics as Advanced-only data', async () => {
    mocks.auth.mockResolvedValue({
      orgId: 'org_alpha',
      orgRole: 'org:contributor',
      userId: 'user_member',
    });

    const response = await GET(request('GET'), {
      params: Promise.resolve({ path: ['mcp', 'tools'] }),
    });

    expect(response.status).toBe(403);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });
});
