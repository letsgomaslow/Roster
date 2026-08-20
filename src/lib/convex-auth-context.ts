import { AsyncLocalStorage } from 'async_hooks';

export type ConvexAuthStore = {
  token: string | undefined;
  /** Clerk user id (`sub`) or CONVEX_DEV_OWNER_USER_ID for app-level ownership checks. */
  userId: string | undefined;
  /** Canonical Convex owner identifier (`iss|sub`) when a JWT is available. */
  ownerId?: string | undefined;
};

export const convexAuthStorage = new AsyncLocalStorage<ConvexAuthStore>();

export function getCanonicalConvexOwnerId(token: string | undefined): string | undefined {
  if (!token) return undefined;

  const [, payload] = token.split('.');
  if (!payload) return undefined;

  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      iss?: unknown;
      sub?: unknown;
    };
    return typeof json.iss === 'string' && typeof json.sub === 'string'
      ? `${json.iss}|${json.sub}`
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * For STORAGE_TYPE=convex without Clerk JWT, run tool handlers with dev owner in ALS.
 * No-op when not using convex storage or when userId is already set (e.g. Clerk).
 */
export function runWithConvexAuth<T>(fn: () => T): T;
export function runWithConvexAuth<T>(fn: () => Promise<T>): Promise<T>;
export function runWithConvexAuth<T>(fn: () => T | Promise<T>): T | Promise<T> {
  if (process.env.STORAGE_TYPE !== 'convex') {
    return fn();
  }
  const dev = process.env.CONVEX_DEV_OWNER_USER_ID;
  const store = convexAuthStorage.getStore();
  if (!dev || store?.userId) {
    return fn();
  }
  return convexAuthStorage.run({ token: store?.token, userId: dev, ownerId: dev }, fn);
}
