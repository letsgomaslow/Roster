import { auth } from '@clerk/nextjs/server';

/**
 * Builds headers for server-side Roster requests.
 * When `ROSTER_BFF_REQUIRE_AUTH` is enabled, requires Clerk session and attaches Bearer token.
 */
export async function buildRosterBffHeaders(): Promise<HeadersInit | { error: 'unauthorized' }> {
  if (!process.env.ROSTER_BFF_REQUIRE_AUTH?.match(/^(1|true|yes)$/i)) {
    return { Accept: 'application/json' };
  }

  const a = await auth();
  if (!a.userId) {
    return { error: 'unauthorized' };
  }

  const template = process.env.CLERK_ROSTER_JWT_TEMPLATE?.trim();
  const token = template ? await a.getToken({ template }) : await a.getToken();
  if (!token) {
    return { error: 'unauthorized' };
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
