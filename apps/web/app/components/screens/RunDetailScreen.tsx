'use client';

import { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  CodeBlock,
  EmptyState,
  PageIntro,
  Panel,
  Badge,
  SkeletonCardGrid,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import {
  useTrackPageView,
  useTrackProductEvent,
} from '@/app/components/control-plane/useProductEvents';
import { openMicroFeedback } from '@/lib/control-plane-events';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { rosterFetchEnvelope, useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { RunDetail } from '@/lib/roster-types';
import { RouteStatusScreen } from './RouteStatusScreen';
import { LegacyAdvancedUnavailable } from './LegacyAdvancedUnavailable';
import { isLegacyAdvancedEnabled } from '@/lib/legacy-advanced-access';

const REPORT_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "img-src data:",
  "font-src data:",
  "style-src 'unsafe-inline'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export function SandboxedHtmlReport({ html }: { html: string }) {
  const srcDoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${REPORT_CONTENT_SECURITY_POLICY}"></head><body>${html}</body></html>`;
  return (
    <iframe
      className="min-h-[520px] w-full border border-[var(--line)] bg-white"
      referrerPolicy="no-referrer"
      sandbox=""
      srcDoc={srcDoc}
      title="Sandboxed HTML report"
    />
  );
}

type ReportState = {
  json: string;
  markdown: string;
  html: string;
};

export function RunDetailScreen({ executionId }: { executionId: string }) {
  if (!isLegacyAdvancedEnabled(process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED)) {
    return <LegacyAdvancedUnavailable />;
  }
  return <EnabledRunDetailScreen executionId={executionId} />;
}

function EnabledRunDetailScreen({ executionId }: { executionId: string }) {
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
        pathname={`/runs/${executionId}`}
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
        pathname={`/runs/${executionId}`}
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
        description="Your everyday Library stays available. Ask a workspace owner or admin if you need technical run details."
        title="Advanced access is limited to workspace owners and admins"
        tone="info"
      />
    );
  }

  return <AuthorizedRunDetailScreen executionId={executionId} />;
}

function AuthorizedRunDetailScreen({ executionId }: { executionId: string }) {
  const track = useTrackProductEvent();
  const [reports, setReports] = useState<ReportState>({ json: '', markdown: '', html: '' });
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<'summary' | 'json' | 'markdown' | 'html'>(
    'summary',
  );
  const { isAuthenticated } = useConvexAuth();
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  useTrackPageView('run_detail_view', { route: `/runs/${executionId}`, executionId });

  const detail = useRosterResource<RosterEnvelope<RunDetail>>(
    `/api/roster/orchestrate/${encodeURIComponent(executionId)}`,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadReports = async () => {
      setReportsLoading(true);
      setReportError(null);
      try {
        const [json, markdown, html] = await Promise.all([
          rosterFetchEnvelope<Record<string, unknown>>(
            `/api/roster/orchestrate/${encodeURIComponent(executionId)}/report?format=json`,
          ),
          rosterFetchEnvelope<string>(
            `/api/roster/orchestrate/${encodeURIComponent(executionId)}/report?format=markdown`,
          ),
          rosterFetchEnvelope<string>(
            `/api/roster/orchestrate/${encodeURIComponent(executionId)}/report?format=html`,
          ),
        ]);

        setReports({
          json: JSON.stringify(json.data, null, 2),
          markdown: typeof markdown.data === 'string' ? markdown.data : '',
          html: typeof html.data === 'string' ? html.data : '',
        });
        await track('orchestration_report_viewed', { executionId });
        openMicroFeedback({
          type: 'feature_request',
          page: 'Run detail',
          route: `/runs/${executionId}`,
          context: { executionId, action: 'view_report' },
        });
      } catch (loadError) {
        setReportError(
          loadError instanceof Error ? loadError.message : 'The run report could not be loaded.',
        );
      } finally {
        setReportsLoading(false);
      }
    };

    void loadReports();
  }, [executionId, isAuthenticated, track]);

  const run = detail.data?.data;

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname={`/runs/${executionId}`}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="Run detail is where the orchestration feature either becomes usable or falls apart. Status, summary, and report formats are grouped here so the beta user can stay in one place."
        eyebrow="Run Detail"
        title={run?.projectType ? `${run.projectType} run` : executionId}
      />

      {detail.loading ? (
        <SurfaceNotice
          description="Execution status is loading from the orchestration route. The run detail surface stays visible so the page never looks like a missing execution by mistake."
          title="Loading execution detail"
          tone="info"
        />
      ) : null}

      {detail.error ? (
        <SurfaceNotice
          description={detail.error}
          title="Execution detail is temporarily unavailable"
          tone="warning"
        />
      ) : null}

      {reportError ? (
        <SurfaceNotice
          description={reportError}
          title="Some report formats are temporarily unavailable"
          tone="warning"
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel
          action={
            run?.status ? (
              <Badge tone={run.status === 'completed' ? 'success' : 'info'}>
                {titleCase(run.status)}
              </Badge>
            ) : undefined
          }
          subtitle="Status comes from the orchestration execution route."
          title="Execution summary"
          tone="strategy"
        >
          {detail.loading ? (
            <SkeletonCardGrid count={2} />
          ) : run ? (
            <div className="space-y-4">
              <div className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[var(--ink)]">{run.projectPath}</p>
                  <Badge>{titleCase(run.mode)}</Badge>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Started {formatRelativeDate(run.startTime)}
                </p>
                {run.endTime ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ended {formatRelativeDate(run.endTime)}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Phase count
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.05em] text-[var(--ink)]">
                    {run.phaseCount ?? 0}
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Recommendations
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.05em] text-[var(--ink)]">
                    {run.recommendations ?? 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              description="The execution route did not return a status object for this identifier."
              title="Run not found"
            />
          )}
        </Panel>

        <Panel
          subtitle="Switch between summary, JSON, markdown, and HTML without leaving the run."
          title="Report"
          tone="tech"
        >
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'json', label: 'JSON' },
              { id: 'markdown', label: 'Markdown' },
              { id: 'html', label: 'HTML' },
            ].map((item) => (
              <button
                className={`border px-4 py-2 text-sm transition ${
                  activeReport === item.id
                    ? 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[var(--strategy-strong)]'
                    : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--panel-soft)]'
                }`}
                key={item.id}
                onClick={() => setActiveReport(item.id as typeof activeReport)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {detail.loading || reportsLoading ? (
              <SkeletonCardGrid count={2} />
            ) : activeReport === 'summary' ? (
              <div className="border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                <p className="font-medium text-[var(--ink)]">Run summary</p>
                <p className="mt-3">
                  This execution is {run?.status ?? 'unknown'}, targeted{' '}
                  {run?.projectType ?? 'an unknown project type'}, and was started in{' '}
                  {run?.mode ?? 'unknown'} mode.
                </p>
                <p className="mt-3">
                  Use the JSON, markdown, or HTML tabs when the beta user needs the full backend
                  report instead of the operational summary.
                </p>
              </div>
            ) : activeReport === 'json' ? (
              <CodeBlock value={reports.json || '{}'} />
            ) : activeReport === 'markdown' ? (
              <CodeBlock value={reports.markdown || 'No markdown report available.'} />
            ) : reports.html ? (
              <SandboxedHtmlReport html={reports.html} />
            ) : (
              <EmptyState
                description="No HTML report is available yet."
                title="HTML report unavailable"
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
