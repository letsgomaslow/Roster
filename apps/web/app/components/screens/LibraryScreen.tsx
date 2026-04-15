'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { EmptyState, PageIntro, Panel, Badge } from '@/app/components/control-plane/primitives';
import { useTrackPageView } from '@/app/components/control-plane/useProductEvents';
import { convexEnabled } from '@/lib/convex-client';
import { cx } from '@/lib/cx';
import { formatNumber, formatPercent, formatRelativeDate, titleCase } from '@/lib/formatters';

const PROMPT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'standard', label: 'Standard' },
  { value: 'subagent_registry', label: 'Subagents' },
  { value: 'main_agent_template', label: 'Main agents' },
  { value: 'project_orchestration_template', label: 'Project templates' },
] as const;

export function LibraryScreen() {
  useTrackPageView('library_view', { route: '/library' });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [promptType, setPromptType] = useState<(typeof PROMPT_TYPES)[number]['value']>('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const deferredSearch = useDeferredValue(search.trim());

  const library = useQuery(
    api.prompts.listLibrary,
    convexEnabled
      ? {
          search: deferredSearch || undefined,
          category: category || undefined,
          promptType: (promptType || undefined) as
            | 'standard'
            | 'subagent_registry'
            | 'main_agent_template'
            | 'project_orchestration_template'
            | undefined,
          limit: 120,
        }
      : 'skip',
  );

  const items = library?.items ?? [];
  const categoryEntries = Object.entries(library?.facets.categories ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <>
            <button
              aria-pressed={layout === 'list'}
              className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
              onClick={() => setLayout((current) => (current === 'grid' ? 'list' : 'grid'))}
              type="button"
            >
              {layout === 'grid' ? 'List view' : 'Grid view'}
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
              href="/library/new"
            >
              New prompt
            </Link>
          </>
        }
        description="This is the read-heavy part of the beta. It uses direct Convex reads for instant filtering and keeps the editor and template actions on the BFF so write flows still respect the backend contract."
        eyebrow="Prompt Library"
        title="Prompt search, filtering, and beta-ready editing"
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Panel
            subtitle="Everything important should be reachable with one search field and one visible primary action."
            title="Filters"
            tone="strategy"
          >
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr]">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--muted)]">Search library</span>
                <input
                  className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Prompt name, tag, template text"
                  value={search}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--muted)]">Prompt type</span>
                <select
                  className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                  onChange={(event) => setPromptType(event.target.value as typeof promptType)}
                  value={promptType}
                >
                  {PROMPT_TYPES.map((item) => (
                    <option key={item.value || 'all'} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--muted)]">Category</span>
                <select
                  className="w-full rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  <option value="">All categories</option>
                  {categoryEntries.map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>

          <Panel
            action={<Badge tone="info">{formatNumber(items.length)} visible</Badge>}
            subtitle="Click into any item to edit, preview variables, and inspect version history."
            title="Results"
          >
            {items.length ? (
              <div
                className={cx('gap-4', layout === 'grid' ? 'grid md:grid-cols-2' : 'flex flex-col')}
              >
                {items.map((item) => (
                  <Link
                    className={cx(
                      'rounded-[26px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white',
                      layout === 'list' && 'grid grid-cols-[1.1fr_0.5fr_0.4fr] items-center gap-4',
                    )}
                    href={`/library/${encodeURIComponent(item.promptId)}`}
                    key={item.promptId}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[var(--ink)]">{item.name}</p>
                        <Badge>{titleCase(item.promptType)}</Badge>
                        <Badge tone="info">{item.category}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {item.description || 'No description yet.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span
                            className="rounded-full border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)]"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-sm text-[var(--muted)] md:mt-0 md:flex-col md:items-start">
                      <span>{formatNumber(item.variableCount)} variables</span>
                      <span>{formatNumber(item.executionCount)} executions</span>
                      <span>{formatPercent(item.successRate)}</span>
                    </div>
                    <p className="mt-4 text-xs text-[var(--muted)] md:mt-0">
                      Updated {formatRelativeDate(item.updatedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                    href="/library/new"
                  >
                    Create a prompt
                  </Link>
                }
                description="No items matched the current filters. The beta library should always give users an obvious way to recover by clearing filters or creating a new prompt."
                title="No prompts match this view"
              />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            subtitle="These facets should stay useful even when the library grows."
            title="Category facets"
            tone="tech"
          >
            {categoryEntries.length ? (
              <div className="space-y-2">
                {categoryEntries.slice(0, 12).map(([name, count]) => (
                  <button
                    className={cx(
                      'flex w-full items-center justify-between rounded-[18px] border px-3 py-3 text-left transition',
                      category === name
                        ? 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)]'
                        : 'border-[var(--line)] bg-[var(--panel-soft)] hover:bg-white',
                    )}
                    key={name}
                    onClick={() => setCategory((current) => (current === name ? '' : name))}
                    type="button"
                  >
                    <span className="text-sm font-medium text-[var(--ink)]">{name}</span>
                    <span className="text-xs text-[var(--muted)]">{formatNumber(count)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Facet counts appear once Convex is seeded with prompt data."
                title="No categories yet"
              />
            )}
          </Panel>

          <Panel
            subtitle="The beta should make specialized prompt types obvious, not hidden in docs."
            title="Prompt type mix"
            tone="strategy"
          >
            <div className="space-y-3">
              {Object.entries(library?.facets.promptTypes ?? {}).map(([name, count]) => (
                <div
                  className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-3"
                  key={name}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--ink)]">{titleCase(name)}</span>
                    <span className="text-xs text-[var(--muted)]">{formatNumber(count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
