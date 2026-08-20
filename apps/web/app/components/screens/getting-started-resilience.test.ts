import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as gettingStartedModule from './GettingStartedScreen';

type TimerStarter = (
  onTimeout: () => void,
  setTimer: (callback: () => void, timeoutMs: number) => number,
  clearTimer: (timerId: number) => void,
) => () => void;

type ResilienceExports = {
  ConvexHandoffRecovery?: ComponentType;
  startConvexAuthHandoffTimer?: TimerStarter;
};

const resilience = gettingStartedModule as ResilienceExports;

describe('GettingStartedScreen Convex handoff', () => {
  it('bounds the auth handoff wait and cancels the pending timer on cleanup', () => {
    let scheduledCallback: (() => void) | undefined;
    let scheduledDelay: number | undefined;
    let timedOut = false;
    const clearedTimerIds: number[] = [];
    const startTimer = resilience.startConvexAuthHandoffTimer;

    expect(startTimer).toBeTypeOf('function');
    if (!startTimer) return;

    const cancel = startTimer(
      () => {
        timedOut = true;
      },
      (callback, timeoutMs) => {
        scheduledCallback = callback;
        scheduledDelay = timeoutMs;
        return 17;
      },
      (timerId) => {
        clearedTimerIds.push(timerId);
      },
    );

    expect(scheduledDelay).toBeGreaterThanOrEqual(1_000);
    expect(scheduledDelay).toBeLessThanOrEqual(10_000);
    scheduledCallback?.();
    expect(timedOut).toBe(true);

    cancel();
    expect(clearedTimerIds).toEqual([17]);
  });

  it('offers a full reload when the auth handoff reaches its limit', () => {
    const Recovery = resilience.ConvexHandoffRecovery;

    expect(Recovery).toBeTypeOf('function');
    if (!Recovery) return;

    const html = renderToStaticMarkup(createElement(Recovery));

    expect(html).toContain('Roster could not finish signing you in');
    expect(html).toContain('href="/getting-started"');
    expect(html).toContain('Reload and try again');
    expect(html).not.toContain('aria-busy="true"');
  });
});
