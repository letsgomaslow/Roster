import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  convexAuthStorage,
  getCanonicalConvexOwnerId,
  runWithConvexAuth,
} from './convex-auth-context.js';

describe('convex-auth-context', () => {
  const origStorage = process.env.STORAGE_TYPE;
  const origDev = process.env.CONVEX_DEV_OWNER_USER_ID;

  afterEach(() => {
    if (origStorage === undefined) delete process.env.STORAGE_TYPE;
    else process.env.STORAGE_TYPE = origStorage;
    if (origDev === undefined) delete process.env.CONVEX_DEV_OWNER_USER_ID;
    else process.env.CONVEX_DEV_OWNER_USER_ID = origDev;
    vi.unstubAllEnvs();
  });

  it('runs fn directly when STORAGE_TYPE is not convex', async () => {
    vi.stubEnv('STORAGE_TYPE', 'memory');
    vi.stubEnv('CONVEX_DEV_OWNER_USER_ID', 'dev_x');
    const out = await runWithConvexAuth(async () => 'ok');
    expect(out).toBe('ok');
  });

  it('runs fn directly when convex but no CONVEX_DEV_OWNER_USER_ID', async () => {
    vi.stubEnv('STORAGE_TYPE', 'convex');
    delete process.env.CONVEX_DEV_OWNER_USER_ID;
    const out = await runWithConvexAuth(async () => 'bare');
    expect(out).toBe('bare');
  });

  it('injects dev userId when convex, dev set, and ALS empty', async () => {
    vi.stubEnv('STORAGE_TYPE', 'convex');
    vi.stubEnv('CONVEX_DEV_OWNER_USER_ID', 'owner_dev');
    await runWithConvexAuth(async () => {
      expect(convexAuthStorage.getStore()?.userId).toBe('owner_dev');
      expect(convexAuthStorage.getStore()?.ownerId).toBe('owner_dev');
    });
  });

  it('does not override existing userId in ALS', async () => {
    vi.stubEnv('STORAGE_TYPE', 'convex');
    vi.stubEnv('CONVEX_DEV_OWNER_USER_ID', 'owner_dev');
    await convexAuthStorage.run(
      { token: 't', userId: 'clerk_user', ownerId: 'issuer|clerk_user' },
      async () => {
        await runWithConvexAuth(async () => {
          expect(convexAuthStorage.getStore()?.userId).toBe('clerk_user');
          expect(convexAuthStorage.getStore()?.ownerId).toBe('issuer|clerk_user');
        });
      },
    );
  });

  it('derives canonical owner id from token claims', () => {
    const payload = Buffer.from(
      JSON.stringify({ iss: 'https://clerk.example.com', sub: 'user_123' }),
      'utf8',
    ).toString('base64url');
    const token = `header.${payload}.signature`;
    expect(getCanonicalConvexOwnerId(token)).toBe('https://clerk.example.com|user_123');
  });

  it('returns undefined for invalid tokens', () => {
    expect(getCanonicalConvexOwnerId('bad-token')).toBeUndefined();
  });
});
