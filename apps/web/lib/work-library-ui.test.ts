import { describe, expect, it } from 'vitest';
import * as workLibraryUi from './work-library-ui';
import {
  applyImportReview,
  copyPromptWithGuard,
  friendlyDraftError,
  getAssetPrimaryAction,
  getLibraryCardAction,
  NEW_TAXONOMY_SELECTION,
  prepareApprovalSubmission,
  prepareDraftPayload,
  prepareTaxonomySelection,
  savedAssetHref,
  taxonomyOptionValue,
  undoImportReview,
} from './work-library-ui';

type TaxonomyHelpers = {
  activeTaxonomySelection: (
    terms: ReadonlyArray<{
      kind: 'team' | 'work_type';
      key: string;
      label: string;
      status: 'active' | 'archived';
    }> | undefined,
    kind: 'team' | 'work_type',
    selectedKey: string,
  ) => string;
  activeTaxonomyTerms: <Term extends {
    kind: 'team' | 'work_type';
    key: string;
    label: string;
    status: 'active' | 'archived';
  }>(
    terms: readonly Term[] | undefined,
    kind: 'team' | 'work_type',
  ) => Term[];
  friendlyTaxonomyError: (error: unknown) => string;
  confirmTaxonomyArchive: (
    label: string,
    confirmArchive: (message: string) => boolean,
  ) => boolean;
  getActiveTaxonomyLabel: (
    terms: ReadonlyArray<{
      kind: 'team' | 'work_type';
      key: string;
      label: string;
      status: 'active' | 'archived';
    }> | undefined,
    kind: 'team' | 'work_type',
    key: string | undefined,
  ) => string | undefined;
  preparePrivateDraftMetadataUpdate: (input: {
    assetId: string;
    current: { title: string; purpose?: string; teamKey?: string; jobKey?: string };
    next: { title: string; purpose: string; teamKey: string; jobKey: string };
  }) => {
    assetId: string;
    title?: string;
    purpose?: string;
    teamKey?: string;
    jobKey?: string;
  };
  taxonomyArchiveSuccessMessage: (label: string) => string;
};

const taxonomyHelpers = workLibraryUi as typeof workLibraryUi & TaxonomyHelpers;

const taxonomyTerms = [
  {
    kind: 'team' as const,
    key: 'client-delivery',
    label: 'Enterprise advisory',
    status: 'active' as const,
    termId: 'team-1',
  },
  {
    kind: 'team' as const,
    key: 'marketing',
    label: 'Marketing',
    status: 'archived' as const,
    termId: 'team-2',
  },
  {
    kind: 'work_type' as const,
    key: 'create-proposal',
    label: 'Develop win themes',
    status: 'active' as const,
    termId: 'work-1',
  },
];

describe('active workspace taxonomy', () => {
  it('keeps only active terms of the requested kind without dropping term identity', () => {
    expect(taxonomyHelpers.activeTaxonomyTerms(taxonomyTerms, 'team')).toEqual([
      taxonomyTerms[0],
    ]);
  });

  it('uses the current workspace label and omits missing or archived classifications', () => {
    expect(
      taxonomyHelpers.getActiveTaxonomyLabel(
        taxonomyTerms,
        'team',
        'client-delivery',
      ),
    ).toBe('Enterprise advisory');
    expect(
      taxonomyHelpers.getActiveTaxonomyLabel(taxonomyTerms, 'team', 'marketing'),
    ).toBeUndefined();
    expect(
      taxonomyHelpers.getActiveTaxonomyLabel(taxonomyTerms, 'team', undefined),
    ).toBeUndefined();
  });

  it('drops an inactive selected filter only after taxonomy has loaded', () => {
    expect(
      taxonomyHelpers.activeTaxonomySelection(undefined, 'team', 'client-delivery'),
    ).toBe('client-delivery');
    expect(
      taxonomyHelpers.activeTaxonomySelection(taxonomyTerms, 'team', 'marketing'),
    ).toBe('');
  });
});

describe('private draft metadata updates', () => {
  it('sends only changed fields and uses blank values to clear optional metadata', () => {
    expect(
      taxonomyHelpers.preparePrivateDraftMetadataUpdate({
        assetId: 'asset-1',
        current: {
          title: 'Proposal drafter',
          purpose: 'Create a proposal.',
          teamKey: 'client-delivery',
          jobKey: 'create-proposal',
        },
        next: {
          title: '  Proposal drafter  ',
          purpose: '',
          teamKey: 'client-delivery',
          jobKey: '',
        },
      }),
    ).toEqual({ assetId: 'asset-1', purpose: '', jobKey: '' });
  });
});

