'use client';

import { useQuery } from 'convex/react';
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

export function WorkLibraryHomeScreen() {
  const workspace = useWorkspace();
  const recent = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready' ? { scope: 'library', limit: 6 } : 'skip',
  );
  const myWork = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready' ? { scope: 'my_work', limit: 4 } : 'skip',
  );
  const loading = workspace.status === 'bootstrapping' || recent === undefined || myWork === undefined;

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <ActionButton href="/library/new" tone="primary">
            Save new work
          </ActionButton>
        }
        description="Save reusable work once, review it as a team, and use the trusted version across your AI tools."
        eyebrow={workspace.name ?? 'Roster workspace'}
        title="Your team’s useful AI work, in one place"
      />

      {workspace.status === 'error' ? (
        <SurfaceNotice
          description={workspace.error ?? 'Ask a workspace admin to check the organization setup.'}
          title="Your workspace needs attention"
          tone="error"
        />
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          subtitle="Start with a prompt your team already keeps in a document or notes app."
          title="Save something worth reusing"
          tone="strategy"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Badge tone="brand">Best first step</Badge>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">
                Paste it, describe the outcome, and save a private draft. Roster can detect friendly fill-in fields without changing your words.
              </p>
            </div>
            <ActionButton href="/library/new" tone="secondary">Paste a prompt</ActionButton>
          </div>
        </Panel>

        <Panel
          subtitle="The first bounded playbook turns discovery material into a review-ready document."
          title="Proposal and SOW"
          tone="tech"
        >
          <Badge tone="info">Lighthouse playbook</Badge>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            Upload notes and a template, draft scope and exclusions, check consistency, approve, then download DOCX.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Bounded workflow foundation in progress
          </p>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Panel
          subtitle="Only real saved work appears here—no simulated execution or success statistics."
          title="Recently useful"
          tone="strategy"
        >
          {loading ? (
            <SkeletonList rows={4} />
          ) : recent.items.length ? (
            <div className="space-y-3">
              {recent.items.map((item) => (
                <a
                  className="block rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] p-4 transition hover:border-[var(--line-strong)] hover:bg-white"
                  href={`/library/${item.assetId}`}
                  key={item.assetId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.purpose}</p>
                    </div>
                    <Badge tone={item.reviewState.includes('approved') ? 'strategy' : 'default'}>
                      {titleCase(item.reviewState)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {titleCase(item.teamKey)} · Updated {formatRelativeDate(item.updatedAt)}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              action={<ActionButton href="/library/new" tone="primary">Save your first prompt</ActionButton>}
              description="The library begins with work your team already knows is useful."
              title="Your workspace is ready"
            />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel subtitle="A simple lifecycle makes trust visible." title="How work becomes trusted" tone="tech">
            <ol className="space-y-3">
              {[
                ['1', 'Private draft', 'Only the author and curators can work on it.'],
                ['2', 'Team shared', 'Another person can use it and provide feedback.'],
                ['3', 'Approved', 'A curator or admin approves one exact version.'],
              ].map(([number, title, description]) => (
                <li className="flex gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] p-4" key={number}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--strategy-wash)] text-xs font-semibold text-[var(--strategy-strong)]">{number}</span>
                  <div>
                    <p className="font-medium text-[var(--ink)]">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel subtitle="Continue where you left off." title="My work" tone="strategy">
            {loading ? (
              <SkeletonList dense rows={3} />
            ) : myWork.items.length ? (
              <div className="space-y-2">
                {myWork.items.slice(0, 3).map((item) => (
                  <a className="block rounded-[18px] border border-[var(--line)] px-3 py-3 text-sm font-medium text-[var(--ink)] hover:bg-[var(--panel-soft)]" href={`/library/${item.assetId}`} key={item.assetId}>
                    {item.title}
                  </a>
                ))}
                <ActionButton href="/my-work" tone="ghost">Open all my work</ActionButton>
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">Your private drafts and authored work will appear here.</p>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
