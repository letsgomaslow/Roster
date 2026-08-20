import { describe, expect, it } from 'vitest';
import {
  buildOwnerSetupSteps,
  getFirstUseChoices,
  getOwnerPrimaryStep,
  selectHomeGalleryItems,
} from './onboarding';

describe('getFirstUseChoices', () => {
  it('offers first-value work instead of technical setup', () => {
    expect(getFirstUseChoices()).toEqual([
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
    ]);
  });
});

describe('buildOwnerSetupSteps', () => {
  it('progresses from workspace to useful starter to optional invitation', () => {
    const steps = buildOwnerSetupSteps({
      workspaceReady: true,
      usefulWorkReady: false,
      teammateReady: false,
    });

    expect(steps.map(({ id, complete, optional }) => ({ id, complete, optional }))).toEqual([
      { id: 'workspace', complete: true, optional: false },
      { id: 'starter', complete: false, optional: false },
      { id: 'invite', complete: false, optional: true },
    ]);
    expect(getOwnerPrimaryStep(steps)?.id).toBe('starter');
  });

  it('allows the owner to start using Roster before inviting anyone', () => {
    const steps = buildOwnerSetupSteps({
      workspaceReady: true,
      usefulWorkReady: true,
      teammateReady: false,
    });

    expect(getOwnerPrimaryStep(steps)).toBeNull();
    expect(steps.find((step) => step.id === 'invite')?.complete).toBe(false);
  });
});

describe('selectHomeGalleryItems', () => {
  const approved = {
    assetId: 'approved',
    title: 'Draft a proposal',
    purpose: 'Create a review-ready client proposal.',
    reviewState: 'team_approved',
    updatedAt: 300,
  };

  it('keeps drafts out of recently approved work and preserves favorites', () => {
    const gallery = selectHomeGalleryItems({
      library: [
        approved,
        { ...approved, assetId: 'draft', reviewState: 'draft', updatedAt: 400 },
        { ...approved, assetId: 'favorite', isFavorite: true, updatedAt: 200 },
      ],
      myWork: [{ ...approved, assetId: 'mine', reviewState: 'draft', updatedAt: 500 }],
    });

    expect(gallery.continueWorking.map((item) => item.assetId)).toEqual(['mine']);
    expect(gallery.favorites.map((item) => item.assetId)).toEqual(['favorite']);
    expect(gallery.recentlyApproved.map((item) => item.assetId)).toEqual([
      'approved',
      'favorite',
    ]);
  });

  it('accepts purpose-less work without inventing fallback copy', () => {
    const purposeLess = {
      assetId: approved.assetId,
      title: approved.title,
      reviewState: approved.reviewState,
      updatedAt: approved.updatedAt,
    };
    const gallery = selectHomeGalleryItems({ library: [purposeLess], myWork: [] });

    expect(gallery.recentlyApproved).toEqual([purposeLess]);
    expect(gallery.recentlyApproved[0]).not.toHaveProperty('purpose');
  });
});
