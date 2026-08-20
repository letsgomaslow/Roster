'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  PageIntro,
  Panel,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { titleCase } from '@/lib/formatters';
import {
  activeTaxonomyTerms,
  confirmTaxonomyArchive,
  friendlyTaxonomyError,
  taxonomyArchiveSuccessMessage,
  type WorkspaceTaxonomyTerm,
} from '@/lib/work-library-ui';
import { RouteStatusScreen } from './RouteStatusScreen';

type ManagedTaxonomyTerm = WorkspaceTaxonomyTerm & {
  sortOrder: number;
  termId: Id<'taxonomyTerms'>;
};

type TaxonomyMessage = {
  description: string;
  title: string;
  tone: 'error' | 'success';
};

const fieldClassName =
  'min-h-11 w-full border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus-visible:border-[var(--strategy)] focus-visible:ring-2 focus-visible:ring-[var(--strategy-soft)]';
const primaryButtonClassName =
  'min-h-11 shrink-0 bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--strategy)] disabled:opacity-60';
const quietButtonClassName =
  'min-h-11 shrink-0 border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--panel-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--strategy)] disabled:opacity-60';

function AddTaxonomyTermForm({
  busy,
  kind,
  onAdd,
}: {
  busy: boolean;
  kind: WorkspaceTaxonomyTerm['kind'];
  onAdd: (event: FormEvent<HTMLFormElement>, kind: WorkspaceTaxonomyTerm['kind']) => Promise<void>;
}) {
  const noun = kind === 'team' ? 'team' : 'work type';
  const inputId = `new-${kind}-label`;
  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => void onAdd(event, kind)}
    >
      <label className="sr-only" htmlFor={inputId}>New {noun} name</label>
      <input
        className={fieldClassName}
        disabled={busy}
        id={inputId}
        maxLength={120}
        name="label"
        placeholder={`New ${noun} name`}
        required
      />
      <button className={primaryButtonClassName} disabled={busy} type="submit">
        Add {noun}
      </button>
    </form>
  );
}

function TaxonomyTermRow({
  busy,
  onArchive,
  onRename,
  term,
}: {
  busy: boolean;
  onArchive: (term: ManagedTaxonomyTerm) => Promise<void>;
  onRename: (event: FormEvent<HTMLFormElement>, term: ManagedTaxonomyTerm) => Promise<void>;
  term: ManagedTaxonomyTerm;
}) {
  return (
    <li className="border border-[var(--line)] bg-[var(--panel-soft)] p-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        key={`${term.termId}:${term.label}`}
        onSubmit={(event) => void onRename(event, term)}
      >
        <input
          aria-label={`Rename ${term.label}`}
          className={fieldClassName}
          defaultValue={term.label}
          disabled={busy}
          maxLength={120}
          name="label"
          required
        />
        <button className={quietButtonClassName} disabled={busy} type="submit">
          Save name
        </button>
        <button
          aria-label={`Archive ${term.label}`}
          className={quietButtonClassName}
          disabled={busy}
          onClick={() => void onArchive(term)}
          type="button"
        >
          Archive
        </button>
      </form>
    </li>
  );
}

