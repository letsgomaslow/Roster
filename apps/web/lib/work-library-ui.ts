import type { api } from '@convex/_generated/api';
import type { FunctionArgs } from 'convex/server';

export type LibraryScope = 'library' | 'my_work' | 'approvals';
export type WorkspaceRole = 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer';
export type WorkspaceTaxonomyTerm = {
  kind: 'team' | 'work_type';
  key: string;
  label: string;
  status: 'active' | 'archived';
};

export function activeTaxonomyTerms<T extends WorkspaceTaxonomyTerm>(
  terms: readonly T[] | undefined,
  kind: WorkspaceTaxonomyTerm['kind'],
): T[] {
  return (terms ?? []).filter((term) => term.kind === kind && term.status === 'active');
}

export function getActiveTaxonomyLabel(
  terms: readonly WorkspaceTaxonomyTerm[] | undefined,
  kind: WorkspaceTaxonomyTerm['kind'],
  key: string | undefined,
): string | undefined {
  if (!key) return undefined;
  return terms?.find(
    (term) => term.kind === kind && term.key === key && term.status === 'active',
  )?.label;
}

export function activeTaxonomySelection(
  terms: readonly WorkspaceTaxonomyTerm[] | undefined,
  kind: WorkspaceTaxonomyTerm['kind'],
  selectedKey: string,
): string {
  if (!selectedKey || terms === undefined) return selectedKey;
  return getActiveTaxonomyLabel(terms, kind, selectedKey) ? selectedKey : '';
}

type PromptCopyInput = {
  key: string;
  label: string;
  required: boolean;
};

type PromptCopyResult =
  | { status: 'copied' }
  | { status: 'missing_input'; inputKey: string; inputLabel: string }
  | { status: 'unresolved_prompt' };

const UNRESOLVED_PROMPT_FIELD = /\{\{[a-z][a-z0-9_]{0,63}\}\}/;

export type ImportReviewState = {
  body: string;
  title: string;
  import: { fileName: string; previousBody: string } | null;
};

type CreateDraftArgs = FunctionArgs<typeof api.workLibrary.createDraft>;
export type UpdatePrivateDraftMetadataArgs = FunctionArgs<
  typeof api.workLibrary.updatePrivateDraftMetadata
>;

