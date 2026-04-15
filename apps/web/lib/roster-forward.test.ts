import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardRosterGet, getRosterBaseUrl, isRosterBffAuthRequired } from './roster-forward';

describe('getRosterBaseUrl', () => {
  const prevRoster = process.env.ROSTER_HTTP_URL;
  const prevPublic = process.env.NEXT_PUBLIC_ROSTER_HTTP_URL;

  afterEach(() => {
    if (prevRoster === undefined) delete process.env.ROSTER_HTTP_URL;
    else process.env.ROSTER_HTTP_URL = prevRoster;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_ROSTER_HTTP_URL;
    else process.env.NEXT_PUBLIC_ROSTER_HTTP_URL = prevPublic;
  });

  it('prefers ROSTER_HTTP_URL', () => {
    process.env.ROSTER_HTTP_URL = 'http://a.example/';
    process.env.NEXT_PUBLIC_ROSTER_HTTP_URL = 'http://b.example';
    expect(getRosterBaseUrl()).toBe('http://a.example');
  });

  it('falls back to NEXT_PUBLIC_ROSTER_HTTP_URL', () => {
    delete process.env.ROSTER_HTTP_URL;
    process.env.NEXT_PUBLIC_ROSTER_HTTP_URL = 'http://b.example/';
    expect(getRosterBaseUrl()).toBe('http://b.example');
  });

  it('returns null when unset', () => {
    delete process.env.ROSTER_HTTP_URL;
    delete process.env.NEXT_PUBLIC_ROSTER_HTTP_URL;
    expect(getRosterBaseUrl()).toBeNull();
  });
});

describe('isRosterBffAuthRequired', () => {
  const prev = process.env.ROSTER_BFF_REQUIRE_AUTH;

  afterEach(() => {
    if (prev === undefined) delete process.env.ROSTER_BFF_REQUIRE_AUTH;
    else process.env.ROSTER_BFF_REQUIRE_AUTH = prev;
  });

  it('is false by default', () => {
    delete process.env.ROSTER_BFF_REQUIRE_AUTH;
    expect(isRosterBffAuthRequired()).toBe(false);
  });

  it('is true for true/1/yes', () => {
    process.env.ROSTER_BFF_REQUIRE_AUTH = 'true';
    expect(isRosterBffAuthRequired()).toBe(true);
    process.env.ROSTER_BFF_REQUIRE_AUTH = '1';
    expect(isRosterBffAuthRequired()).toBe(true);
    process.env.ROSTER_BFF_REQUIRE_AUTH = 'YES';
    expect(isRosterBffAuthRequired()).toBe(true);
  });
});

describe('forwardRosterGet', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/json; charset=utf-8' },
        text: async () => JSON.stringify({ status: 'healthy', services: {} }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses JSON bodies', async () => {
    const out = await forwardRosterGet('http://localhost:9', '/health', {
      Accept: 'application/json',
    });
    expect(out.status).toBe(200);
    expect((out.body as { status: string }).status).toBe('healthy');
  });
});

describe('roster HTTP smoke (optional)', () => {
  const base = process.env.ROSTER_SMOKE_URL;

  it.skipIf(!base)('GET /health returns healthy when Roster has no Clerk auth', async () => {
    const res = await fetch(`${base!.replace(/\/$/, '')}/health`, { cache: 'no-store' });
    expect(res.ok).toBe(true);
    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe('healthy');
  });

  it.skipIf(!base)('GET /v1/prompts returns JSON when Roster has no Clerk auth', async () => {
    const res = await fetch(`${base!.replace(/\/$/, '')}/v1/prompts`, { cache: 'no-store' });
    expect(res.ok).toBe(true);
    const json = (await res.json()) as { prompts?: unknown };
    expect(Array.isArray(json.prompts)).toBe(true);
  });
});