function TaxonomyTermGroup({
  busy,
  kind,
  onAdd,
  onArchive,
  onRename,
  terms,
}: {
  busy: boolean;
  kind: WorkspaceTaxonomyTerm['kind'];
  onAdd: (event: FormEvent<HTMLFormElement>, kind: WorkspaceTaxonomyTerm['kind']) => Promise<void>;
  onArchive: (term: ManagedTaxonomyTerm) => Promise<void>;
  onRename: (event: FormEvent<HTMLFormElement>, term: ManagedTaxonomyTerm) => Promise<void>;
  terms: ManagedTaxonomyTerm[];
}) {
  const title = kind === 'team' ? 'Teams' : 'Work types';
  return (
    <section aria-labelledby={`${kind}-taxonomy-heading`}>
      <h3 className="text-sm font-semibold text-[var(--ink)]" id={`${kind}-taxonomy-heading`}>
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        {kind === 'team'
          ? 'Help teammates find work for the group that owns it.'
          : 'Describe the outcome or task this work helps complete.'}
      </p>
      <AddTaxonomyTermForm busy={busy} kind={kind} onAdd={onAdd} />
      {terms.length ? (
        <ul className="mt-3 space-y-2">
          {terms.map((term) => (
            <TaxonomyTermRow
              busy={busy}
              key={term.termId}
              onArchive={onArchive}
              onRename={onRename}
              term={term}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
          No active {kind === 'team' ? 'teams' : 'work types'} yet.
        </p>
      )}
    </section>
  );
}

function LibraryOrganizationPanel() {
  const taxonomyTerms = useQuery(api.workLibrary.listTaxonomyTerms, {});
  const createTaxonomyTerm = useMutation(api.workLibrary.createTaxonomyTerm);
  const updateTaxonomyTerm = useMutation(api.workLibrary.updateTaxonomyTerm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TaxonomyMessage | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) statusRef.current?.focus();
  }, [message]);

  function showError(error: unknown) {
    setMessage({
      description: friendlyTaxonomyError(error),
      title: 'Library organization needs attention',
      tone: 'error',
    });
  }

  async function addTerm(
    event: FormEvent<HTMLFormElement>,
    kind: WorkspaceTaxonomyTerm['kind'],
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get('label') ?? '').trim();
    if (!label) return;
    setBusy(true);
    try {
      await createTaxonomyTerm({ kind, label });
      form.reset();
      setMessage({
        description: `${label} is now available in Library choices and filters.`,
        title: 'Label added',
        tone: 'success',
      });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function renameTerm(event: FormEvent<HTMLFormElement>, term: ManagedTaxonomyTerm) {
    event.preventDefault();
    const label = String(new FormData(event.currentTarget).get('label') ?? '').trim();
    if (!label || label === term.label) return;
    setBusy(true);
    try {
      await updateTaxonomyTerm({ label, termId: term.termId });
      setMessage({
        description: `“${term.label}” is now “${label}” across the Library.`,
        title: 'Label renamed',
        tone: 'success',
      });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function archiveTerm(term: ManagedTaxonomyTerm) {
    const accepted = confirmTaxonomyArchive(term.label, (message) => window.confirm(message));
    if (!accepted) return;
    setBusy(true);
    try {
      await updateTaxonomyTerm({ status: 'archived', termId: term.termId });
      setMessage({
        description: taxonomyArchiveSuccessMessage(term.label),
        title: 'Label archived',
        tone: 'success',
      });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  const teams = activeTaxonomyTerms(taxonomyTerms, 'team');
  const workTypes = activeTaxonomyTerms(taxonomyTerms, 'work_type');

  return (
    <Panel
      className="lg:col-span-2"
      subtitle="Keep choices familiar, current, and easy for teammates to scan. Archived labels disappear from future choices without changing saved work."
      title="Library organization"
      tone="strategy"
    >
      <div
        aria-atomic="true"
        aria-live="polite"
        className="focus:outline-none"
        ref={statusRef}
        tabIndex={-1}
      >
        {message ? (
          <SurfaceNotice
            description={message.description}
            title={message.title}
            tone={message.tone}
          />
        ) : null}
      </div>
      {taxonomyTerms === undefined ? (
        <SkeletonList rows={2} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <TaxonomyTermGroup
            busy={busy}
            kind="team"
            onAdd={addTerm}
            onArchive={archiveTerm}
            onRename={renameTerm}
            terms={teams}
          />
          <TaxonomyTermGroup
            busy={busy}
            kind="work_type"
            onAdd={addTerm}
            onArchive={archiveTerm}
            onRename={renameTerm}
            terms={workTypes}
          />
        </div>
      )}
    </Panel>
  );
}

export function WorkspaceAdminScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const seedStarterLibrary = useMutation(api.workLibrary.seedStarterLibrary);
  const [starterState, setStarterState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [starterMessage, setStarterMessage] = useState<string | null>(null);
  const canCurate =
    workspace.role === 'owner' || workspace.role === 'admin' || workspace.role === 'curator';
  const canAdmin = workspace.role === 'owner' || workspace.role === 'admin';
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="loading"
        pathname="/workspace-admin"
      />
    );
  }

  if (workspace.status === 'error') {
    return (
      <div className="space-y-4">
        <SurfaceNotice
          description="Roster could not verify your workspace access. Reload and try again."
          title="Workspace access needs attention"
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
        pathname="/workspace-admin"
      />
    );
  }

  async function addStarterLibrary() {
    setStarterState('working');
    try {
      const result = await seedStarterLibrary({});
      setStarterState('done');
      setStarterMessage(
        result.created
          ? `${result.created} starter AI-work examples were added as shared drafts for review.`
          : 'The complete starter Library is already present.',
      );
    } catch {
      setStarterState('error');
      setStarterMessage('Roster could not add the starter Library. Try again.');
    }
  }

  if (workspace.status !== 'ready') {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Roster is confirming your workspace role before showing Library settings."
          eyebrow="Library settings"
          title="Checking workspace access"
        />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (!canCurate) {
    return (
      <SurfaceNotice
        description="Ask a workspace curator, admin, or owner if a Library label needs to change."
        title="Library settings access is required"
        tone="warning"
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageIntro
        description={
          canAdmin
            ? 'Organize Library choices and manage the workspace controls available today.'
            : 'Keep team and work-type choices clear so everyone can find the right work.'
        }
        eyebrow={canAdmin ? 'Workspace admin' : 'Library settings'}
        title="Keep your team’s Library useful and safe"
      />

      {starterMessage ? (
        <SurfaceNotice
          description={starterMessage}
          live
          title={starterState === 'error' ? 'Starter Library needs attention' : 'Starter Library is ready'}
          tone={starterState === 'error' ? 'error' : 'success'}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <LibraryOrganizationPanel />

        {canAdmin ? (
          <>
            <Panel
              subtitle="Workspace membership and invitations are managed through your Maslow AI organization."
              title="People and access"
            >
              <div className="flex items-center justify-between border border-[var(--line)] bg-[var(--panel-soft)] p-4">
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {workspace.name ?? 'Current workspace'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Your current access</p>
                </div>
                <Badge tone="strategy">{titleCase(workspace.role ?? 'loading')}</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                Owners and admins manage membership in the account menu. Roster applies those
                roles to Library, Approval, and Admin access.
              </p>
            </Panel>

            <Panel
              subtitle="Begin with useful, reviewable examples instead of an empty workspace."
              title="Starter Library"
              tone="strategy"
            >
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                Add 12 client-delivery, business-development, and marketing AI-work examples.
                They arrive shared for curator review and are never pre-approved.
              </p>
              <button
                className={`${primaryButtonClassName} mt-4`}
                disabled={starterState === 'working'}
                onClick={addStarterLibrary}
                type="button"
              >
                {starterState === 'working' ? 'Adding starter work…' : 'Add starter Library'}
              </button>
            </Panel>

            <Panel
              subtitle="Roster remains useful before any external AI tool is connected."
              title="Connections"
              tone="tech"
            >
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                Open the Setup Center for Claude, Codex, Gemini CLI, ChatGPT, Microsoft 365
                Copilot, and other MCP clients.
              </p>
              <div className="mt-4">
                <ActionButton href="/integrations">Open Setup Center</ActionButton>
              </div>
            </Panel>

            <Panel
              subtitle="Launch scope is general business information only."
              title="Workspace data boundary"
              tone="attention"
            >
              <ul className="space-y-2 text-sm leading-6 text-[var(--ink-soft)]">
                <li>Do not save credentials or authentication secrets.</li>
                <li>Do not save payment-card data or protected health information.</li>
                <li>Review sensitive client material before sharing it with a team or provider.</li>
              </ul>
            </Panel>
          </>
        ) : null}
      </div>
    </div>
  );
}
