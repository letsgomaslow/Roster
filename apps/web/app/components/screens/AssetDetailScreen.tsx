'use client';

import { useMemo, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
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
import { renderPrompt } from '@/lib/work-library';
import { buildAssetExport, buildAssetZip } from '@/lib/work-library-export';
import { RouteStatusScreen } from './RouteStatusScreen';

const inputClass =
  'min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]';

function stateLabel(state: string): string {
  if (state === 'workspace_approved') return 'Workspace approved';
  if (state === 'team_approved') return 'Team approved';
  if (state === 'shared') return 'Shared for review';
  return titleCase(state);
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
  const { isAuthenticated } = useConvexAuth();
  const workspace = useWorkspace();
  const asset = useQuery(
    api.workLibrary.getAsset,
    workspace.status === 'ready' ? { assetId: assetId as Id<'assets'> } : 'skip',
  );
  const shareAsset = useMutation(api.workLibrary.shareAsset);
  const approveAsset = useMutation(api.workLibrary.approveAsset);
  const toggleFavorite = useMutation(api.workLibrary.toggleFavorite);
  const addComment = useMutation(api.workLibrary.addComment);
  const recordAssetUse = useMutation(api.workLibrary.recordAssetUse);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [actionState, setActionState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const rendered = useMemo(() => (asset ? renderPrompt(asset.body, values) : ''), [asset, values]);

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
    try {
      await navigator.clipboard.writeText(rendered);
      void recordAssetUse({ assetId: assetId as Id<'assets'>, source: 'copy' }).catch(
        () => undefined,
      );
      setActionState('done');
      setMessage('The exact rendered prompt is on your clipboard.');
    } catch {
      setActionState('error');
      setMessage('Clipboard access was blocked. Select the prompt text and copy it manually.');
    }
  }

  async function shareForReview() {
    setActionState('working');
    try {
      await shareAsset({ assetId: assetId as Id<'assets'>, visibility: 'team' });
      setActionState('done');
      setMessage('This version is now shared with the team and ready for curator review.');
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not share this work.');
    }
  }

  async function approve(scope: 'team' | 'workspace') {
    setActionState('working');
    try {
      await approveAsset({
        assetId: assetId as Id<'assets'>,
        scope,
        note: scope === 'team' ? 'Approved for team use.' : 'Approved as a workspace standard.',
      });
      setActionState('done');
      setMessage(scope === 'team' ? 'Team approval recorded.' : 'Workspace approval recorded.');
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not record approval.');
    }
  }

  async function saveFavorite() {
    setActionState('working');
    try {
      const result = await toggleFavorite({ assetId: assetId as Id<'assets'> });
      setActionState('done');
      setMessage(result.isFavorite ? 'Saved to your favorites.' : 'Removed from your favorites.');
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not update your favorite.');
    }
  }

  async function submitComment() {
    if (!comment.trim()) return;
    setActionState('working');
    try {
      await addComment({ assetId: assetId as Id<'assets'>, body: comment });
      setComment('');
      setActionState('done');
      setMessage(`Feedback is linked to version ${asset?.versionNumber ?? ''}.`);
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not save your feedback.');
    }
  }

  function exportAsset(format: 'markdown' | 'json' | 'zip') {
    if (!asset) return;
    const exported = buildAssetExport(asset);
    if (format === 'markdown') {
      downloadFile(`${exported.fileBase}.md`, exported.markdown, 'text/markdown;charset=utf-8');
    } else if (format === 'json') {
      downloadFile(`${exported.fileBase}.json`, exported.json, 'application/json;charset=utf-8');
    } else {
      const browserOwnedBytes = Uint8Array.from(buildAssetZip(asset));
      downloadFile(`${exported.fileBase}.zip`, browserOwnedBytes, 'application/zip');
    }
    void recordAssetUse({ assetId: assetId as Id<'assets'>, source: 'export' }).catch(
      () => undefined,
    );
    setActionState('done');
    setMessage('Your open-format export is ready.');
  }

  if (workspace.status === 'error') {
    return (
      <SurfaceNotice
        description={workspace.error ?? 'Ask a workspace admin to check the organization setup.'}
        title="This workspace is unavailable"
        tone="error"
      />
    );
  }

  if (asset === undefined) {
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

  const canCurate =
    workspace.role === 'owner' || workspace.role === 'admin' || workspace.role === 'curator';
  const canAdmin = workspace.role === 'owner' || workspace.role === 'admin';

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <ActionButton href="/library" tone="ghost">
            Back to Library
          </ActionButton>
        }
        description={asset.purpose}
        eyebrow={`${titleCase(asset.kind)} · ${titleCase(asset.teamKey)}`}
        title={asset.title}
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={asset.reviewState.includes('approved') ? 'strategy' : 'default'}>
          {stateLabel(asset.reviewState)}
        </Badge>
        <Badge tone="default">{titleCase(asset.jobKey)}</Badge>
        <Badge tone="default">Version {asset.versionNumber}</Badge>
        <Badge tone={asset.lastVerifiedAt ? 'info' : 'warning'}>
          {asset.lastVerifiedAt
            ? `Verified ${formatRelativeDate(asset.lastVerifiedAt)}`
            : 'Not verified yet'}
        </Badge>
        <button
          aria-pressed={asset.isFavorite}
          className="min-h-8 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 text-xs font-semibold text-[var(--ink)]"
          onClick={saveFavorite}
          type="button"
        >
          {asset.isFavorite ? '★ Saved' : '☆ Save to favorites'}
        </button>
      </div>

      {message ? (
        <SurfaceNotice
          description={message}
          title={actionState === 'error' ? 'Action needs attention' : 'Roster is up to date'}
          tone={actionState === 'error' ? 'error' : 'success'}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <Panel
            subtitle="Fill only the details this saved work needs."
            title="1. Add your inputs"
            tone="strategy"
          >
            {asset.inputs.length ? (
              <div className="space-y-4">
                {asset.inputs.map((input) => (
                  <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" key={input.key}>
                    {input.label}
                    {input.kind === 'long_text' ? (
                      <textarea
                        className={`${inputClass} min-h-32 py-3`}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [input.key]: event.target.value }))
                        }
                        required={input.required}
                        value={values[input.key] ?? ''}
                      />
                    ) : (
                      <input
                        className={inputClass}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [input.key]: event.target.value }))
                        }
                        required={input.required}
                        value={values[input.key] ?? ''}
                      />
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <EmptyState
                description="This work is ready to use as saved. No fill-in fields were defined."
                title="No inputs needed"
              />
            )}
          </Panel>

          <Panel
            subtitle="Sharing never approves an item automatically."
            title="Team trust"
            tone="tech"
          >
            <div className="flex flex-wrap gap-3">
              {asset.reviewState === 'draft' ? (
                <button
                  className="min-h-11 rounded-full bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)]"
                  disabled={actionState === 'working'}
                  onClick={shareForReview}
                  type="button"
                >
                  Share for review
                </button>
              ) : null}
              {canCurate && asset.reviewState === 'shared' ? (
                <button
                  className="min-h-11 rounded-full bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)]"
                  disabled={actionState === 'working'}
                  onClick={() => approve('team')}
                  type="button"
                >
                  Approve for team
                </button>
              ) : null}
              {canAdmin && asset.reviewState === 'team_approved' ? (
                <button
                  className="min-h-11 rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white"
                  disabled={actionState === 'working'}
                  onClick={() => approve('workspace')}
                  type="button"
                >
                  Approve workspace-wide
                </button>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Approval applies to version {asset.versionNumber}. A later edit creates a new draft without deleting this evidence.
            </p>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            subtitle="Roster substitutes only the fields you filled. It does not compress or rewrite the saved prompt."
            title="2. Use the exact prompt"
            tone="tech"
          >
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-[22px] border border-[var(--line)] bg-white p-5 font-mono text-sm leading-7 text-[var(--ink)]">
              {rendered}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="min-h-12 rounded-full bg-[var(--button-primary)] px-5 text-sm font-semibold text-[var(--button-primary-ink)]"
                onClick={copyRenderedPrompt}
                type="button"
              >
                Copy exact prompt
              </button>
              <ActionButton href="/advanced" tone="ghost">Connected-tool instructions</ActionButton>
            </div>
          </Panel>

          <Panel subtitle="Every saved edit remains inspectable." title="Version history" tone="strategy">
            <div className="space-y-3">
              {asset.versions.map((version) => (
                <div
                  className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
                  key={version.versionNumber}
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">Version {version.versionNumber}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {version.versionNumber === asset.versionNumber ? 'Current draft' : 'Prior immutable version'}
                    </p>
                  </div>
                  {asset.approvals.some((approval) => approval.versionNumber === version.versionNumber) ? (
                    <Badge tone="strategy">Approved evidence</Badge>
                  ) : (
                    <Badge tone="default">No approval</Badge>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle={`Comments stay attached to version ${asset.versionNumber}, so later edits do not erase their context.`}
            title="Worked or needs improvement?"
            tone="tech"
          >
            <div className="space-y-3">
              <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                Add a version-linked note
                <textarea
                  className={`${inputClass} min-h-24 py-3`}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="What worked, or what should improve?"
                  value={comment}
                />
              </label>
              <button
                className="min-h-11 rounded-full border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
                disabled={!comment.trim() || actionState === 'working'}
                onClick={submitComment}
                type="button"
              >
                Save feedback
              </button>
              {asset.comments.length ? (
                <div className="space-y-2 border-t border-[var(--line)] pt-4">
                  {asset.comments.map((entry, index) => (
                    <div className="rounded-[18px] bg-[var(--panel-soft)] p-3" key={`${entry.versionNumber}-${index}`}>
                      <p className="text-sm leading-6 text-[var(--ink-soft)]">{entry.body}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">Version {entry.versionNumber}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel
            subtitle="Download this canonical version without locking it to Roster. Export is available on every plan."
            title="Keep an open copy"
            tone="strategy"
          >
            <div className="flex flex-wrap gap-3">
              <button
                className="min-h-11 rounded-full border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
                onClick={() => exportAsset('markdown')}
                type="button"
              >
                Markdown
              </button>
              <button
                className="min-h-11 rounded-full border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
                onClick={() => exportAsset('json')}
                type="button"
              >
                JSON
              </button>
              <button
                className="min-h-11 rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white"
                onClick={() => exportAsset('zip')}
                type="button"
              >
                Download ZIP
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
