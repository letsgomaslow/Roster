import { describe, expect, it } from 'vitest';
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  shouldShowOnboardingModule,
  type UserOnboardingState,
} from './onboarding';

function profile(overrides: Partial<UserOnboardingState> = {}): UserOnboardingState {
  return {
    ownerUserId: 'user_123',
    checklistStepStates: {},
    checklistDismissedAt: null,
    onboardingCompletedAt: null,
    updatedAt: 123,
    ...overrides,
  };
}

describe('buildOnboardingSteps', () => {
  it('marks live readiness steps complete from dashboard and snapshot data', () => {
    const steps = buildOnboardingSteps({
      profile: profile({
        checklistStepStates: {
          connectHostCompletedAt: 123,
        },
      }),
      snapshot: {
        counts: { total: 1, byPromptType: {}, byCategory: {} },
        recentPrompts: [],
        recentAgents: [],
        recentFeedbackCount: 0,
      },
      dashboard: {
        health: { success: true, status: 200, data: { status: 'healthy' } },
        tools: { success: true, status: 200, data: [{ name: 'ping', description: 'Ping' }] },
        stats: { success: true, status: 200, data: null },
        runs: {
          success: true,
          status: 200,
          data: {
            executions: [
              {
                executionId: 'run_1',
                projectPath: '/tmp/demo',
                projectType: 'demo',
                mode: 'standard',
                status: 'completed',
                startTime: '2026-04-15T00:00:00.000Z',
              },
            ],
          },
        },
        subscription: { success: true, status: 200, data: null },
      },
    });

    expect(steps.every((step) => step.complete)).toBe(true);
    expect(isOnboardingComplete(steps)).toBe(true);
  });

  it('hides the dashboard module once dismissed', () => {
    const steps = buildOnboardingSteps({
      profile: profile(),
      snapshot: null,
      dashboard: null,
    });

    expect(shouldShowOnboardingModule(profile(), steps)).toBe(true);
    expect(
      shouldShowOnboardingModule(
        profile({
          checklistDismissedAt: 999,
        }),
        steps,
      ),
    ).toBe(false);
  });
});
