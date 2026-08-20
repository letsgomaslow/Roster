import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  buildHeaders: vi.fn(),
  forwardRequest: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/roster-bff-headers', () => ({ buildRosterBffHeaders: mocks.buildHeaders }));
vi.mock('@/lib/roster-forward', () => ({
  forwardRosterRequest: mocks.forwardRequest,
  getRosterBaseUrl: () => 'http://roster.test',
}));

import { GET } from './route';

const request = new Request('http://app.test/api/roster/prompts?limit=20');

describe('legacy prompts route access', () => {
  beforeEach(() => {
    process.env.ROSTER_LEGACY_ADVANCED_ENABLED = 'true';
    mocks.auth.mockReset();
    mocks.buildHeaders.mockReset();
    mocks.forwardRequest.mockReset();
    mocks.auth.mockResolvedValue({ userId: 'admin_1', orgId: 'org_1', orgRole: 'org:admin' });
    mocks.buildHeaders.mockResolvedValue({ Accept: 'application/json' });
    mocks.forwardRequest.mockResolvedValue({ body: [], contentType: 'application/json', status: 200 });
  });

  it('is unavailable by default without forwarding prompt data', async () => {
    delete process.env.ROSTER_LEGACY_ADVANCED_ENABLED;

    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it('rejects anonymous prompt access before forwarding', async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it.each(['org:curator', 'org:contributor', 'org:viewer'])(
    'rejects the verified %s role before forwarding prompts',
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ userId: 'member_1', orgId: 'org_1', orgRole });

      const response = await GET(request);

      expect(response.status).toBe(403);
      expect(mocks.forwardRequest).not.toHaveBeenCalled();
    },
  );

  it.each(['org:admin', 'org:owner'])('allows the verified %s role', async (orgRole) => {
    mocks.auth.mockResolvedValue({ userId: 'manager_1', orgId: 'org_1', orgRole });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.forwardRequest).toHaveBeenCalledOnce();
  });
});
