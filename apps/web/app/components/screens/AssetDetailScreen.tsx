'use client';

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { DescriptionSidePanel } from '@/app/components/work-library/DescriptionSidePanel';
import { MarkdownDescription } from '@/app/components/work-library/MarkdownDescription';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  EmptyState,
  PageIntro,
  Panel,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { buildWorkDescriptionPreview } from '@/lib/work-description';
import { renderPrompt } from '@/lib/work-library';
import {
  buildAssetExport,
  buildAssetZip,
  presentedAssetForExport,
  shouldRecordExportUse,
} from '@/lib/work-library-export';
import {
  activeTaxonomyTerms,
  copyPromptWithGuard,
  getActiveTaxonomyLabel,
  getAssetPrimaryAction,
  prepareApprovalSubmission,
  preparePrivateDraftMetadataUpdate,
} from '@/lib/work-library-ui';
import { RouteStatusScreen } from './RouteStatusScreen';

const inputClass =
  'min-h-12 w-full border border-[var(--line-strong)] bg-white px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]';

type PromptInput =
  | {
      key: string;
      label: string;
      required: boolean;
      kind: 'text' | 'long_text' | 'number' | 'boolean' | 'date' | 'file';
    }
  | {
      key: string;
      label: string;
      required: boolean;
      kind: 'select';
      options: string[];
    };

type PromptInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function PromptInputControl({
  input,
  invalid,
  value,
  onChange,
  register,
}: {
  input: PromptInput;
  invalid: boolean;
  value: string;
  onChange: (value: string) => void;
  register: (element: PromptInputElement | null) => void;
}): ReactNode {
  const shared = {
    'aria-invalid': invalid || undefined,
    'aria-required': input.required,
    className: inputClass,
    id: `prompt-input-${input.key}`,
    required: input.required,
  };
  if (input.kind === 'long_text') {
    return (
      <textarea
        {...shared}
        className={`${inputClass} min-h-32 py-3`}
        onChange={(event) => onChange(event.target.value)}
        ref={register}
        value={value}
      />
    );
  }
  if (input.kind === 'boolean') {
    return (
      <select {...shared} onChange={(event) => onChange(event.target.value)} ref={register} value={value}>
        <option value="">Choose yes or no</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (input.kind === 'select') {
    return (
      <select {...shared} onChange={(event) => onChange(event.target.value)} ref={register} value={value}>
        <option value="">Choose an option</option>
        {input.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  if (input.kind === 'file') {
    return (
      <input
        {...shared}
        onChange={(event) => onChange(event.target.files?.[0]?.name ?? '')}
        ref={register}
        type="file"
      />
    );
  }
  return (
    <input
      {...shared}
      onChange={(event) => onChange(event.target.value)}
      ref={register}
      type={input.kind}
      value={value}
    />
  );
}

function PromptInputField({
  input,
  invalid,
  value,
  onChange,
  register,
}: {
  input: PromptInput;
  invalid: boolean;
  value: string;
  onChange: (value: string) => void;
  register: (element: PromptInputElement | null) => void;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
      <span>
        {input.label}
        {input.required ? ' (required)' : ''}
      </span>
      <PromptInputControl
        input={input}
        invalid={invalid}
        onChange={onChange}
        register={register}
        value={value}
      />
      {invalid ? (
        <span className="block text-xs text-[var(--error-strong)]" role="alert">
          Enter {input.label} before copying.
        </span>
      ) : null}
    </label>
  );
}

function stateLabel(state: string): string {
  if (state === 'workspace_approved' || state === 'team_approved') return 'Approved';
  if (state === 'shared') return 'Shared for review';
  return titleCase(state);
}

function currentVersionTrustLabel(reviewState: string, hasApprovalEvidence: boolean): string {
  if (reviewState.includes('approved') && hasApprovalEvidence) return 'Approved';
  if (reviewState === 'draft') return 'Private draft';
  return stateLabel(reviewState);
}

function approvalScopeLabel(scope: string): string {
  return scope === 'workspace' ? 'Workspace approval' : 'Team approval';
}

function formatEvidenceDate(createdAt: number): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(createdAt);
}

function recordedReviewer(userId: string): string {
  if (userId.length <= 18) return userId;
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

export function friendlyAssetDetailError(error: unknown): string {
  void error;
  return 'Roster could not save these organization details. Your changes are still here. Try again.';
}

function downloadFile(filename: string, contents: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AssetDetailScreen({ assetId }: { assetId: string }) {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const asset = useQuery(
    api.workLibrary.getAsset,
    workspace.status === 'ready' ? { assetId: assetId as Id<'assets'> } : 'skip',
  );
  const taxonomyTerms = useQuery(
    api.workLibrary.listTaxonomyTerms,
    isAuthenticated && workspace.status === 'ready' ? {} : 'skip',
  );
  const shareAsset = useMutation(api.workLibrary.shareAsset);
  const approveAsset = useMutation(api.workLibrary.approveAsset);
  const toggleFavorite = useMutation(api.workLibrary.toggleFavorite);
  const addComment = useMutation(api.workLibrary.addComment);
  const recordAssetUse = useMutation(api.workLibrary.recordAssetUse);
  const saveVersion = useMutation(api.workLibrary.saveVersion);
  const updatePrivateDraftMetadata = useMutation(api.workLibrary.updatePrivateDraftMetadata);
  const inputRefs = useRef<Record<string, PromptInputElement | null>>({});
  const descriptionTriggerRef = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [testedModels, setTestedModels] = useState('');
  const [copyErrorKey, setCopyErrorKey] = useState<string | null>(null);
  const [actionState, setActionState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [metadataState, setMetadataState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [metadataMessage, setMetadataMessage] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const mode = searchParams.get('mode') === 'review' ? 'review' : 'use';
  const justSaved = searchParams.get('saved') === '1';
  const workingVersion = asset?.pendingVersion ?? asset;
  const presentedVersion = mode === 'review' ? workingVersion : asset;
  const presentedIsPending = Boolean(
    mode === 'review' && asset?.pendingVersion && presentedVersion === asset.pendingVersion,
  );
  const presentedBody = presentedVersion?.body ?? '';
  const presentedInputs = presentedVersion?.inputs ?? [];
  const rendered = useMemo(
    () => renderPrompt(presentedBody, values),
    [presentedBody, values],
  );
  const approvalSubmission = prepareApprovalSubmission(approvalNote, testedModels);
  const teamLabel = getActiveTaxonomyLabel(taxonomyTerms, 'team', asset?.teamKey);
  const jobLabel = getActiveTaxonomyLabel(taxonomyTerms, 'work_type', asset?.jobKey);
  const teams = activeTaxonomyTerms(taxonomyTerms, 'team');
  const workTypes = activeTaxonomyTerms(taxonomyTerms, 'work_type');
  const assetDisplayKind = asset?.kind === 'playbook' ? 'Playbook' : 'AI work';
  const assetSentenceKind = asset?.kind === 'playbook' ? 'playbook' : 'AI work';
  const descriptionPreview = useMemo(
    () => buildWorkDescriptionPreview(asset?.purpose, 150),
    [asset?.purpose],
  );

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Your signed-in workspace is connecting. The saved version will appear on this page when it is ready."
          eyebrow="Library"
          title="Preparing this work"
        />
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (workspace.status === 'error') {
    return (
      <div className="space-y-4">
        <SurfaceNotice
          description="Roster could not verify your workspace access. Reload and try again."
          title="This workspace is unavailable"
          tone="error"
        />
        {workspace.retry ? (
          <ActionButton onClick={workspace.retry} tone="primary">
            Reload workspace
          </ActionButton>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname={`/library/${assetId}`}
      />
    );
  }

  async function copyRenderedPrompt() {
    if (!asset) return;
    try {
      const result = await copyPromptWithGuard({
        inputs: presentedInputs,
        values,
        rendered,
        copyText: (text) => navigator.clipboard.writeText(text),
        focusInput: (key) => inputRefs.current[key]?.focus(),
      });
      if (result.status === 'missing_input') {
        setCopyErrorKey(result.inputKey);
        setActionState('error');
        setMessage(`Enter ${result.inputLabel} before copying. Nothing was copied.`);
        return;
      }
      if (result.status === 'unresolved_prompt') {
        setCopyErrorKey(null);
        setActionState('error');
        setMessage(`This ${assetSentenceKind} still has an unresolved field. Nothing was copied.`);
        return;
      }
      setCopyErrorKey(null);
      void recordAssetUse({ assetId: assetId as Id<'assets'>, source: 'copy' }).catch(
        () => undefined,
      );
      setActionState('done');
      setMessage(`The exact rendered ${assetSentenceKind} is on your clipboard.`);
    } catch {
      setActionState('error');
      setMessage(`Clipboard access was blocked. Select the ${assetSentenceKind} text and copy it manually.`);
    }
  }

  async function shareForReview() {
    setActionState('working');
    try {
      await shareAsset({ assetId: assetId as Id<'assets'>, visibility: 'team' });
      setActionState('done');
      setMessage('This version is now shared with the team and ready for curator review.');
    } catch {
      setActionState('error');
      setMessage('Roster could not share this work. Your draft is unchanged. Try again.');
    }
  }

  async function approve(scope: 'team' | 'workspace') {
    const submission = prepareApprovalSubmission(approvalNote, testedModels);
    if (!submission.ok) {
      setActionState('error');
      setMessage(submission.error);
      return;
    }
    setActionState('working');
    try {
      await approveAsset({
        assetId: assetId as Id<'assets'>,
        expectedVersionNumber: presentedVersionNumber,
        scope,
        note: submission.note,
        testedModels: submission.testedModels,
      });
      setApprovalNote('');
      setTestedModels('');
      setActionState('done');
      setMessage(scope === 'team' ? 'Team approval recorded.' : 'Workspace approval recorded.');
    } catch {
      setActionState('error');
      setMessage('Roster could not record this approval. Nothing was changed. Try again.');
    }
  }

  async function saveFavorite() {
    setActionState('working');
    try {
      const result = await toggleFavorite({ assetId: assetId as Id<'assets'> });
      setActionState('done');
      setMessage(result.isFavorite ? 'Saved to your favorites.' : 'Removed from your favorites.');
    } catch {
      setActionState('error');
      setMessage('Roster could not update your favorite. Try again.');
    }
  }

  async function submitComment() {
    if (!comment.trim()) return;
    setActionState('working');
    try {
      await addComment({
        assetId: assetId as Id<'assets'>,
        body: comment,
        presentedVersionNumber,
      });
      setComment('');
      setActionState('done');
      setMessage(`Feedback is linked to version ${presentedVersionNumber}.`);
    } catch {
      setActionState('error');
      setMessage('Roster could not save your feedback. Your note is still here. Try again.');
    }
  }

  async function saveEditedPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get('body') ?? '');
    const changeNote = String(data.get('changeNote') ?? '').trim();
    if (!body.trim() || !changeNote) {
      setActionState('error');
      setMessage(`Add ${assetSentenceKind} text and a change note before saving a new version.`);
      return;
    }
    setActionState('working');
    try {
      const result = await saveVersion({
        assetId: assetId as Id<'assets'>,
        body,
        changeNote,
      });
      setActionState('done');
      setMessage(
        `Version ${result.versionNumber} is saved as a new draft. Re-review is required before it is approved for use.`,
      );
    } catch {
      setActionState('error');
      setMessage('Roster could not save a new version. Your edits are still here. Try again.');
    }
  }

  async function updateDraftOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset) return;
    const data = new FormData(event.currentTarget);
    const payload = preparePrivateDraftMetadataUpdate({
      assetId: assetId as Id<'assets'>,
      current: {
        title: asset.title,
        purpose: asset.purpose,
        teamKey: asset.teamKey,
        jobKey: asset.jobKey,
      },
      next: {
        title: String(data.get('title') ?? ''),
        purpose: String(data.get('purpose') ?? ''),
        teamKey: String(data.get('teamKey') ?? ''),
        jobKey: String(data.get('jobKey') ?? ''),
      },
    });
    if (Object.keys(payload).length === 1) {
      setMetadataState('done');
      setMetadataMessage('These organization details are already up to date.');
      return;
    }
    setMetadataState('working');
    setMetadataMessage(null);
    try {
      await updatePrivateDraftMetadata(payload);
      setMetadataState('done');
      setMetadataMessage('Your private draft organization is saved.');
    } catch (error) {
      setMetadataState('error');
      setMetadataMessage(friendlyAssetDetailError(error));
    }
  }

  function exportAsset(format: 'markdown' | 'json' | 'zip') {
    if (!asset) return;
    const exportTarget = presentedAssetForExport(asset, {
      body: presentedBody,
      inputs: presentedInputs,
      reviewState: presentedReviewState,
      versionNumber: presentedVersionNumber,
    });
    const taxonomyLabels = {
      team: asset.teamKey && !teamLabel ? null : teamLabel,
      job: asset.jobKey && !jobLabel ? null : jobLabel,
    };
    const exported = buildAssetExport(exportTarget, taxonomyLabels);
    if (format === 'markdown') {
      downloadFile(`${exported.fileBase}.md`, exported.markdown, 'text/markdown;charset=utf-8');
    } else if (format === 'json') {
      downloadFile(`${exported.fileBase}.json`, exported.json, 'application/json;charset=utf-8');
    } else {
      const browserOwnedBytes = Uint8Array.from(buildAssetZip(exportTarget, taxonomyLabels));
      downloadFile(`${exported.fileBase}.zip`, browserOwnedBytes, 'application/zip');
    }
    if (shouldRecordExportUse(mode)) {
      void recordAssetUse({ assetId: assetId as Id<'assets'>, source: 'export' }).catch(
        () => undefined,
      );
    }
    setActionState('done');
    setMessage(`Version ${presentedVersionNumber} is ready in an open format.`);
  }

  if (asset === undefined || (asset !== null && taxonomyTerms === undefined)) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Roster is loading the saved version and its trust record."
          eyebrow="Library"
          title="Preparing this work"
        />
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (asset === null) {
    return (
      <EmptyState
        action={<ActionButton href="/library">Return to Library</ActionButton>}
        description="It may be private to another workspace, archived, or no longer available."
        title="This work is not available"
      />
    );
  }

  const isReview = mode === 'review';
  const presentedReviewState = presentedVersion?.reviewState ?? asset.reviewState;
  const presentedVersionNumber = presentedVersion?.versionNumber ?? asset.versionNumber;
  const workingReviewState = workingVersion?.reviewState ?? asset.reviewState;
  const workingVersionNumber = workingVersion?.versionNumber ?? asset.versionNumber;
  const primaryAction = getAssetPrimaryAction({
    kind: asset.kind,
    mode,
    reviewState: presentedReviewState,
    role: workspace.role,
  });
  const approvalScope =
    primaryAction?.kind === 'approve_team'
      ? 'team'
      : primaryAction?.kind === 'approve_workspace'
        ? 'workspace'
        : null;
  const canEdit = asset.canEdit;
  const hasFullDescription = Boolean(
    asset.purpose
      && (descriptionPreview.hasMore || descriptionPreview.summary !== asset.purpose.trim()),
  );
  const pageDescription = isReview
    ? descriptionPreview.summary
      ? `${asset.title}: ${descriptionPreview.summary}`
      : asset.title
    : descriptionPreview.summary || `${assetDisplayKind} saved exactly as written.`;
  const pageEyebrow = isReview
    ? `Approval review · Version ${presentedVersionNumber}`
    : teamLabel
      ? `${assetDisplayKind} · ${teamLabel}`
      : assetDisplayKind;
  const canOrganize =
    canEdit && asset.visibility === 'private' && asset.reviewState === 'draft';
  const presentedApprovals = asset.approvals.filter(
    (approval) => approval.versionNumber === presentedVersionNumber,
  );
  const humanDecision = presentedReviewState.includes('approved')
    ? 'Confirm the inputs and use the approved version'
    : isReview
      ? 'Reviewer decides whether this version is ready'
      : 'Review is required before trusted team use';
  const evidenceStatus = presentedApprovals.length
    ? `${presentedApprovals.length} version-specific approval ${presentedApprovals.length === 1 ? 'record' : 'records'}`
    : !presentedIsPending && asset.lastVerifiedAt
      ? `Verified ${formatRelativeDate(asset.lastVerifiedAt)}`
      : 'In preparation';

  function runPrimaryAction() {
    if (primaryAction?.kind === 'copy') void copyRenderedPrompt();
  }

  function updateInputValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (copyErrorKey === key && value.trim()) setCopyErrorKey(null);
  }

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <>
            {hasFullDescription ? (
              <button
                className="min-h-11 border border-[var(--line)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--panel-soft)]"
                onClick={() => setDescriptionOpen(true)}
                ref={(element) => {
                  descriptionTriggerRef.current = element;
                }}
                type="button"
              >
                Read full description
              </button>
            ) : null}
            <ActionButton href={isReview ? '/approvals' : '/library'} tone="ghost">
              {isReview ? 'Back to approvals' : 'Back to Library'}
            </ActionButton>
          </>
        }
        description={(
          <span className={`${hasFullDescription ? 'line-clamp-3 ' : ''}[overflow-wrap:anywhere]`}>
            {pageDescription}
          </span>
        )}
        eyebrow={pageEyebrow}
        title={isReview ? 'Review before the team trusts it' : asset.title}
      />

      <DescriptionSidePanel
        onClose={() => setDescriptionOpen(false)}
        open={descriptionOpen}
        returnFocusRef={descriptionTriggerRef}
        title="About this work"
      >
        <MarkdownDescription markdown={asset.purpose ?? ''} />
      </DescriptionSidePanel>

      {justSaved && canOrganize ? (
        <SurfaceNotice
          description="This is a private draft. Organize it now or share it when ready."
          live
          title="Saved to My Work"
          tone="success"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge tone={presentedReviewState.includes('approved') ? 'strategy' : 'default'}>
          {stateLabel(presentedReviewState)}
        </Badge>
        {jobLabel ? <Badge tone="default">{jobLabel}</Badge> : null}
        <Badge tone="default">Version {presentedVersionNumber}</Badge>
        <Badge tone={!presentedIsPending && asset.lastVerifiedAt ? 'info' : 'warning'}>
          {!presentedIsPending && asset.lastVerifiedAt
            ? `Verified ${formatRelativeDate(asset.lastVerifiedAt)}`
            : 'Not yet verified'}
        </Badge>
        {!isReview ? (
          <button
            aria-pressed={asset.isFavorite}
            className="min-h-8 border border-[var(--line)] bg-[var(--panel-soft)] px-3 text-xs font-semibold text-[var(--ink)]"
            onClick={saveFavorite}
            type="button"
          >
            {asset.isFavorite ? '★ Saved' : '☆ Save to favorites'}
          </button>
        ) : null}
      </div>

      <aside aria-labelledby="governance-title" className="grid border border-[var(--line)] bg-[var(--panel)] lg:grid-cols-[16rem_repeat(4,minmax(0,1fr))]">
        <div className="border-l-4 border-[var(--accent)] bg-[var(--panel-strong)] p-5 text-white">
          <p className="font-brand-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--maslow-color-dark-text)]">Trust record</p>
          <h2 className="mt-2 font-heading text-xl font-semibold" id="governance-title">Governance</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--maslow-color-dark-text)]">Version {presentedVersionNumber} only</p>
        </div>
        <div className="border-t border-[var(--line)] p-4 lg:border-l lg:border-t-0">
          <p className="font-brand-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Owner</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--ink)]">{asset.ownerUserId ? 'Workspace member assigned' : 'Not assigned'}</p>
        </div>
        <div className="border-t border-[var(--line)] p-4 lg:border-l lg:border-t-0">
          <p className="font-brand-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Human decision</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--ink)]">{humanDecision}</p>
        </div>
        <div className="border-t border-[var(--line)] p-4 lg:border-l lg:border-t-0">
          <p className="font-brand-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Evidence</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--ink)]">{evidenceStatus}</p>
        </div>
        <div className="border-t border-[var(--line)] p-4 lg:border-l lg:border-t-0">
          <p className="font-brand-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">Approval</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--ink)]">{presentedApprovals.length ? 'Recorded for this version' : stateLabel(presentedReviewState)}</p>
        </div>
      </aside>

      {message ? (
        <SurfaceNotice
          description={message}
          live
          title={actionState === 'error' ? 'Action needs attention' : 'Roster is up to date'}
          tone={actionState === 'error' ? 'error' : 'success'}
        />
      ) : null}

      <div className="mx-auto max-w-4xl space-y-5">
        {!isReview && asset.pendingVersion ? (
          <SurfaceNotice
            description={`Version ${asset.versionNumber} remains the trusted copy while version ${asset.pendingVersion.versionNumber} is ${stateLabel(asset.pendingVersion.reviewState).toLowerCase()}.`}
            title="A replacement is moving through review"
            tone="info"
          />
        ) : null}
        <Panel
          subtitle={
            isReview
              ? 'Confirm the purpose, exact saved text, and version before approving it.'
              : `Fill only the details this saved ${assetSentenceKind} needs, then copy it into your AI tool.`
          }
          title={isReview ? 'Review this version' : 'Add the details'}
          tone="strategy"
        >
          {isReview ? (
            <div className="space-y-5">
              <dl className="grid gap-4 border-b border-[var(--line)] pb-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{assetDisplayKind}</dt>
                  <dd className="mt-2 font-semibold text-[var(--ink)]">{asset.title}</dd>
                </div>
                {descriptionPreview.summary ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Outcome</dt>
                    <dd className={`mt-2 text-sm leading-6 text-[var(--ink-soft)] [overflow-wrap:anywhere] ${hasFullDescription ? 'line-clamp-3' : ''}`}>
                      {descriptionPreview.summary}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Approval applies only to version {presentedVersionNumber}. Future edits return to draft without erasing this decision.
              </p>
              {approvalScope && primaryAction ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void approve(approvalScope);
                  }}
                >
                  <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                    Reviewer note
                    <textarea
                      aria-describedby="reviewer-note-help"
                      className={`${inputClass} min-h-28 py-3`}
                      minLength={10}
                      onChange={(event) => setApprovalNote(event.target.value)}
                      placeholder="What did you check, and why is this version ready?"
                      required
                      value={approvalNote}
                    />
                  </label>
                  <p className="text-xs leading-5 text-[var(--muted)]" id="reviewer-note-help">
                    Record specific review evidence in at least 10 characters.
                  </p>
                  <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                    Models tested (optional)
                    <input
                      className={inputClass}
                      onChange={(event) => setTestedModels(event.target.value)}
                      placeholder="GPT-5, Claude Sonnet"
                      value={testedModels}
                    />
                  </label>
                  <button
                    className="min-h-12 bg-[var(--button-primary)] px-5 text-sm font-semibold text-[var(--button-primary-ink)] disabled:opacity-60"
                    disabled={!approvalSubmission.ok || actionState === 'working'}
                    type="submit"
                  >
                    {primaryAction.label}
                  </button>
                </form>
              ) : (
                <SurfaceNotice
                  description="This item no longer needs an approval available to your role. Its saved evidence remains below."
                  title="No review action is waiting"
                  tone="info"
                />
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {presentedInputs.length ? (
                <div className="space-y-4">
                  {presentedInputs.map((input) => (
                    <PromptInputField
                      input={input}
                      invalid={copyErrorKey === input.key}
                      key={input.key}
                      onChange={(value) => updateInputValue(input.key, value)}
                      register={(element) => {
                        inputRefs.current[input.key] = element;
                      }}
                      value={values[input.key] ?? ''}
                    />
                  ))}
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Required fields must be complete before anything is copied.
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  This {assetSentenceKind} is ready as saved. No details need to be filled in.
                </p>
              )}
              <div className="border-t border-[var(--line)] pt-5">
                <button
                  className="min-h-12 bg-[var(--button-primary)] px-5 text-sm font-semibold text-[var(--button-primary-ink)]"
                  onClick={runPrimaryAction}
                  type="button"
                >
                  {asset.kind === 'prompt' ? 'Copy AI work' : 'Copy instructions'}
                </button>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Paste it into ChatGPT, Claude, Gemini, Copilot, or Codex. Roster does not rewrite it behind the scenes.
                </p>
              </div>
            </div>
          )}
        </Panel>

        {canOrganize && taxonomyTerms !== undefined ? (
          <Panel
            subtitle="These details help you find this private draft. They do not change the saved AI text or approve it."
            title="Organize this draft"
            tone="tech"
          >
            <div className="space-y-5">
              {metadataMessage ? (
                <SurfaceNotice
                  description={metadataMessage}
                  live
                  title={
                    metadataState === 'error'
                      ? 'Organization changes need attention'
                      : 'Draft organization updated'
                  }
                  tone={metadataState === 'error' ? 'error' : 'success'}
                />
              ) : null}
              <form
                aria-label="Organize this draft"
                className="space-y-5"
                key={`organize-${asset.updatedAt}`}
                onSubmit={(event) => void updateDraftOrganization(event)}
              >
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                  Name (optional)
                  <input
                    className={inputClass}
                    defaultValue={asset.title}
                    maxLength={160}
                    name="title"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                  Description (optional)
                  <textarea
                    aria-describedby="draft-description-limit"
                    className={`${inputClass} min-h-28 resize-y py-3`}
                    defaultValue={asset.purpose ?? ''}
                    maxLength={20_000}
                    name="purpose"
                  />
                  <span
                    className="block text-xs font-normal text-[var(--muted)]"
                    id="draft-description-limit"
                  >
                    Markdown is supported. Roster shows a short preview and keeps the full description available when someone needs it.
                    <span className="mt-1 block">Up to 20,000 characters.</span>
                  </span>
                </label>
                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <label className="min-w-0 space-y-2 text-sm font-medium text-[var(--ink)]">
                    Team
                    <select
                      className={inputClass}
                      defaultValue={teamLabel ? asset.teamKey ?? '' : ''}
                      name="teamKey"
                    >
                      <option value="">No selection</option>
                      {teams.map((term) => (
                        <option key={term.key} value={term.key}>{term.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0 space-y-2 text-sm font-medium text-[var(--ink)]">
                    Work type
                    <select
                      className={inputClass}
                      defaultValue={jobLabel ? asset.jobKey ?? '' : ''}
                      name="jobKey"
                    >
                      <option value="">No selection</option>
                      {workTypes.map((term) => (
                        <option key={term.key} value={term.key}>{term.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  className="min-h-11 bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)] disabled:opacity-60"
                  disabled={metadataState === 'working'}
                  type="submit"
                >
                  {metadataState === 'working' ? 'Saving organization…' : 'Save organization'}
                </button>
              </form>
            </div>
          </Panel>
        ) : null}

        {!isReview && canEdit && workingReviewState === 'draft' ? (
          <SurfaceNotice
            action={
              <button
                className="min-h-11 bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)] disabled:opacity-60"
                disabled={actionState === 'working'}
                onClick={() => void shareForReview()}
                type="button"
              >
                Share for review
              </button>
            }
            description="Sharing sends this exact version to a curator. It does not approve or publish it automatically."
            title="Ready for a teammate to review it?"
            tone="info"
          />
        ) : null}

        <details className="border border-[var(--line)] bg-white" open={isReview}>
          <summary className="min-h-14 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)]">
            View exact {assetDisplayKind}
          </summary>
          <div className="border-t border-[var(--line)] p-5">
            <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
              Only the fields you fill are substituted. The surrounding saved text stays exact.
            </p>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border border-[var(--line)] bg-[var(--panel-soft)] p-5 font-mono text-sm leading-7 text-[var(--ink)]">
              {rendered}
            </pre>
          </div>
        </details>

        {canEdit ? (
          <details className="border border-[var(--line)] bg-white">
            <summary className="min-h-14 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)]">
              Edit current {assetDisplayKind}
            </summary>
            <div className="border-t border-[var(--line)] p-5">
              <p className="text-sm leading-6 text-[var(--muted)]">
                Saving creates a new immutable draft version. Re-review is required before the new
                version can be approved for use.
              </p>
              <form
                className="mt-5 space-y-4"
                key={`edit-version-${workingVersionNumber}`}
                onSubmit={(event) => void saveEditedPrompt(event)}
              >
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                  {assetDisplayKind} text
                  <textarea
                    className={`${inputClass} min-h-56 py-3 font-mono leading-6`}
                    defaultValue={workingVersion?.body ?? asset.body}
                    name="body"
                    required
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                  Change note
                  <input
                    className={inputClass}
                    name="changeNote"
                    placeholder="What changed in this version?"
                    required
                  />
                </label>
                <button
                  className="min-h-11 bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)] disabled:opacity-60"
                  disabled={actionState === 'working'}
                  type="submit"
                >
                  Save new draft version
                </button>
              </form>
            </div>
          </details>
        ) : null}

        <details className="border border-[var(--line)] bg-white" open={isReview}>
          <summary className="min-h-14 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)]">
            Version history and approvals
          </summary>
          <div className="space-y-3 border-t border-[var(--line)] p-5">
            {asset.versions.map((version) => {
              const approvals = asset.approvals.filter(
                (approval) => approval.versionNumber === version.versionNumber,
              );
              return (
                <div
                  className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4"
                  key={version.versionNumber}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[var(--ink)]">Version {version.versionNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {asset.pendingVersion?.versionNumber === version.versionNumber
                          ? `${stateLabel(asset.pendingVersion.reviewState)} replacement`
                          : version.versionNumber === asset.versionNumber
                            ? currentVersionTrustLabel(asset.reviewState, approvals.length > 0)
                          : 'Prior immutable version'}
                      </p>
                    </div>
                    <Badge tone={approvals.length ? 'strategy' : 'default'}>
                      {approvals.length ? 'Approved evidence' : 'No approval'}
                    </Badge>
                  </div>
                  {approvals.length ? (
                    <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                      {approvals.map((approval) => (
                        <div className="border border-[var(--line)] bg-white p-4" key={approval.scope}>
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {approvalScopeLabel(approval.scope)}
                          </p>
                          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-xs text-[var(--muted)]">Recorded reviewer</dt>
                              <dd className="mt-1 text-[var(--ink-soft)]">
                                {recordedReviewer(approval.reviewerUserId)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-[var(--muted)]">Date</dt>
                              <dd className="mt-1 text-[var(--ink-soft)]">
                                {formatEvidenceDate(approval.createdAt)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-[var(--muted)]">Reviewer note</dt>
                              <dd className="mt-1 leading-6 text-[var(--ink-soft)]">{approval.note}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-[var(--muted)]">Tested models</dt>
                              <dd className="mt-1 text-[var(--ink-soft)]">
                                {approval.testedModels.length
                                  ? approval.testedModels.join(', ')
                                  : 'Not recorded'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>

        <details className="border border-[var(--line)] bg-white">
          <summary className="min-h-14 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)]">
            Exports and feedback
          </summary>
          <div className="space-y-6 border-t border-[var(--line)] p-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Keep an open copy</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Export this canonical version in an open format on any plan.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="min-h-11 border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]" onClick={() => exportAsset('markdown')} type="button">Markdown</button>
                <button className="min-h-11 border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]" onClick={() => exportAsset('json')} type="button">JSON</button>
                <button className="min-h-11 bg-[var(--ink)] px-4 text-sm font-semibold text-white" onClick={() => exportAsset('zip')} type="button">Download ZIP</button>
              </div>
            </div>

            <div className="border-t border-[var(--line)] pt-5">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Worked or needs improvement?</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Feedback stays attached to version {presentedVersionNumber}.
              </p>
              <label className="mt-4 block space-y-2 text-sm font-medium text-[var(--ink)]">
                Add a version-linked note
                <textarea className={`${inputClass} min-h-24 py-3`} onChange={(event) => setComment(event.target.value)} placeholder="What worked, or what should improve?" value={comment} />
              </label>
              <button className="mt-3 min-h-11 border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-60" disabled={!comment.trim() || actionState === 'working'} onClick={() => void submitComment()} type="button">Save feedback</button>
              {asset.comments.length ? (
                <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
                  {asset.comments.map((entry, index) => (
                    <div className="bg-[var(--panel-soft)] p-3" key={`${entry.versionNumber}-${index}`}>
                      <p className="text-sm leading-6 text-[var(--ink-soft)]">{entry.body}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">Version {entry.versionNumber}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