describe('workspace taxonomy errors', () => {
  it('returns fixed recovery copy without exposing Convex diagnostics', () => {
    const message = taxonomyHelpers.friendlyTaxonomyError(
      new Error(
        'Uncaught Error: [CONVEX M(workLibrary:updateTaxonomyTerm)] Request ID: secret-42 at convex/workLibrary.ts:505',
      ),
    );

    expect(message).toBe('Roster could not update Library organization. Try again.');
    expect(message).not.toMatch(/convex|request id|updateTaxonomyTerm|workLibrary\.ts/i);
  });

  it('gives a fixed correction when a label already exists', () => {
    expect(
      taxonomyHelpers.friendlyTaxonomyError(new Error('Taxonomy label already exists')),
    ).toBe('That label already exists. Choose a different name.');
  });
});

describe('workspace taxonomy archive confirmation', () => {
  it('explains the visible effect without suggesting saved work will be deleted', () => {
    let confirmation = '';

    const accepted = taxonomyHelpers.confirmTaxonomyArchive(
      'Enterprise advisory',
      (message) => {
        confirmation = message;
        return false;
      },
    );

    expect(accepted).toBe(false);
    expect(confirmation).toContain('Enterprise advisory');
    expect(confirmation).toContain('future choices and filters');
    expect(confirmation).toContain(
      'This does not delete or change any saved work or its content.',
    );
    expect(confirmation).not.toContain('keeps its existing label');
  });

  it('reports that archiving did not delete or change saved content', () => {
    const message = taxonomyHelpers.taxonomyArchiveSuccessMessage('Enterprise advisory');

    expect(message).toBe(
      'Enterprise advisory no longer appears in future choices and filters. No saved work or content was deleted or changed.',
    );
    expect(message).not.toContain('keeps its existing label');
  });
});

describe('getLibraryCardAction', () => {
  it('opens approval items in a dedicated review mode', () => {
    expect(getLibraryCardAction('approvals', 'asset-123')).toEqual({
      href: '/library/asset-123?mode=review',
      label: 'Review',
    });
  });

  it('keeps the everyday library action focused on use', () => {
    expect(getLibraryCardAction('library', 'asset-123')).toEqual({
      href: '/library/asset-123',
      label: 'Use',
    });
  });
});

describe('import review', () => {
  it('restores the exact prior prompt when an import is undone', () => {
    const imported = applyImportReview(
      { body: 'Existing prompt', title: 'Existing title', import: null },
      { fileName: 'discovery-notes.md', text: 'Imported prompt' },
    );

    expect(imported).toMatchObject({
      body: 'Imported prompt',
      title: 'Existing title',
      import: { fileName: 'discovery-notes.md', previousBody: 'Existing prompt' },
    });
    expect(undoImportReview(imported)).toEqual({
      body: 'Existing prompt',
      title: 'Existing title',
      import: null,
    });
  });

  it('suggests a readable title only when the user has not entered one', () => {
    expect(
      applyImportReview(
        { body: '', title: '', import: null },
        { fileName: 'client-discovery_notes.pdf', text: 'Imported prompt' },
      ).title,
    ).toBe('client discovery notes');
  });
});

describe('flexible private draft capture', () => {
  it('preserves exact body text while omitting every blank optional detail', () => {
    const body = '<instructions>\n  Keep this spacing exactly.\n</instructions>\n';

    expect(
      prepareDraftPayload({
        body,
        inputs: [],
        jobLabel: '',
        jobSelection: '',
        purpose: '   ',
        teamLabel: '',
        teamSelection: '',
        title: '',
      }),
    ).toEqual({ body, inputs: [] });
  });

  it('accepts the full 20,000-character description boundary', () => {
    const purpose = 'd'.repeat(20_000);

    expect(
      prepareDraftPayload({
        body: 'Reusable AI instructions',
        inputs: [],
        jobLabel: '',
        jobSelection: '',
        purpose,
        teamLabel: '',
        teamSelection: '',
        title: '',
      }).purpose,
    ).toBe(purpose);
  });

  it('maps existing and custom taxonomy choices to distinct draft arguments', () => {
    expect(prepareTaxonomySelection('', '')).toEqual({});
    expect(prepareTaxonomySelection(taxonomyOptionValue('operations'), '')).toEqual({
      key: 'operations',
    });
    expect(prepareTaxonomySelection(NEW_TAXONOMY_SELECTION, '  Customer success  ')).toEqual({
      label: 'Customer success',
    });

    expect(
      prepareDraftPayload({
        body: 'Reusable AI instructions',
        inputs: [],
        jobLabel: '  Renewal planning  ',
        jobSelection: NEW_TAXONOMY_SELECTION,
        purpose: '',
        teamLabel: '  Customer success  ',
        teamSelection: NEW_TAXONOMY_SELECTION,
        title: '',
      }),
    ).toEqual({
      body: 'Reusable AI instructions',
      inputs: [],
      jobLabel: 'Renewal planning',
      teamLabel: 'Customer success',
    });
  });

  it('marks the saved asset destination so the detail screen can show private-save guidance', () => {
    expect(savedAssetHref('asset-123')).toBe('/library/asset-123?saved=1');
  });
});

