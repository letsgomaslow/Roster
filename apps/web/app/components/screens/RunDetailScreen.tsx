'use client';

import { useEffect, useState } from 'react';
import {
  CodeBlock,
  EmptyState,
  PageIntro,
  Panel,
  Badge,
} from '@/app/components/control-plane/primitives';
import {
  useTrackPageView,
  useTrackProductEvent,
} from '@/app/components/control-plane/useProductEvents';
import { openMicroFeedback } from '@/lib/control-plane-events';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { rosterFetchEnvelope, useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { RunDetail } from '@/lib/roster-types';

type ReportState = {
  json: string;
  markdown: string;
  html: string;
};

export function RunDetailScreen({ executionId }: { executionId: string }) {
  const track = useTrackProductEvent();
  const [reports, setReports] = useState<ReportState>({ json: '', markdown: '', html: '' });
  const [activeReport, setActiveReport] = useState<'summary' | 'json' | 'markdown' | 'html'>(
    'summary',
  );

  useTrackPageView('run_detail_view', { route: `/runs/${executionId}`, executionId });

  const detail = useRosterResource<RosterEnvelope<RunDetail>>(
    `/api/roster/orchestrate/${encodeURIComponent(executionId)}`,
  );

  useEffect(() => {
    const loadReports = async () => {
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
      } catch {
        // The summary panel still renders from the status endpoint.
      }
    };

    void loadReports();
  }, [executionId, track]);

  const run = detail.data?.data;

  return (
    <div className="space-y-8">
      <PageIntro
        description="Run detail is where the orchestration feature either becomes usable or falls apart. Status, summary, and report formats are grouped here so the beta user can stay in one place."
        eyebrow="Run Detail"
        title={run?.projectType ? `${run.projectType} run` : executionId}
      />

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
          {run ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
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
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Phase count
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.05em] text-[var(--ink)]">
                    {run.phaseCount ?? 0}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
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
                className={`rounded-full border px-4 py-2 text-sm transition ${
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
            {activeReport === 'summary' ? (
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
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
              <div
                className="rounded-[24px] border border-[var(--line)] bg-[var(--background-soft)] px-4 py-4 text-sm text-[var(--ink)]"
                dangerouslySetInnerHTML={{ __html: reports.html }}
              />
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
