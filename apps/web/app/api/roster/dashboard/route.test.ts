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

describe('legacy dashboard route access', () => {
  beforeEach(() => {
    process.env.ROSTER_LEGACY_ADVANCED_ENABLED = 'true';
    mocks.auth.mockReset();
    mocks.buildHeaders.mockReset();
    mocks.forwardRequest.mockReset();
    mocks.auth.mockResolvedValue({ userId: 'admin_1', orgId: 'org_1', orgRole: 'org:admin' });
    mocks.buildHeaders.mockResolvedValue({ Accept: 'application/json' });
    mocks.forwardRequest.mockResolvedValue({ body: {}, contentType: 'application/json', status: 200 });
  });

  it('is unavailable by default without forwarding legacy dashboard data', async () => {
    delete process.env.ROSTER_LEGACY_ADVANCED_ENABLED;

    const response = await GET();

    expect(response.status).toBe(404);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it('rejects anonymous dashboard access before forwarding', async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.forwardRequest).not.toHaveBeenCalled();
  });

  it.each(['org:curator', 'org:contributor', 'org:viewer'])(
    'rejects the verified %s role before forwarding dashboard data',
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ userId: 'member_1', orgId: 'org_1', orgRole });

      const response = await GET();

      expect(response.status).toBe(403);
      expect(mocks.forwardRequest).not.toHaveBeenCalled();
    },
  );

  it('allows an authenticated personal workspace owner', async () => {
    mocks.auth.mockResolvedValue({ userId: 'personal_1', orgId: null, orgRole: null });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.forwardRequest).toHaveBeenCalledTimes(5);
  });
});
