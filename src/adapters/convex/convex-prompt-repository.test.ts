import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConvexPromptRepository } from './convex-prompt-repository.js';
import { convexAuthStorage } from '../../lib/convex-auth-context.js';
import { Prompt } from '../../core/entities/prompt.entity.js';

const queryMock = vi.fn();
const mutationMock = vi.fn();
const setAuthMock = vi.fn();

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    query: queryMock,
    mutation: mutationMock,
    setAuth: setAuthMock,
  })),
}));

describe('ConvexPromptRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    mutationMock.mockReset();
    setAuthMock.mockReset();
    delete process.env.CONVEX_DEV_OWNER_USER_ID;
  });

  it('save uses ALS userId when set', async () => {
    const repo = new ConvexPromptRepository('https://test.convex.cloud');
    const p = new Prompt(
      'id1',
      'n',
      'd',
      't',
      'cat',
      [],
      [],
      '1',
      new Date(),
      new Date(),
      true,
      {},
      'public',
    );
    mutationMock.mockResolvedValue(undefined);

    await convexAuthStorage.run(
      { token: undefined, userId: 'als_user', ownerId: 'issuer|als_user' },
      () => repo.save(p),
    );

    expect(mutationMock).toHaveBeenCalledTimes(1);
    const payload = mutationMock.mock.calls[0][1] as { doc: { ownerUserId: string } };
    expect(payload.doc.ownerUserId).toBe('issuer|als_user');
  });

  it('save falls back to CONVEX_DEV_OWNER_USER_ID', async () => {
    process.env.CONVEX_DEV_OWNER_USER_ID = 'dev_owner';
    const repo = new ConvexPromptRepository('https://test.convex.cloud');
    const p = new Prompt(
      'id2',
      'n',
      'd',
      't',
      'cat',
      [],
      [],
      '1',
      new Date(),
      new Date(),
      true,
      {},
      'public',
    );
    mutationMock.mockResolvedValue(undefined);

    await repo.save(p);

    expect(mutationMock).toHaveBeenCalledTimes(1);
    const payload = mutationMock.mock.calls[0][1] as { doc: { ownerUserId: string } };
    expect(payload.doc.ownerUserId).toBe('dev_owner');
  });

  it('save throws without userId or dev env', async () => {
    const repo = new ConvexPromptRepository('https://test.convex.cloud');
    const p = new Prompt(
      'id3',
      'n',
      'd',
      't',
      'cat',
      [],
      [],
      '1',
      new Date(),
      new Date(),
      true,
      {},
      'public',
    );

    await expect(repo.save(p)).rejects.toThrow(
      'ConvexPromptRepository.save requires Clerk session or CONVEX_DEV_OWNER_USER_ID',
    );
  });

  it('setAuth is called when token present in ALS', async () => {
    queryMock.mockResolvedValue([]);
    const repo = new ConvexPromptRepository('https://test.convex.cloud');
    await convexAuthStorage.run({ token: 'jwt-here', userId: 'u', ownerId: 'issuer|u' }, () =>
      repo.findLatestVersions(5),
    );
    expect(setAuthMock).toHaveBeenCalledWith('jwt-here');
  });
});
