import { describe, expect, it } from 'vitest';
import {
  deriveClerkHostFromIssuer,
  deriveClerkHostFromPublishableKey,
  getClerkEnvironmentDiagnostic,
} from './clerk-diagnostics';

describe('deriveClerkHostFromPublishableKey', () => {
  it('extracts the Clerk host from a publishable key payload', () => {
    expect(
      deriveClerkHostFromPublishableKey(
        'pk_test_YXdha2UtbWFtbW90aC0yOS5jbGVyay5hY2NvdW50cy5kZXYk',
      ),
    ).toBe('awake-mammoth-29.clerk.accounts.dev');
  });

  it('returns null when the key shape is not recognizable', () => {
    expect(deriveClerkHostFromPublishableKey('not-a-clerk-key')).toBeNull();
  });
});

describe('getClerkEnvironmentDiagnostic', () => {
  it('returns null when publishable host and issuer host match', () => {
    expect(
      getClerkEnvironmentDiagnostic({
        environment: 'development',
        publishableKey: 'pk_test_YXdha2UtbWFtbW90aC0yOS5jbGVyay5hY2NvdW50cy5kZXYk',
        issuerDomain: 'https://awake-mammoth-29.clerk.accounts.dev',
      }),
    ).toBeNull();
  });

  it('reports a mismatch in local development', () => {
    expect(
      getClerkEnvironmentDiagnostic({
        environment: 'development',
        publishableKey: 'pk_test_YXdha2UtbWFtbW90aC0yOS5jbGVyay5hY2NvdW50cy5kZXYk',
        issuerDomain: 'https://different-instance.clerk.accounts.dev',
      }),
    ).toEqual({
      kind: 'issuer_mismatch',
      message:
        'Clerk publishable key targets awake-mammoth-29.clerk.accounts.dev, but CLERK_JWT_ISSUER_DOMAIN points to different-instance.clerk.accounts.dev. Use values from the same Clerk instance before retrying local auth.',
      publishableHost: 'awake-mammoth-29.clerk.accounts.dev',
      issuerHost: 'different-instance.clerk.accounts.dev',
    });
  });

  it('skips diagnostics in production', () => {
    expect(
      getClerkEnvironmentDiagnostic({
        environment: 'production',
        publishableKey: 'pk_test_YXdha2UtbWFtbW90aC0yOS5jbGVyay5hY2NvdW50cy5kZXYk',
        issuerDomain: 'https://different-instance.clerk.accounts.dev',
      }),
    ).toBeNull();
  });
});

describe('deriveClerkHostFromIssuer', () => {
  it('parses the host from the issuer domain', () => {
    expect(deriveClerkHostFromIssuer('https://awake-mammoth-29.clerk.accounts.dev')).toBe(
      'awake-mammoth-29.clerk.accounts.dev',
    );
  });
});
