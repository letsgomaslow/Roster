import { v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

const onboardingStepValidator = v.union(
  v.literal('connect_host'),
  v.literal('verify_setup'),
  v.literal('create_prompt'),
  v.literal('run_orchestration'),
  v.literal('onboarding_complete'),
);

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string; tokenIdentifier: string; issuer?: string } | null>;
  };
};

type OwnerScope = {
  canonicalOwnerId: string;
  ownerIds: string[];
};

type ChecklistStepStates = {
  connectHostCompletedAt?: number;
  verifySetupCompletedAt?: number;
  createPromptCompletedAt?: number;
  runOrchestrationCompletedAt?: number;
};

type UserProfileDoc = {
  ownerUserId: string;
  checklistStepStates: ChecklistStepStates;
  checklistDismissedAt?: number;
  onboardingCompletedAt?: number;
  updatedAt: number;
};

type UserProfileRow = UserProfileDoc & { _id: Id<'userProfiles'> };

async function resolveOwnerScope(ctx: AuthCtx): Promise<OwnerScope> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const ownerIds = [identity.tokenIdentifier];
    if (identity.subject && identity.subject !== identity.tokenIdentifier) {
      ownerIds.push(identity.subject);
    }
    return {
      canonicalOwnerId: identity.tokenIdentifier,
      ownerIds,
    };
  }
  const dev = process.env.CONVEX_DEV_OWNER_USER_ID;
  if (dev) {
    return {
      canonicalOwnerId: dev,
      ownerIds: [dev],
    };
  }
  throw new Error('Unauthorized');
}

export function applyStepMutation(
  current: ChecklistStepStates,
  step: 'connect_host' | 'verify_setup' | 'create_prompt' | 'run_orchestration',
  completed: boolean,
  timestamp: number,
): ChecklistStepStates {
  const next = { ...current };
  const fieldMap = {
    connect_host: 'connectHostCompletedAt',
    verify_setup: 'verifySetupCompletedAt',
    create_prompt: 'createPromptCompletedAt',
    run_orchestration: 'runOrchestrationCompletedAt',
  } as const;
  const field = fieldMap[step];
  if (completed) {
    next[field] = timestamp;
  } else {
    delete next[field];
  }
  return next;
}

async function getExistingProfile(ctx: QueryCtx | MutationCtx, ownerIds: string[]) {
  const rows = await Promise.all(
    ownerIds.map((ownerId) =>
      ctx.db
        .query('userProfiles')
        .withIndex('by_owner_user_id', (q) => q.eq('ownerUserId', ownerId))
        .take(1) as Promise<UserProfileRow[]>,
    ),
  );
  return rows
    .flat()
    .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
}

function serializeProfile(scope: OwnerScope, existing: UserProfileRow | null) {
  return {
    ownerUserId: scope.canonicalOwnerId,
    checklistStepStates: existing?.checklistStepStates ?? {},
    checklistDismissedAt: existing?.checklistDismissedAt ?? null,
    onboardingCompletedAt: existing?.onboardingCompletedAt ?? null,
    updatedAt: existing?.updatedAt ?? null,
  };
}

export const getUserOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const scope = await resolveOwnerScope(ctx);
    const existing = await getExistingProfile(ctx, scope.ownerIds);
    return serializeProfile(scope, existing);
  },
});

export const markOnboardingStep = mutation({
  args: {
    step: onboardingStepValidator,
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const scope = await resolveOwnerScope(ctx);
    const existing = await getExistingProfile(ctx, scope.ownerIds);
    const now = Date.now();
    const checklistStepStates =
      args.step === 'onboarding_complete'
        ? existing?.checklistStepStates ?? {}
        : applyStepMutation(existing?.checklistStepStates ?? {}, args.step, args.completed, now);

    const nextProfile = {
      ownerUserId: scope.canonicalOwnerId,
      checklistStepStates,
      checklistDismissedAt: existing?.checklistDismissedAt,
      onboardingCompletedAt:
        args.step === 'onboarding_complete'
          ? args.completed
            ? now
            : undefined
          : existing?.onboardingCompletedAt,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextProfile);
    } else {
      await ctx.db.insert('userProfiles', nextProfile);
    }

    return {
      ownerUserId: nextProfile.ownerUserId,
      checklistStepStates: nextProfile.checklistStepStates,
      checklistDismissedAt: nextProfile.checklistDismissedAt ?? null,
      onboardingCompletedAt: nextProfile.onboardingCompletedAt ?? null,
      updatedAt: nextProfile.updatedAt,
    };
  },
});

export const dismissOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const scope = await resolveOwnerScope(ctx);
    const existing = await getExistingProfile(ctx, scope.ownerIds);
    const now = Date.now();
    const nextProfile = {
      ownerUserId: scope.canonicalOwnerId,
      checklistStepStates: existing?.checklistStepStates ?? {},
      checklistDismissedAt: now,
      onboardingCompletedAt: existing?.onboardingCompletedAt,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextProfile);
    } else {
      await ctx.db.insert('userProfiles', nextProfile);
    }

    return {
      ownerUserId: nextProfile.ownerUserId,
      checklistStepStates: nextProfile.checklistStepStates,
      checklistDismissedAt: nextProfile.checklistDismissedAt,
      onboardingCompletedAt: nextProfile.onboardingCompletedAt ?? null,
      updatedAt: nextProfile.updatedAt,
    };
  },
});
