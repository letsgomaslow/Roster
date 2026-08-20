export type FirstUseChoice = {
  id: 'use_trusted_work' | 'save_my_work' | 'browse_library';
  title: string;
  description: string;
  href: '/library' | '/library/new';
  actionLabel: string;
};

const FIRST_USE_CHOICES: FirstUseChoice[] = [
  {
    id: 'use_trusted_work',
    title: 'Use trusted work',
    description: 'Fill in a few details and use work your team already shared.',
    href: '/library',
    actionLabel: 'Find trusted work',
  },
  {
    id: 'save_my_work',
    title: 'Save my work',
    description: 'Paste a prompt or upload a document you want to reuse.',
    href: '/library/new',
    actionLabel: 'Save useful work',
  },
  {
    id: 'browse_library',
    title: 'Browse the Library',
    description: 'Explore reusable work from across your workspace.',
    href: '/library',
    actionLabel: 'Browse the Library',
  },
];

export function getFirstUseChoices(): FirstUseChoice[] {
  return FIRST_USE_CHOICES.map((choice) => ({ ...choice }));
}

export type OwnerSetupStep = {
  id: 'workspace' | 'starter' | 'invite';
  title: string;
  description: string;
  complete: boolean;
  optional: boolean;
};

export function buildOwnerSetupSteps({
  workspaceReady,
  usefulWorkReady,
  teammateReady,
}: {
  workspaceReady: boolean;
  usefulWorkReady: boolean;
  teammateReady: boolean;
}): OwnerSetupStep[] {
  return [
    {
      id: 'workspace',
      title: 'Workspace ready',
      description: 'Roster keeps your team’s reusable work together in one private workspace.',
      complete: workspaceReady,
      optional: false,
    },
    {
      id: 'starter',
      title: 'Save first work',
      description: 'Start with reviewable examples so your Library is useful from day one.',
      complete: usefulWorkReady,
      optional: false,
    },
    {
      id: 'invite',
      title: 'Invite a teammate',
      description: 'Bring someone in when there is useful work ready for them. You can do this later.',
      complete: teammateReady,
      optional: true,
    },
  ];
}

export function getOwnerPrimaryStep(steps: OwnerSetupStep[]): OwnerSetupStep | null {
  return steps.find((step) => !step.complete && !step.optional) ?? null;
}

export type HomeGalleryItem = {
  assetId: string;
  title: string;
  purpose?: string;
  reviewState: string;
  updatedAt: number;
  versionNumber?: number;
  isFavorite?: boolean;
};

export function selectHomeGalleryItems({
  library,
  myWork,
}: {
  library: HomeGalleryItem[];
  myWork: HomeGalleryItem[];
}) {
  const byRecent = (left: HomeGalleryItem, right: HomeGalleryItem) =>
    right.updatedAt - left.updatedAt;
  const approved = (item: HomeGalleryItem) =>
    item.reviewState === 'team_approved' || item.reviewState === 'workspace_approved';

  return {
    continueWorking: [...myWork].sort(byRecent).slice(0, 3),
    favorites: library.filter((item) => item.isFavorite).sort(byRecent).slice(0, 3),
    recentlyApproved: library.filter(approved).sort(byRecent).slice(0, 3),
  };
}