function normalizedOptionalMetadata(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function preparePrivateDraftMetadataUpdate(input: {
  assetId: UpdatePrivateDraftMetadataArgs['assetId'];
  current: { title: string; purpose?: string; teamKey?: string; jobKey?: string };
  next: { title: string; purpose: string; teamKey: string; jobKey: string };
}): UpdatePrivateDraftMetadataArgs {
  const payload: UpdatePrivateDraftMetadataArgs = { assetId: input.assetId };
  const title = input.next.title.trim();
  const purpose = normalizedOptionalMetadata(input.next.purpose);
  const teamKey = normalizedOptionalMetadata(input.next.teamKey);
  const jobKey = normalizedOptionalMetadata(input.next.jobKey);
  if (title !== input.current.title.trim()) payload.title = title;
  if (purpose !== normalizedOptionalMetadata(input.current.purpose)) payload.purpose = purpose ?? '';
  if (teamKey !== normalizedOptionalMetadata(input.current.teamKey)) payload.teamKey = teamKey ?? '';
  if (jobKey !== normalizedOptionalMetadata(input.current.jobKey)) payload.jobKey = jobKey ?? '';
  return payload;
}

export const NEW_TAXONOMY_SELECTION = 'new-taxonomy-term';
const TAXONOMY_KEY_PREFIX = 'taxonomy-key:';

export function taxonomyOptionValue(key: string): string {
  return `${TAXONOMY_KEY_PREFIX}${key}`;
}

export function prepareTaxonomySelection(
  selection: string,
  customLabel: string,
): { key?: string; label?: string } {
  if (selection === NEW_TAXONOMY_SELECTION) {
    const label = customLabel.trim();
    return label ? { label } : {};
  }
  if (selection.startsWith(TAXONOMY_KEY_PREFIX)) {
    const key = selection.slice(TAXONOMY_KEY_PREFIX.length);
    return key ? { key } : {};
  }
  return {};
}

export function prepareDraftPayload(input: {
  body: string;
  inputs: NonNullable<CreateDraftArgs['inputs']>;
  jobLabel: string;
  jobSelection: string;
  purpose: string;
  teamLabel: string;
  teamSelection: string;
  title: string;
}): CreateDraftArgs {
  const payload: CreateDraftArgs = { body: input.body, inputs: input.inputs };
  const title = input.title.trim();
  const purpose = input.purpose.trim();
  const team = prepareTaxonomySelection(input.teamSelection, input.teamLabel);
  const job = prepareTaxonomySelection(input.jobSelection, input.jobLabel);
  if (title) payload.title = title;
  if (purpose) payload.purpose = purpose;
  if (team.key) payload.teamKey = team.key;
  if (team.label) payload.teamLabel = team.label;
  if (job.key) payload.jobKey = job.key;
  if (job.label) payload.jobLabel = job.label;
  return payload;
}

export function savedAssetHref(assetId: string): string {
  return `/library/${assetId}?saved=1`;
}

export function friendlyDraftError(error: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : '';
  if (/archived taxonomy|taxonomy term not found|no longer active/.test(detail)) {
    return 'That team or work type is no longer available. Choose another option and try again.';
  }
  if (/membership|workspace|not authenticated|contributor access/.test(detail)) {
    return 'Roster could not verify your workspace access. Refresh the page and try again.';
  }
  if (/too long|maximum|20,000|20000/.test(detail)) {
    return 'One of the optional details is too long. Shorten it and try again.';
  }
  return 'Your work is still here. Check your connection and try again.';
}

export function friendlyTaxonomyError(error: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : '';
  if (/already exists|duplicate/.test(detail)) {
    return 'That label already exists. Choose a different name.';
  }
  if (/required|120 characters|too long/.test(detail)) {
    return 'Use a label between 1 and 120 characters.';
  }
  if (/curator access|membership|workspace|not authenticated/.test(detail)) {
    return 'Roster could not verify your permission to organize the Library. Reload and try again.';
  }
  return 'Roster could not update Library organization. Try again.';
}

export function confirmTaxonomyArchive(
  label: string,
  confirmArchive: (message: string) => boolean,
): boolean {
  return confirmArchive(
    `Archive “${label}”? It will no longer appear in future choices and filters. This does not delete or change any saved work or its content.`,
  );
}

export function taxonomyArchiveSuccessMessage(label: string): string {
  return `${label} no longer appears in future choices and filters. No saved work or content was deleted or changed.`;
}

export function getLibraryCardAction(scope: LibraryScope, assetId: string) {
  if (scope === 'approvals') {
    return { href: `/library/${assetId}?mode=review`, label: 'Review' } as const;
  }
  return { href: `/library/${assetId}`, label: 'Use' } as const;
}

export function applyImportReview(
  state: ImportReviewState,
  result: { fileName: string; text: string },
): ImportReviewState {
  const suggestedTitle = result.fileName
    .replace(/\.[^.]+$/, '')
    .replaceAll(/[-_]+/g, ' ')
    .trim();
  return {
    body: result.text,
    title: state.title || suggestedTitle,
    import: { fileName: result.fileName, previousBody: state.body },
  };
}

export function undoImportReview(state: ImportReviewState): ImportReviewState {
  if (!state.import) return state;
  return { body: state.import.previousBody, title: state.title, import: null };
}

export function getAssetPrimaryAction(input: {
  kind: 'prompt' | 'playbook';
  mode: 'use' | 'review';
  reviewState: string;
  role?: WorkspaceRole;
}) {
  if (input.mode === 'use') {
    return {
      kind: 'copy',
      label: input.kind === 'prompt' ? 'Copy AI work' : 'Copy instructions',
    } as const;
  }
  const canCurate = input.role === 'owner' || input.role === 'admin' || input.role === 'curator';
  if (input.reviewState === 'shared' && canCurate) {
    return { kind: 'approve_team', label: 'Approve for team' } as const;
  }
  const canAdmin = input.role === 'owner' || input.role === 'admin';
  if (input.reviewState === 'team_approved' && canAdmin) {
    return { kind: 'approve_workspace', label: 'Approve workspace-wide' } as const;
  }
  return null;
}

export async function copyPromptWithGuard(input: {
  inputs: PromptCopyInput[];
  values: Record<string, string>;
  rendered: string;
  copyText: (text: string) => Promise<void>;
  focusInput: (key: string) => void;
}): Promise<PromptCopyResult> {
  const missing = input.inputs.find(
    (field) => field.required && !input.values[field.key]?.trim(),
  );
  if (missing) {
    input.focusInput(missing.key);
    return {
      status: 'missing_input',
      inputKey: missing.key,
      inputLabel: missing.label,
    };
  }
  if (UNRESOLVED_PROMPT_FIELD.test(input.rendered)) {
    return { status: 'unresolved_prompt' };
  }
  await input.copyText(input.rendered);
  return { status: 'copied' };
}

export function prepareApprovalSubmission(noteValue: string, modelsValue: string) {
  const note = noteValue.trim();
  if (note.length < 10) {
    return {
      ok: false,
      error: 'Add a reviewer note with at least 10 characters.',
    } as const;
  }
  const testedModels = modelsValue
    .split(',')
    .map((model) => model.trim())
    .filter((model, index, models) =>
      Boolean(model) &&
      models.findIndex((candidate) => candidate.toLowerCase() === model.toLowerCase()) === index,
    );
  return { ok: true, note, testedModels } as const;
}
