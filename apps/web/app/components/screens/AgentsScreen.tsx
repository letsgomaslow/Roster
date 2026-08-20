'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@convex/_generated/api';
import { EmptyState, PageIntro, Panel, Badge } from '@/app/components/control-plane/primitives';
import { useTrackPageView } from '@/app/components/control-plane/useProductEvents';
import { convexEnabled } from '@/lib/convex-client';
import { cx } from '@/lib/cx';
import { formatNumber, formatPercent, formatRelativeDate } from '@/lib/formatters';

export function AgentsScreen() {
  useTrackPageView('agents_view', { route: '/agents' });

  const [tab, setTab] = useState<'subagents' | 'main-agents'>('subagents');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  const { isAuthenticated } = useConvexAuth();
  const subagents = useQuery(
    api.prompts.listAgentCatalog,
    convexEnabled && isAuthenticated && (tab === 'subagents' || !search)
      ? {
          promptType: 'subagent_registry',
          search: deferredSearch || undefined,
          limit: 80,
        }
      : 'skip',
  );
  const mainAgents = useQuery(
    api.prompts.listAgentCatalog,
    convexEnabled && isAuthenticated && (tab === 'main-agents' || !search)
      ? {
          promptType: 'main_agent_template',
          search: deferredSearch || undefined,
          limit: 80,
        }
      : 'skip',
  );

  const active = tab === 'subagents' ? subagents : mainAgents;
  const items = active?.items ?? [];

  return (
    <div className="space-y-8">
      <PageIntro
        description="Subagents and main agents are separate surfaces because users need to understand reusable specialists differently from orchestration templates. The summaries come from Convex for fast filtering; the detail views call the backend routes for configuration and validation."
        eyebrow="Agent Catalog"
        title="Subagents and main agents in one navigation path"
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Panel
            subtitle="The split is deliberate: specialists on one side, orchestration templates on the other."
            title="Catalog"
            tone="strategy"
          >
            <div
              aria-label="Agent catalog type"
              className="flex flex-wrap items-center gap-3"
              role="group"
            >
              {[
                { id: 'subagents', label: 'Subagents', count: subagents?.total ?? 0 },
                { id: 'main-agents', label: 'Main agents', count: mainAgents?.total ?? 0 },
              ].map((item) => (
                <button
                  aria-pressed={tab === item.id}
                  className={cx(
                    'rounded-full border px-4 py-2.5 text-sm transition',
                    tab === item.id
                      ? 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[var(--strategy-strong)] shadow-[0_12px_30px_rgba(160,112,166,0.12)]'
                      : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--panel-soft)]',
                  )}
                  key={item.id}
                  onClick={() => setTab(item.id as typeof tab)}
                  type="button"
                >
                  {item.label} · {formatNumber(item.count)}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="sr-only" htmlFor="agent-search">
                Search agents
              </label>
              <input
                className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                id="agent-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search agent name, tag, or description"
                value={search}
              />
            </div>

            <div className="mt-5 space-y-3">
              {items.length ? (
                items.map((item) => (
                  <Link
                    className="block rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white"
                    href={`/agents/${tab}/${encodeURIComponent(item.promptId)}`}
                    key={item.promptId}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[var(--ink)]">{item.name}</p>
                          <Badge tone={tab === 'subagents' ? 'info' : 'success'}>
                            {tab === 'subagents' ? 'Subagent' : 'Main agent'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {item.description || item.category}
                        </p>
                      </div>
                      {item.model ? <Badge>{item.model}</Badge> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span
                          className="rounded-full border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)]"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>{formatPercent(item.successRate)}</span>
                      <span>Updated {formatRelativeDate(item.updatedAt)}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  description="No agent entries match the current query. Seed the library or clear filters to inspect the orchestration catalog."
                  title="No agents match this view"
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            subtitle="This should make it obvious whether the backend catalog is healthy."
            title="Snapshot"
            tone="tech"
          >
            <div className="space-y-3">
              <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Subagents
                </p>
                <p className="mt-3 font-heading text-3xl tracking-[-0.05em] text-[var(--ink)]">
                  {formatNumber(subagents?.total)}
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Main agents
                </p>
                <p className="mt-3 font-heading text-3xl tracking-[-0.05em] text-[var(--ink)]">
                  {formatNumber(mainAgents?.total)}
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            subtitle="The detail views should answer these questions without external docs."
            title="What the beta UI must clarify"
            tone="attention"
          >
            <ul className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              <li>1. Which MCP tools or servers each agent expects.</li>
              <li>2. Which project types the main agent is compatible with.</li>
              <li>3. Whether the subagent configuration validates before a run.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