describe('friendlyDraftError', () => {
  it('never exposes raw Convex diagnostics', () => {
    const result = friendlyDraftError(
      new Error(
        'Uncaught Error: [CONVEX M(workLibrary:createDraft)] Request ID: 8a62 at convex/workLibrary.ts:536',
      ),
    );

    expect(result).toBe('Your work is still here. Check your connection and try again.');
    expect(result).not.toMatch(/convex|createDraft|request id|workLibrary\.ts/i);
  });

  it('gives a safe recovery path when a taxonomy choice is no longer active', () => {
    expect(friendlyDraftError(new Error('Archived taxonomy terms cannot be reused'))).toBe(
      'That team or work type is no longer available. Choose another option and try again.',
    );
  });
});

describe('getAssetPrimaryAction', () => {
  it('gives a curator one clear team-approval action in review mode', () => {
    expect(
      getAssetPrimaryAction({
        kind: 'prompt',
        mode: 'review',
        reviewState: 'shared',
        role: 'curator',
      }),
    ).toEqual({ kind: 'approve_team', label: 'Approve for team' });
  });

  it.each([
    { kind: 'prompt' as const, label: 'Copy AI work' },
    { kind: 'playbook' as const, label: 'Copy instructions' },
  ])('uses $label as the $kind copy action', ({ kind, label }) => {
    expect(
      getAssetPrimaryAction({ kind, mode: 'use', reviewState: 'shared', role: 'curator' }),
    ).toEqual({ kind: 'copy', label });
  });
});

describe('copyPromptWithGuard', () => {
  it('focuses and identifies the first blank required input without copying', async () => {
    let copiedText: string | null = null;
    let focusedInput: string | null = null;

    const result = await copyPromptWithGuard({
      copyText: async (text) => {
        copiedText = text;
      },
      focusInput: (key) => {
        focusedInput = key;
      },
      inputs: [
        { key: 'client_name', label: 'Client name', required: true },
        { key: 'context', label: 'Context', required: true },
      ],
      rendered: 'Draft a proposal for {{client_name}} using {{context}}.',
      values: { client_name: '   ', context: 'Discovery notes' },
    });

    expect(result).toEqual({
      inputKey: 'client_name',
      inputLabel: 'Client name',
      status: 'missing_input',
    });
    expect(copiedText).toBeNull();
    expect(focusedInput).toBe('client_name');
  });

  it('does not copy a prompt that still contains an unresolved field', async () => {
    let copiedText: string | null = null;

    const result = await copyPromptWithGuard({
      copyText: async (text) => {
        copiedText = text;
      },
      focusInput: () => undefined,
      inputs: [],
      rendered: 'Draft a proposal for {{unregistered_field}}.',
      values: {},
    });

    expect(result).toEqual({ status: 'unresolved_prompt' });
    expect(copiedText).toBeNull();
  });

  it('copies the exact rendered prompt once every required input is complete', async () => {
    let copiedText: string | null = null;

    const result = await copyPromptWithGuard({
      copyText: async (text) => {
        copiedText = text;
      },
      focusInput: () => undefined,
      inputs: [{ key: 'client_name', label: 'Client name', required: true }],
      rendered: 'Draft a proposal for Acme.',
      values: { client_name: 'Acme' },
    });

    expect(result).toEqual({ status: 'copied' });
    expect(copiedText).toBe('Draft a proposal for Acme.');
  });
});

describe('prepareApprovalSubmission', () => {
  it('requires a meaningful reviewer note', () => {
    expect(prepareApprovalSubmission('Approved', 'GPT-5')).toEqual({
      error: 'Add a reviewer note with at least 10 characters.',
      ok: false,
    });
  });

  it('trims the note and normalizes optional comma-separated tested models', () => {
    expect(
      prepareApprovalSubmission(
        '  Checked the facts and output structure.  ',
        ' GPT-5, Claude Sonnet, GPT-5,  ',
      ),
    ).toEqual({
      note: 'Checked the facts and output structure.',
      ok: true,
      testedModels: ['GPT-5', 'Claude Sonnet'],
    });
  });
});
