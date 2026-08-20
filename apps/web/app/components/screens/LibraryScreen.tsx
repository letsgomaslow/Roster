'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
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
import { formatRelativeDate } from '@/lib/formatters';
import { buildWorkDescriptionPreview } from '@/lib/work-description';
import {
  activeTaxonomySelection,
  activeTaxonomyTerms,
  getActiveTaxonomyLabel,
  getLibraryCardAction,
  type WorkspaceTaxonomyTerm,
} from '@/lib/work-library-ui';
import { RouteStatusScreen } from './RouteStatusScreen';

type LibraryScope = 'library' | 'my_work' | 'approvals';

const SCOPE_COPY = {
  library: {
    eyebrow: 'Team library',
    title: 'Find work worth reusing',
    description:
      'Search by the outcome you need, then use the team-approved version in your preferred AI tool.',
  },
  my_work: {
    eyebrow: 'My work',
    title: 'Keep drafts moving',
    description:
      'Return to work you own, improve it, and share it when it is ready for another person to use.',
  },
  approvals: {
    eyebrow: 'Approvals',
    title: 'Review work before the team trusts it',
    description:
      'Check the exact saved version, its purpose, and its evidence before approving it for wider use.',
  },
} as const;

function trustLabel(state: string): string {
  if (state === 'workspace_approved') return 'Workspace approved';
  if (state === 'team_approved') return 'Team approved';
  if (state === 'shared') return 'Ready for review';
  if (state === 'archived') return 'Archived';
  return 'Private draft';
}

function trustTone(state: string): 'brand' | 'strategy' | 'info' | 'default' | 'warning' {
  if (state === 'workspace_approved') return 'brand';
  if (state === 'team_approved') return 'strategy';
  if (state === 'shared') return 'info';
  if (state === 'archived') return 'warning';
  return 'default';
}

