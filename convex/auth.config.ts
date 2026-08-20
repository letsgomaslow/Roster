import type { AuthConfig } from 'convex/server';

/** Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard (Clerk issuer URL). */
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN ?? '';

export default {
  providers: domain
    ? [{ domain, applicationID: 'convex' as const }]
    : ([] as { domain: string; applicationID: 'convex' }[]),
} satisfies AuthConfig;
