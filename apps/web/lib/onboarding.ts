import type { DashboardApiPayload, DashboardSnapshot } from './roster-types';

export type ChecklistStepId =
  | 'connect_host'
  | 'verify_setup'
  | 'create_prompt'
  | 'run_orchestration';

export type UserOnboardingState = {
  ownerUserId: string;
  checklistStepStates: {
    connectHostCompletedAt?: number;
    verifySetupCompletedAt?: number;
    createPromptCompletedAt?: number;
    runOrchestrationCompletedAt?: number;
  };
  checklistDismissedAt: number | null;
  onboardingCompletedAt: number | null;
  updatedAt: number | null;
};

export type OnboardingStep = {
  id: ChecklistStepId;
  title: string;
  description: string;
  href: string;
  complete: boolean;
  completionSource: 'manual' | 'live';
  ctaLabel: string;
};

type BuildArgs = {
  profile?: UserOnboardingState | null;
  snapshot?: DashboardSnapshot | null;
  dashboard?: DashboardApiPayload | null;
};

export function buildOnboardingSteps({
  profile,
  snapshot,
  dashboard,
}: BuildArgs): OnboardingStep[] {
  const toolCount = dashboard?.tools?.data?.length ?? 0;
  const runCount = dashboard?.runs?.data?.executions?.length ?? 0;
  const hasHealthyServer = dashboard?.health?.data?.status === 'healthy';
  const verifySetupComplete =
    Boolean(profile?.checklistStepStates.verifySetupCompletedAt) ||
    (hasHealthyServer && toolCount > 0);
  const createPromptComplete =
    Boolean(profile?.checklistStepStates.createPromptCompletedAt) ||
    (snapshot?.counts.total ?? 0) > 0;
  const runOrchestrationComplete =
    Boolean(profile?.checklistStepStates.runOrchestrationCompletedAt) || runCount > 0;

  return [
    {
      id: 'connect_host',
      title: 'Connect an MCP host',
      description:
        'Generate a host config, point Claude Desktop or Cursor at the server, and confirm the app knows you reached setup.',
      href: '/integrations',
      complete: Boolean(profile?.checklistStepStates.connectHostCompletedAt),
      completionSource: 'manual',
      ctaLabel: 'Open integrations',
    },
    {
      id: 'verify_setup',
      title: 'Verify server health and tool discovery',
      description:
        'The server should answer `/health` and expose at least one MCP tool before beta users continue.',
      href: '/integrations',
      complete: verifySetupComplete,
      completionSource: 'live',
      ctaLabel: 'Check setup status',
    },
    {
      id: 'create_prompt',
      title: 'Create the first prompt',
      description:
        'A real beta account should be able to create and save a prompt without leaving the product.',
      href: '/library/new',
      complete: createPromptComplete,
      completionSource: 'live',
      ctaLabel: 'Create prompt',
    },
    {
      id: 'run_orchestration',
      title: 'Run the first orchestration',
      description:
        'Execution history should show at least one traceable run so the workspace reads like a working control plane.',
      href: '/runs',
      complete: runOrchestrationComplete,
      completionSource: 'live',
      ctaLabel: 'Open runs',
    },
  ];
}

export function isOnboardingComplete(steps: OnboardingStep[]) {
  return steps.every((step) => step.complete);
}

export function shouldShowOnboardingModule(
  profile: UserOnboardingState | null | undefined,
  steps: OnboardingStep[],
) {
  if (!steps.some((step) => !step.complete)) {
    return false;
  }
  if (profile?.onboardingCompletedAt) {
    return false;
  }
  return !profile?.checklistDismissedAt;
}
