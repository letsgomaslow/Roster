export type ClerkEnvironmentDiagnostic = {
  kind: 'issuer_mismatch';
  publishableHost: string;
  issuerHost: string;
  message: string;
};

function normalizeBase64Payload(payload: string) {
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
}

export function deriveClerkHostFromPublishableKey(publishableKey: string) {
  const match = publishableKey.trim().match(/^pk_(?:test|live)_(.+)$/);
  if (!match) {
    return null;
  }

  try {
    const decoded = Buffer.from(normalizeBase64Payload(match[1]), 'base64')
      .toString('utf8')
      .replace(/\$$/, '')
      .trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function deriveClerkHostFromIssuer(issuerDomain: string) {
  try {
    return new URL(issuerDomain).host;
  } catch {
    return null;
  }
}

export function getClerkEnvironmentDiagnostic({
  publishableKey,
  issuerDomain,
  environment,
}: {
  publishableKey?: string;
  issuerDomain?: string;
  environment?: string;
}): ClerkEnvironmentDiagnostic | null {
  if (environment === 'production') {
    return null;
  }

  const publishableHost = publishableKey ? deriveClerkHostFromPublishableKey(publishableKey) : null;
  const issuerHost = issuerDomain ? deriveClerkHostFromIssuer(issuerDomain) : null;

  if (!publishableHost || !issuerHost || publishableHost === issuerHost) {
    return null;
  }

  return {
    kind: 'issuer_mismatch',
    publishableHost,
    issuerHost,
    message:
      `Clerk publishable key targets ${publishableHost}, but CLERK_JWT_ISSUER_DOMAIN points to ${issuerHost}. ` +
      'Use values from the same Clerk instance before retrying local auth.',
  };
}
