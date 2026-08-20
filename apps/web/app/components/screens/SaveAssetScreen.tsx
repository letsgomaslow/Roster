'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  PageIntro,
  Panel,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { extractPromptInputs } from '@/lib/work-library';
import {
  applyImportReview,
  friendlyDraftError,
  NEW_TAXONOMY_SELECTION,
  prepareDraftPayload,
  savedAssetHref,
  taxonomyOptionValue,
  undoImportReview,
  type ImportReviewState,
} from '@/lib/work-library-ui';
import { RouteStatusScreen } from './RouteStatusScreen';

const fieldClass =
  'min-h-12 w-full border border-[var(--line-strong)] bg-white px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]';

type ImportNotice = {
  description: string;
  title: string;
  tone: 'error' | 'info';
};

export function SaveAssetScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const createDraft = useMutation(api.workLibrary.createDraft);
  const taxonomyTerms = useQuery(
    api.workLibrary.listTaxonomyTerms,
    isAuthenticated && workspace.status === 'ready' && workspace.role !== 'viewer'
      ? {}
      : 'skip',
  );
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [teamSelection, setTeamSelection] = useState('');
  const [teamLabel, setTeamLabel] = useState('');
  const [jobSelection, setJobSelection] = useState('');
  const [jobLabel, setJobLabel] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<ImportNotice | null>(null);
  const [importReview, setImportReview] = useState<ImportReviewState['import']>(null);
  const inputs = useMemo(() => extractPromptInputs(body), [body]);
  const teamTerms = taxonomyTerms?.filter((term) => term.kind === 'team') ?? [];
  const jobTerms = taxonomyTerms?.filter((term) => term.kind === 'work_type') ?? [];
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Your private workspace is connecting. The save form will appear here without moving you to another screen."
          eyebrow="Save new work"
          title="Preparing your private draft"
        />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (workspace.status === 'error') {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Roster needs a working team workspace before it can save private drafts."
          eyebrow="Save new work"
          title="Your workspace needs attention"
        />
        <SurfaceNotice
          description="Roster could not verify your workspace access. Reload and try again."
          title="Roster could not open this workspace"
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
        pathname="/library/new"
      />
    );
  }

  if (workspace.status !== 'ready') {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Roster is checking your workspace role before showing any authoring controls."
          eyebrow="Save new work"
          title="Preparing save access"
        />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (workspace.role === 'viewer') {
    return (
      <div className="space-y-8">
        <PageIntro
          actions={
            <ActionButton href="/library" tone="primary">
              Back to Library
            </ActionButton>
          }
          description="Viewers can browse and reuse trusted work without changing the team Library."
          eyebrow="Library access"
          title="Save access is role-based"
        />
        <SurfaceNotice
          description="Ask a workspace owner or admin if you need to create or change work. You can keep using everything already approved for your team."
          title="Your current role is view-only"
          tone="info"
        />
      </div>
    );
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportNotice({
      description: `Reading ${file.name} for your review…`,
      title: 'Preparing your import',
      tone: 'info',
    });
    const form = new FormData();
    form.set('file', file);
    try {
      const response = await fetch('/api/import/review', { method: 'POST', body: form });
      const result = (await response.json()) as {
        error?: string;
        fileName?: string;
        text?: string;
        warnings?: string[];
      };
      if (!response.ok || !result.text) throw new Error('Import failed');
      const next = applyImportReview(
        { body, title, import: importReview },
        { fileName: result.fileName ?? file.name, text: result.text },
      );
      setBody(next.body);
      setTitle(next.title);
      setImportReview(next.import);
      const warning = result.warnings?.length
        ? ' Roster found a formatting note, so review the extracted text before saving.'
        : '';
      setImportNotice({
        description: `${result.fileName ?? file.name} is ready for review. Nothing has been published.${warning}`,
        title: 'Review before saving',
        tone: 'info',
      });
    } catch {
      setImportNotice({
        description: 'Roster could not read this file. Try another supported file.',
        title: 'Import needs attention',
        tone: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  }

  function undoImport() {
    const next = undoImportReview({ body, title, import: importReview });
    setBody(next.body);
    setTitle(next.title);
    setImportReview(next.import);
    setImportNotice({
      description: 'Your previous AI text has been restored.',
      title: 'Import removed',
      tone: 'info',
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isImporting) {
      setSaveError('Wait for the import to finish, then save your work.');
      return;
    }
    if (workspace.status !== 'ready') {
      setSaveError('Roster is still preparing your workspace. Try again in a moment.');
      return;
    }
    if (
      (teamSelection === NEW_TAXONOMY_SELECTION && !teamLabel.trim()) ||
      (jobSelection === NEW_TAXONOMY_SELECTION && !jobLabel.trim())
    ) {
      setSaveError('Add a name for each new team or work type, then try again.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await createDraft(prepareDraftPayload({
        body,
        inputs,
        jobLabel,
        jobSelection,
        purpose,
        teamLabel,
        teamSelection,
        title,
      }));
      router.push(savedAssetHref(result.assetId));
    } catch (error) {
      setSaveError(friendlyDraftError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <ActionButton href="/library" tone="ghost">
            Back to Library
          </ActionButton>
        }
        description="Paste AI instructions that already help you. Roster saves the exact text privately so you can organize or share it later."
        eyebrow="Save new work"
        title="Save AI work"
      />

      <SurfaceNotice
        description="Only the AI text is required. Names, teams, work types, and fill-in fields can wait until they are useful."
        title="Start with what you already use"
        tone="info"
      />

      <form className="mx-auto max-w-3xl space-y-6" onSubmit={onSubmit}>
        <Panel
          subtitle="Roster keeps spacing, structure, and wording unchanged."
          title="Paste your AI work"
          tone="strategy"
        >
          <div className="space-y-5">
            <label
              className="block space-y-2 text-sm font-medium text-[var(--ink)]"
              htmlFor="ai-work-body"
            >
              Paste what you use in ChatGPT, Claude, Copilot, Gemini, or another AI tool.
              <textarea
                className={`${fieldClass} min-h-72 resize-y py-4 font-mono leading-7`}
                id="ai-work-body"
                maxLength={500_000}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Paste the exact instructions, prompt, or reusable AI text here."
                required
                value={body}
              />
            </label>

            <div className="border border-dashed border-[var(--line-strong)] bg-[var(--panel-soft)] p-4">
              <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="prompt-file">
                Or import a file for review
              </label>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                TXT, Markdown, DOCX, and PDF are extracted into this private review screen. Roster never publishes an import automatically.
              </p>
              <input
                accept=".txt,.md,.docx,.pdf,text/plain,text/markdown"
                className="mt-3 block w-full text-sm text-[var(--ink)] file:mr-3 file:min-h-11 file:border file:border-[var(--line)] file:bg-white file:px-4 file:text-sm file:font-medium"
                disabled={isImporting}
                id="prompt-file"
                onChange={onFileSelected}
                type="file"
              />
            </div>
          </div>
        </Panel>

        {importNotice ? (
          <SurfaceNotice
            action={
              importReview && importNotice.tone !== 'error' ? (
                <button
                  className="min-h-11 border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
                  onClick={undoImport}
                  type="button"
                >
                  Undo import
                </button>
              ) : undefined
            }
            description={importNotice.description}
            live
            title={importNotice.title}
            tone={importNotice.tone}
          />
        ) : null}

        <details className="border border-[var(--line)] bg-white">
          <summary className="min-h-12 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--focus-ring-solid)] focus-visible:outline-offset-2">
            Organize it (optional)
          </summary>
          <div className="space-y-5 border-t border-[var(--line)] px-5 py-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Add details that help you and your teammates find this work. You can change them later.
            </p>
            <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-title">
              Name
              <input
                className={fieldClass}
                id="ai-work-title"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-purpose">
              Description
              <textarea
                aria-describedby="ai-work-purpose-limit"
                className={`${fieldClass} min-h-28 resize-y py-3`}
                id="ai-work-purpose"
                maxLength={20_000}
                onChange={(event) => setPurpose(event.target.value)}
                value={purpose}
              />
              <span className="block text-xs font-normal text-[var(--muted)]" id="ai-work-purpose-limit">
                Markdown is supported. Roster shows a short preview and keeps the full description available when someone needs it.
                <span className="mt-1 block">
                  {purpose.length.toLocaleString('en-US')} / 20,000 characters
                </span>
              </span>
            </label>
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <div className="min-w-0 space-y-3">
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-team">
                  Team
                  <select
                    className={fieldClass}
                    id="ai-work-team"
                    onChange={(event) => setTeamSelection(event.target.value)}
                    value={teamSelection}
                  >
                    <option value="">No selection</option>
                    {teamTerms.map((term) => (
                      <option key={term.termId} value={taxonomyOptionValue(term.key)}>
                        {term.label}
                      </option>
                    ))}
                    <option value={NEW_TAXONOMY_SELECTION}>Add a new team</option>
                  </select>
                </label>
                {teamSelection === NEW_TAXONOMY_SELECTION ? (
                  <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-new-team">
                    New team name
                    <input
                      className={fieldClass}
                      id="ai-work-new-team"
                      maxLength={120}
                      onChange={(event) => setTeamLabel(event.target.value)}
                      required
                      value={teamLabel}
                    />
                  </label>
                ) : null}
              </div>
              <div className="min-w-0 space-y-3">
                <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-type">
                  Work type
                  <select
                    className={fieldClass}
                    id="ai-work-type"
                    onChange={(event) => setJobSelection(event.target.value)}
                    value={jobSelection}
                  >
                    <option value="">No selection</option>
                    {jobTerms.map((term) => (
                      <option key={term.termId} value={taxonomyOptionValue(term.key)}>
                        {term.label}
                      </option>
                    ))}
                    <option value={NEW_TAXONOMY_SELECTION}>Add a new work type</option>
                  </select>
                </label>
                {jobSelection === NEW_TAXONOMY_SELECTION ? (
                  <label className="block space-y-2 text-sm font-medium text-[var(--ink)]" htmlFor="ai-work-new-type">
                    New work type name
                    <input
                      className={fieldClass}
                      id="ai-work-new-type"
                      maxLength={120}
                      onChange={(event) => setJobLabel(event.target.value)}
                      required
                      value={jobLabel}
                    />
                  </label>
                ) : null}
              </div>
            </div>
            {taxonomyTerms === undefined ? (
              <p className="text-sm text-[var(--muted)]" role="status">
                Loading team and work type options…
              </p>
            ) : null}
          </div>
        </details>

        <details className="border border-[var(--line)] bg-white">
          <summary className="min-h-12 cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--focus-ring-solid)] focus-visible:outline-offset-2">
            Make it reusable (optional)
          </summary>
          <div className="space-y-4 border-t border-[var(--line)] px-5 py-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Put double braces around a detail that changes, such as {'{{client_name}}'}. Roster turns it into a simple fill-in field without changing your saved text.
            </p>
            {inputs.length ? (
              <div className="flex flex-wrap gap-2">
                {inputs.map((input) => (
                  <Badge key={input.key} tone="strategy">{input.label}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">
                No fill-in fields detected. That is fine—you can save this work as it is.
              </p>
            )}
          </div>
        </details>

        {saveError ? (
          <SurfaceNotice
            description={saveError}
            live
            title="Couldn’t save this draft"
            tone="error"
          />
        ) : null}

        <button
          className="min-h-12 w-full bg-[var(--button-primary)] px-5 text-sm font-semibold text-[var(--button-primary-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || isImporting || workspace.status !== 'ready'}
          type="submit"
        >
          {isSaving ? 'Saving to My Work…' : 'Save to My Work'}
        </button>
      </form>
    </div>
  );
}
