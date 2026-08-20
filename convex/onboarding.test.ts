import { describe, expect, it } from 'vitest';
import { applyStepMutation } from './onboarding';

describe('applyStepMutation', () => {
  it('stores a completion timestamp for the targeted step', () => {
    const next = applyStepMutation({}, 'connect_host', true, 123);
    expect(next).toEqual({ connectHostCompletedAt: 123 });
  });

  it('clears only the requested step when marked incomplete', () => {
    const next = applyStepMutation(
      {
        connectHostCompletedAt: 123,
        verifySetupCompletedAt: 456,
      },
      'connect_host',
      false,
      999,
    );

    expect(next).toEqual({ verifySetupCompletedAt: 456 });
  });
});
