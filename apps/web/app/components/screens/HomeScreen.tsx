'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { PageIntro, Panel, StatCard, Badge, ActionButton, EmptyState } from '@/app/components/control-plane/primitives';
import { useTrackPageView } from '@/app/components/control-plane/useProductEvents';
import { convexEnabled } from '@/lib/convex-client';
import { formatNumber, formatPercent, formatRelativeDate, titleCase } from '@/lib/formatters';
import { useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { DashboardApiPayload } from '@/lib/roster-types';

export function HomeScreen() {
  useTrackPageView('home_view', { route: '/' });

  const snapshot = useQuery(
    api.prompts.dashboardSnapshot,
    convexEnabled ? { promptLimit: 6, agentLimit: 4 } : 'skip',
  );
  const dashboard = useRosterResource<RosterEnvelope<DashboardApiPayload>>('/api/roster/dashboard');

  const health = dashboard.data?.data?.health;
  const tools = dashboard.data?.data?.tools;
  const stats = dashboard.data?.data?.stats?.data;
  const runs = dashboard.data?.data?.runs?.data?.executions ?? [];
  const subscription = dashboard.data?.data?.subscription?.data;
  const toolList = Array.isArray(tools?.data) ? tools.data : [];
  const healthStatus = health?.data?.status === 'healthy';

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <>
            <ActionButton href="/integrations" tone="primary">Finish MCP setup</ActionButton>
            <ActionButton href="/library/new" tone="ghost">New prompt</ActionButton>
          </>
        }
        description="Roster should read like a working control plane, not a landing page. This view keeps connection status and workspace momentum side by side so beta users can tell whether the MCP server is ready and whether their library is actually moving."
        eyebrow="Operational Overview"
        title="Private beta control plane for the Roster MCP server"
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          action={
            <Badge tone={healthStatus ? 'success' : 'warning'}>
              {healthStatus ? 'Connected' : 'Needs attention'}
            </Badge>
          }
          className="overflow-hidden"
          subtitle="The shortest path to useful feedback starts with proving setup, tool availability, and usage limits from one screen."
          title="Integration readiness"
          tone="dark"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              accent="strong"
              detail={health?.success ? 'BFF can reach the Roster server.' : 'Health check is not healthy yet.'}
              label="Server health"
              value={healthStatus ? 'Healthy' : 'Check'}
            />
            <StatCard
              accent="strong"
              detail="Listed from the MCP tool endpoint."
              label="Available tools"
              value={formatNumber(toolList.length)}
            />
            <StatCard
              accent="strong"
              detail={subscription?.subscriptionTier ? `${titleCase(subscription.subscriptionTier)} tier` : 'Plan unavailable'}
              label="Rate window"
              value={subscription?.rateLimit ? `${subscription.rateLimit.requests}/hr` : 'Unknown'}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/12 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/55">
                Quick-start clients
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  {
                    name: 'Claude Desktop',
                    summary: 'Generate a desktop config and test one tool call.',
                    href: '/integrations#claude',
                  },
                  {
                    name: 'Cursor',
                    summary: 'Use the same server definition with the beta-friendly copy path.',
                    href: '/integrations#cursor',
                  },
                  {
                    name: 'Generic host',
                    summary: 'Keep a JSON reference ready for any MCP-compatible runtime.',
                    href: '/integrations#generic',
                  },
                ].map((item) => (
                  <Link
                    className="rounded-[20px] border border-white/10 bg-black/10 px-4 py-4 transition hover:bg-black/20"
                    href={item.href}
                    key={item.name}
                  >
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">{item.summary}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/12 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/55">
                MCP readiness checklist
              </p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: 'Server responds to `/health`',
                    status: healthStatus,
                  },
                  {
                    label: 'MCP tools are discoverable',
                    status: toolList.length > 0,
                  },
                  {
                    label: 'Prompt catalog is loaded',
                    status: Boolean(snapshot?.counts.total),
                  },
                  {
                    label: 'Usage state is visible',
                    status: Boolean(subscription?.rateLimit),
                  },
                ].map((item) => (
                  <div
                    className="flex items-center justify-between rounded-[18px] border border-white/10 px-4 py-3"
                    key={item.label}
                  >
                    <span className="text-sm text-white/78">{item.label}</span>
                    <Badge tone={item.status ? 'success' : 'warning'}>
                      {item.status ? 'Ready' : 'Missing'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          subtitle="Use these cards to spot whether the beta user is actually creating, editing, and running anything."
          title="Workspace activity"
          tone="strategy"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              detail="Direct Convex read"
              label="Library items"
              value={formatNumber(snapshot?.counts.total)}
            />
            <StatCard
              detail="Recent feedback count"
              label="Feedback signals"
              value={formatNumber(snapshot?.recentFeedbackCount)}
            />
            <StatCard
              detail="Non-standard prompts"
              label="Agents registered"
              value={formatNumber(snapshot?.recentAgents.length)}
            />
            <StatCard
              detail="From the orchestration endpoint"
              label="Runs tracked"
              value={formatNumber(runs.length)}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
        <Panel
          action={
            <Link
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--strategy-strong)] underline-offset-4 transition hover:text-[var(--accent-strong)] hover:underline"
              href="/library"
            >
              Open library
            </Link>
          }
          subtitle="Convex-backed recent activity keeps the control plane responsive while BFF routes stay reserved for side effects."
          title="Recent prompts"
        >
          {snapshot?.recentPrompts?.length ? (
            <div className="space-y-3">
              {snapshot.recentPrompts.map((item) => (
                <Link
                  className="block rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 transition hover:bg-white"
                  href={`/library/${encodeURIComponent(item.promptId)}`}
                  key={item.promptId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{item.name}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {item.description || item.category}
                      </p>
                    </div>
                    <Badge>{titleCase(item.promptType)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        className="rounded-full border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)]"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Updated {formatRelativeDate(item.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              action={<ActionButton href="/library/new" tone="dark">Create the first prompt</ActionButton>}
              description="No prompt activity is visible yet. The beta user should be able to create, edit, and apply a template without leaving the web app."
              title="Prompt activity has not started"
            />
          )}
        </Panel>

        <Panel
          action={
            <Link
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--strategy-strong)] underline-offset-4 transition hover:text-[var(--accent-strong)] hover:underline"
              href="/runs"
            >
              Open runs
            </Link>
          }
          subtitle="The orchestration list should immediately tell you whether the backend is producing traceable work."
          title="Recent runs"
        >
          {runs.length ? (
            <div className="space-y-3">
              {runs.map((run) => (
                <Link
                  className="block rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 transition hover:bg-white"
                  href={`/runs/${encodeURIComponent(run.executionId)}`}
                  key={run.executionId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{run.projectType || 'Unknown project'}</p>
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
              action={<ActionButton href="/runs" tone="ghost">Start orchestration</ActionButton>}
              description="No orchestration runs are visible yet. The beta needs a working path from starting a run to opening its report."
              title="No run history yet"
            />
          )}
        </Panel>

        <Panel
          subtitle="These cards make the premium surface feel informed instead of ornamental."
          title="Usage and catalog signals"
          tone="strategy"
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Plan
              </p>
              <p className="mt-3 font-display text-3xl tracking-[-0.05em] text-[var(--ink)]">
                {subscription?.subscriptionTier ? titleCase(subscription.subscriptionTier) : 'Unavailable'}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {subscription?.rateLimit
                  ? `${formatNumber(subscription.rateLimit.requests)} requests every ${Math.round(subscription.rateLimit.windowMs / 3_600_000)} hour(s).`
                  : 'Rate limit details are not currently available.'}
              </p>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Library mix
              </p>
              <div className="mt-4 space-y-3">
                {Object.entries(snapshot?.counts.byPromptType ?? {}).slice(0, 4).map(([key, value]) => (
                  <div className="flex items-center justify-between text-sm" key={key}>
                    <span className="text-[var(--muted)]">{titleCase(key)}</span>
                    <span className="font-medium text-[var(--ink)]">{formatNumber(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Agent health
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {stats?.subagents?.total
                  ? `${formatNumber(stats.subagents.total)} subagents are indexed across ${formatNumber(stats.subagents.categories?.length ?? 0)} categories.`
                  : 'Subagent statistics are not available yet.'}
              </p>
              {snapshot?.recentAgents?.[0] ? (
                <p className="mt-3 text-sm text-[var(--ink)]">
                  Most recent agent success rate:{' '}
                  <span className="font-medium">
                    {formatPercent(snapshot.recentAgents[0].successRate)}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
