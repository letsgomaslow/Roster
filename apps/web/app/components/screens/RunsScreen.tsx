'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
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
import {
  useTrackPageView,
  useTrackProductEvent,
} from '@/app/components/control-plane/useProductEvents';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { rosterFetchEnvelope, useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { RunSummary } from '@/lib/roster-types';
import { RouteStatusScreen } from './RouteStatusScreen';
import { LegacyAdvancedUnavailable } from './LegacyAdvancedUnavailable';
import { isLegacyAdvancedEnabled } from '@/lib/legacy-advanced-access';

export function RunsScreen() {
  if (!isLegacyAdvancedEnabled(process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED)) {
    return <LegacyAdvancedUnavailable />;
  }
  return <EnabledRunsScreen />;
}

function EnabledRunsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="loading"
        pathname="/runs"
      />
    );
  }

  if (workspace.status === 'error') {
    return (
      <SurfaceNotice
        description={workspace.error ?? 'Roster could not verify your workspace role.'}
        title="Advanced access needs attention"
        tone="error"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/runs"
      />
    );
  }

  if (workspace.status !== 'ready') {
    return (
      <SurfaceNotice
        description="Roster is confirming your workspace role before opening technical tools."
        title="Checking advanced access"
        tone="info"
      />
    );
  }

  if (workspace.role !== 'owner' && workspace.role !== 'admin') {
    return (
      <SurfaceNotice
        description="Your everyday Library stays available. Ask a workspace owner or admin if you need orchestration runs."
        title="Advanced access is limited to workspace owners and admins"
        tone="info"
      />
    );
  }

  return <AuthorizedRunsScreen />;
}

function AuthorizedRunsScreen() {
  const router = useRouter();
  const track = useTrackProductEvent();
  const [projectPath, setProjectPath] = useState('');
  const [mode, setMode] = useState<'analyze' | 'review' | 'refactor' | 'test' | 'document'>(
    'analyze',
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  useTrackPageView('runs_view', { route: '/runs' });

  const runs = useRosterResource<RosterEnvelope<{ executions?: RunSummary[] }>>(
    '/api/roster/orchestrate?limit=50',
  );

  async function startRun() {
    setCreating(true);
    setError(null);
    try {
      const response = await rosterFetchEnvelope<{ executionId: string }>(
        '/api/roster/orchestrate',
        {
          method: 'POST',
          body: JSON.stringify({ projectPath, mode }),
        },
      );
      if (!response.success || !response.data.executionId) {
        throw new Error(response.error || 'Run failed');
      }
      await track('orchestration_started', {
        projectPath,
        mode,
        executionId: response.data.executionId,
      });
      router.push(`/runs/${encodeURIComponent(response.data.executionId)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Run failed');
    } finally {
      setCreating(false);
    }
  }

  const items = runs.data?.data?.executions ?? [];

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/runs"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="The run surface should make starting orchestration, returning to history, and opening reports feel like one continuous workflow."
        eyebrow="Orchestration Runs"
        title="Execution history, status, and report entry points"
      />

      {runs.loading ? (
        <SurfaceNotice
          description="Run history is loading from the orchestration endpoint. The launch form stays visible so the route never degrades into a false empty state."
          title="Loading run history"
          tone="info"
        />
      ) : null}

      {runs.error ? (
        <SurfaceNotice
          action={
            <ActionButton onClick={runs.reload} tone="ghost">
              Reload runs
            </ActionButton>
          }
          description={runs.error}
          title="Run history is temporarily unavailable"
          tone="warning"
        />
      ) : null}

      {error ? (
        <div
          className="border border-[color:color-mix(in_oklab,var(--error)_28%,white)] bg-[color:color-mix(in_oklab,var(--error)_9%,white)] px-4 py-4 text-sm text-[var(--error-strong)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          subtitle="This starts the real backend orchestration route."
          title="Start orchestration"
          tone="strategy"
        >
          <div className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Project path on the connected host</span>
              <input
                className="w-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) => setProjectPath(event.target.value)}
                placeholder="/Users/beta-user/projects/acme-app"
                value={projectPath}
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--muted)]">Mode</span>
              <select
                className="w-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) => setMode(event.target.value as typeof mode)}
                value={mode}
              >
                <option value="analyze">Analyze</option>
                <option value="review">Review</option>
                <option value="refactor">Refactor</option>
                <option value="test">Test</option>
                <option value="document">Document</option>
              </select>
            </label>
            <button
              className="inline-flex min-h-11 items-center justify-center bg-[var(--button-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-secondary-ink)] transition hover:bg-[var(--button-secondary-hover)] disabled:opacity-60"
              disabled={creating || !projectPath.trim()}
              onClick={startRun}
              type="button"
            >
              {creating ? 'Starting…' : 'Start run'}
            </button>
            <p aria-live="polite" className="text-xs text-[var(--muted)]">
              {creating
                ? 'Starting orchestration run.'
                : 'Runs are started against the backend orchestration endpoint.'}
            </p>
          </div>
        </Panel>

        <Panel
          action={
            <Badge tone={runs.loading ? 'info' : 'default'}>
              {runs.loading ? 'Loading history' : `${items.length} runs`}
            </Badge>
          }
          subtitle="A beta user should always be able to jump back into the last execution."
          title="Run history"
          tone="tech"
        >
          {runs.loading ? (
            <SkeletonList rows={5} />
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((run) => (
                <Link
                  className="block border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white"
                  href={`/runs/${encodeURIComponent(run.executionId)}`}
                  key={run.executionId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {run.projectType || 'Unknown project type'}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{run.projectPath}</p>
                    </div>
                    <Badge tone={run.status === 'completed' ? 'success' : 'info'}>
                      {titleCase(run.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{titleCase(run.mode)}</span>
                    <span>{formatRelativeDate(run.startTime)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              description="No orchestration history is available yet."
              title="Runs will appear here after the first execution"
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