function LibraryCard({
  item,
  scope,
  taxonomyTerms,
}: {
  item: {
    assetId: string;
    title: string;
    purpose?: string;
    kind: 'prompt' | 'playbook';
    teamKey?: string;
    jobKey?: string;
    reviewState: string;
    lastVerifiedAt: number | null;
    updatedAt: number;
    versionNumber: number;
  };
  scope: LibraryScope;
  taxonomyTerms: readonly WorkspaceTaxonomyTerm[] | undefined;
}) {
  const action = getLibraryCardAction(scope, item.assetId);
  const isReview = scope === 'approvals';
  const purposePreview = buildWorkDescriptionPreview(item.purpose);
  const teamLabel = getActiveTaxonomyLabel(taxonomyTerms, 'team', item.teamKey);
  const jobLabel = getActiveTaxonomyLabel(taxonomyTerms, 'work_type', item.jobKey);
  return (
    <article
      className={`flex h-full min-w-0 flex-col border border-[var(--line)] bg-white p-5 ${isReview ? 'border-l-4 border-l-[var(--attention)]' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.kind === 'playbook' ? 'info' : 'default'}>
          {item.kind === 'playbook' ? 'Playbook' : 'AI work'}
        </Badge>
        <Badge tone={trustTone(item.reviewState)}>{trustLabel(item.reviewState)}</Badge>
      </div>
      <div className="mt-5 flex-1">
        <h2 className="line-clamp-2 font-heading text-xl tracking-[-0.035em] text-[var(--ink)] [overflow-wrap:anywhere]">{item.title}</h2>
        {purposePreview.summary ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)] [overflow-wrap:anywhere]">
            {purposePreview.summary}
          </p>
        ) : null}
      </div>
      {teamLabel || jobLabel ? (
        <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-sm sm:grid-cols-2">
          {teamLabel ? (
            <div>
              <dt className="text-xs text-[var(--muted)]">Team</dt>
              <dd className="mt-1 font-medium text-[var(--ink)]">{teamLabel}</dd>
            </div>
          ) : null}
          {jobLabel ? (
            <div>
              <dt className="text-xs text-[var(--muted)]">Work type</dt>
              <dd className="mt-1 font-medium text-[var(--ink)]">{jobLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs leading-5 text-[var(--muted)]">
          {item.lastVerifiedAt
            ? `Verified ${formatRelativeDate(item.lastVerifiedAt)}`
            : `Updated ${formatRelativeDate(item.updatedAt)}`}{' '}
          · v{item.versionNumber}
        </p>
        <ActionButton href={action.href} tone="primary">
          {action.label}
        </ActionButton>
      </div>
    </article>
  );
}

function TaxonomyFilters({
  teamKey,
  jobKey,
  setTeamKey,
  setJobKey,
  taxonomyTerms,
}: {
  teamKey: string;
  jobKey: string;
  setTeamKey: (value: string) => void;
  setJobKey: (value: string) => void;
  taxonomyTerms: readonly WorkspaceTaxonomyTerm[] | undefined;
}) {
  const selectClass =
    'min-h-12 w-full border border-[var(--line-strong)] bg-white px-4 text-sm outline-none focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60';
  const teamTerms = activeTaxonomyTerms(taxonomyTerms, 'team');
  const jobTerms = activeTaxonomyTerms(taxonomyTerms, 'work_type');
  const taxonomyLoading = taxonomyTerms === undefined;
  return (
    <>
      <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
        Team
        <select className={selectClass} disabled={taxonomyLoading} onChange={(event) => setTeamKey(event.target.value)} value={teamKey}>
          <option value="">All teams</option>
          {teamTerms.map((term) => <option key={term.key} value={term.key}>{term.label}</option>)}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
        Work type
        <select className={selectClass} disabled={taxonomyLoading} onChange={(event) => setJobKey(event.target.value)} value={jobKey}>
          <option value="">All outcomes</option>
          {jobTerms.map((term) => <option key={term.key} value={term.key}>{term.label}</option>)}
        </select>
      </label>
    </>
  );
}

export function LibraryScreen({ scope = 'library' }: { scope?: LibraryScope }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const [search, setSearch] = useState('');
  const [teamKey, setTeamKey] = useState('');
  const [jobKey, setJobKey] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const taxonomyTerms = useQuery(
    api.workLibrary.listTaxonomyTerms,
    workspace.status === 'ready' ? {} : 'skip',
  );
  const activeTeamKey = activeTaxonomySelection(taxonomyTerms, 'team', teamKey);
  const activeJobKey = activeTaxonomySelection(taxonomyTerms, 'work_type', jobKey);
  const library = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready'
      ? {
          scope,
          search: deferredSearch || undefined,
          teamKey: activeTeamKey || undefined,
          jobKey: activeJobKey || undefined,
          limit: 80,
        }
      : 'skip',
  );
  const copy = SCOPE_COPY[scope];

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Your signed-in workspace is connecting. This page will stay in place while the Library becomes available."
          eyebrow="Team library"
          title="Preparing your Library"
        />
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (workspace.status === 'error') {
    return (
      <div className="space-y-8">
        <PageIntro
          description={copy.description}
          eyebrow={copy.eyebrow}
          title={copy.title}
        />
        <SurfaceNotice
          description="Roster could not verify your workspace access. Reload and try again."
          title="Your workspace could not be prepared"
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
        pathname={scope === 'library' ? '/library' : `/${scope.replace('_', '-')}`}
      />
    );
  }

  const canSave = workspace.status === 'ready' && workspace.role !== 'viewer';
  const loading =
    workspace.status === 'bootstrapping' || library === undefined || taxonomyTerms === undefined;
  const canApprove =
    workspace.role === 'owner' || workspace.role === 'admin' || workspace.role === 'curator';
  const visibleItems = library?.items ?? [];

  if (scope === 'approvals' && workspace.status === 'ready' && !canApprove) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Team curators and workspace admins review shared work before it becomes trusted."
          eyebrow="Approvals"
          title="Approval access is role-based"
        />
        <SurfaceNotice
          description="You can still share your own work from My Work. A curator will see it here when it is ready."
          title="Your current role does not include approvals"
          tone="info"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageIntro description={copy.description} eyebrow={copy.eyebrow} title={copy.title} />
        <section aria-busy="true" aria-live="polite">
          <p className="mb-4 text-sm font-semibold text-[var(--ink)]">
            {scope === 'approvals' ? 'Loading review queue' : 'Loading useful work'}
          </p>
          <SkeletonList rows={5} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          scope === 'approvals' || !canSave ? undefined : (
            <ActionButton href="/library/new" tone="primary">
              Save new work
            </ActionButton>
          )
        }
        description={copy.description}
        eyebrow={copy.eyebrow}
        title={copy.title}
      />

      <Panel
        subtitle="Start with the result you need. Narrow by the team-owned categories only when helpful."
        title={scope === 'approvals' ? 'Choose work to review' : 'What do you need to get done?'}
        tone="strategy"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Search by outcome
            <input
              className="min-h-12 w-full border border-[var(--line-strong)] bg-white px-4 text-sm outline-none transition-colors focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Describe the result you need…"
              type="search"
              value={search}
            />
          </label>
          <div className="hidden lg:contents">
            <TaxonomyFilters
              jobKey={activeJobKey}
              setJobKey={setJobKey}
              setTeamKey={setTeamKey}
              taxonomyTerms={taxonomyTerms}
              teamKey={activeTeamKey}
            />
          </div>
        </div>
        <details className="mt-4 border border-[var(--line-strong)] bg-white lg:hidden">
          <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--focus-ring-solid)] focus-visible:outline-offset-2">
            Filters
          </summary>
          <div className="grid gap-4 border-t border-[var(--line)] p-4">
            <TaxonomyFilters
              jobKey={activeJobKey}
              setJobKey={setJobKey}
              setTeamKey={setTeamKey}
              taxonomyTerms={taxonomyTerms}
              teamKey={activeTeamKey}
            />
          </div>
        </details>
      </Panel>

      <section aria-live="polite">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {workspace.name ? `In ${workspace.name}` : 'Preparing your workspace'}
            </p>
          </div>
          {search || activeTeamKey || activeJobKey ? (
            <button
              className="min-h-11 border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)]"
              onClick={() => {
                setSearch('');
                setTeamKey('');
                setJobKey('');
              }}
              type="button"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {visibleItems.length ? (
          <div className={scope === 'approvals' ? 'space-y-4' : 'grid gap-5 xl:grid-cols-2'}>
            {visibleItems.map((item) => (
              <LibraryCard
                item={item}
                key={item.assetId}
                scope={scope}
                taxonomyTerms={taxonomyTerms}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              scope === 'approvals' || !canSave ? undefined : (
                <Link
                  className="inline-flex min-h-11 items-center bg-[var(--button-primary)] px-4 text-sm font-semibold text-[var(--button-primary-ink)]"
                  href="/library/new"
                >
                  Save your first AI work
                </Link>
              )
            }
            description={
              scope === 'approvals'
                ? 'Shared work appears here when a contributor asks the team to review it.'
                : canSave
                  ? 'Paste AI instructions or work your team already uses.'
                  : 'Try a different filter, or ask a contributor to add work your team can reuse.'
            }
            title={scope === 'approvals' ? 'Nothing is waiting for review' : 'No work matches this view'}
          />
        )}
      </section>
    </div>
  );
}
