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
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { RouteStatusScreen } from './RouteStatusScreen';

type LibraryScope = 'library' | 'my_work' | 'approvals';

const TEAM_OPTIONS = [
  ['client-delivery', 'Client delivery'],
  ['marketing', 'Marketing'],
  ['business-development', 'Business development'],
  ['operations', 'Operations'],
] as const;

const JOB_OPTIONS = [
  ['create-proposal', 'Create a proposal'],
  ['draft-sow', 'Draft a statement of work'],
  ['research-account', 'Research an account'],
  ['summarize-meeting', 'Summarize a meeting'],
  ['create-campaign', 'Create a campaign'],
] as const;

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
}: {
  item: {
    assetId: string;
    title: string;
    purpose: string;
    kind: 'prompt' | 'playbook';
    teamKey: string;
    jobKey: string;
    reviewState: string;
    lastVerifiedAt: number | null;
    updatedAt: number;
    versionNumber: number;
  };
}) {
  return (
    <article className="group flex h-full flex-col rounded-[26px] border border-[var(--line)] bg-[var(--panel-soft)] p-5 transition hover:border-[var(--line-strong)] hover:bg-white">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.kind === 'playbook' ? 'info' : 'default'}>{titleCase(item.kind)}</Badge>
        <Badge tone={trustTone(item.reviewState)}>{trustLabel(item.reviewState)}</Badge>
      </div>
      <div className="mt-5 flex-1">
        <h2 className="font-heading text-xl tracking-[-0.035em] text-[var(--ink)]">{item.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{item.purpose}</p>
      </div>
      <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--muted)]">Team</dt>
          <dd className="mt-1 font-medium text-[var(--ink)]">{titleCase(item.teamKey)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Job to be done</dt>
          <dd className="mt-1 font-medium text-[var(--ink)]">{titleCase(item.jobKey)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs leading-5 text-[var(--muted)]">
          {item.lastVerifiedAt
            ? `Verified ${formatRelativeDate(item.lastVerifiedAt)}`
            : `Updated ${formatRelativeDate(item.updatedAt)}`}{' '}
          · v{item.versionNumber}
        </p>
        <ActionButton href={`/library/${item.assetId}`} tone="primary">
          Use
        </ActionButton>
      </div>
    </article>
  );
}

export function LibraryScreen({ scope = 'library' }: { scope?: LibraryScope }) {
  const { isAuthenticated } = useConvexAuth();
  const workspace = useWorkspace();
  const [search, setSearch] = useState('');
  const [teamKey, setTeamKey] = useState('');
  const [jobKey, setJobKey] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const library = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready'
      ? {
          scope,
          search: deferredSearch || undefined,
          teamKey: teamKey || undefined,
          jobKey: jobKey || undefined,
          limit: 80,
        }
      : 'skip',
  );

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname={scope === 'library' ? '/library' : `/${scope.replace('_', '-')}`}
      />
    );
  }

  const copy = SCOPE_COPY[scope];
  const loading = workspace.status === 'bootstrapping' || library === undefined;
  const canApprove =
    workspace.role === 'owner' || workspace.role === 'admin' || workspace.role === 'curator';

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

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          scope === 'approvals' ? undefined : (
            <ActionButton href="/library/new" tone="primary">
              Save new work
            </ActionButton>
          )
        }
        description={copy.description}
        eyebrow={copy.eyebrow}
        title={copy.title}
      />

      {workspace.status === 'error' ? (
        <SurfaceNotice
          description={workspace.error ?? 'Ask a workspace admin to check the organization setup.'}
          title="Your workspace could not be prepared"
          tone="error"
        />
      ) : null}

      <Panel
        subtitle="Plain-language filters keep prompt syntax and model settings out of the browsing experience."
        title="What do you need to get done?"
        tone="strategy"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Search by outcome
            <input
              className="min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-white px-4 text-sm outline-none transition focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. draft a proposal"
              type="search"
              value={search}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Team
            <select
              className="min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-white px-4 text-sm"
              onChange={(event) => setTeamKey(event.target.value)}
              value={teamKey}
            >
              <option value="">All teams</option>
              {TEAM_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Job to be done
            <select
              className="min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-white px-4 text-sm"
              onChange={(event) => setJobKey(event.target.value)}
              value={jobKey}
            >
              <option value="">All outcomes</option>
              {JOB_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <section aria-busy={loading} aria-live="polite">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {loading ? 'Loading useful work' : `${library.items.length} items`}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {workspace.name ? `In ${workspace.name}` : 'Preparing your workspace'}
            </p>
          </div>
          {(search || teamKey || jobKey) && !loading ? (
            <button
              className="min-h-11 rounded-full border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)]"
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

        {loading ? (
          <SkeletonList rows={5} />
        ) : library.items.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {library.items.map((item) => (
              <LibraryCard item={item} key={item.assetId} />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              scope === 'approvals' ? undefined : (
                <Link
                  className="inline-flex min-h-11 items-center rounded-full bg-[var(--button-primary)] px-4 text-sm font-semibold text-[var(--button-primary-ink)]"
                  href="/library/new"
                >
                  Save your first prompt
                </Link>
              )
            }
            description={
              scope === 'approvals'
                ? 'Shared work appears here when a contributor asks the team to review it.'
                : 'Paste a prompt your team already uses. Roster will help turn it into reusable work.'
            }
            title={scope === 'approvals' ? 'Nothing is waiting for review' : 'No work matches this view'}
          />
        )}
      </section>
    </div>
  );
}
