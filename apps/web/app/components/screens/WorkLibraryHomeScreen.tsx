'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  PageIntro,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { formatRelativeDate } from '@/lib/formatters';
import { selectHomeGalleryItems, type HomeGalleryItem } from '@/lib/onboarding';
import { buildWorkDescriptionPreview } from '@/lib/work-description';

function AssetCard({ item, actionLabel }: { item: HomeGalleryItem; actionLabel: string }) {
  const approved = item.reviewState.includes('approved');
  const purposePreview = buildWorkDescriptionPreview(item.purpose);
  const trustLabel =
    item.reviewState === 'workspace_approved' || item.reviewState === 'team_approved'
      ? 'Approved'
        : item.reviewState === 'shared'
          ? 'Ready for review'
          : item.reviewState === 'draft'
            ? 'Private draft'
            : 'Archived';

  return (
    <Link
      className="group flex min-h-52 min-w-0 flex-col border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-[var(--line-strong)] hover:bg-[var(--panel-soft)]"
      href={`/library/${item.assetId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone={approved ? 'strategy' : 'default'}>{trustLabel}</Badge>
        <span className="text-xs text-[var(--muted)]">{formatRelativeDate(item.updatedAt)}</span>
      </div>
      <h3 className="mt-5 line-clamp-2 text-lg font-semibold tracking-[-0.02em] text-[var(--ink)] [overflow-wrap:anywhere]">
        {item.title}
      </h3>
      {purposePreview.summary ? (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--muted)] [overflow-wrap:anywhere]">
          {purposePreview.summary}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
        <Badge tone="default">Version {item.versionNumber ?? 'current'}</Badge>
        <Badge tone="default">Owner recorded</Badge>
      </div>
      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[var(--ink)]">
        {actionLabel}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function GalleryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading saved work" className="grid gap-3 md:grid-cols-3" role="status">
      {[0, 1, 2].map((item) => (
        <div
          aria-hidden="true"
          className="min-h-52 border border-[var(--line)] bg-[var(--panel-soft)]"
          key={item}
        />
      ))}
    </div>
  );
}

function GallerySection({
  title,
  description,
  items,
  actionLabel,
  loading,
  empty,
}: {
  title: string;
  description: string;
  items: HomeGalleryItem[];
  actionLabel: string;
  loading: boolean;
  empty: ReactNode;
}) {
  return (
    <section aria-labelledby={`gallery-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className="text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]"
            id={`gallery-${title.toLowerCase().replaceAll(' ', '-')}`}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {loading ? (
        <GalleryLoading />
      ) : items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <AssetCard actionLabel={actionLabel} item={item} key={item.assetId} />
          ))}
        </div>
      ) : (
        <div className="min-h-36 border border-dashed border-[var(--line-strong)] bg-[var(--panel-soft)] p-5 text-sm leading-7 text-[var(--muted)]">
          {empty}
        </div>
      )}
    </section>
  );
}

export function WorkLibraryHomeScreen() {
  const workspace = useWorkspace();
  const library = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready' ? { scope: 'library', limit: 24 } : 'skip',
  );
  const myWork = useQuery(
    api.workLibrary.listLibrary,
    workspace.status === 'ready' ? { scope: 'my_work', limit: 6 } : 'skip',
  );
  const loading =
    workspace.status === 'bootstrapping' || library === undefined || myWork === undefined;
  const gallery = selectHomeGalleryItems({
    library: library?.items ?? [],
    myWork: myWork?.items ?? [],
  });

  return (
    <div className="space-y-10">
      <PageIntro
        actions={
          <Link
            className="inline-flex min-h-12 items-center justify-center bg-[var(--button-primary)] px-5 py-3 text-sm font-semibold text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)]"
            href="/library"
          >
            Browse the Library
          </Link>
        }
        description="Choose trusted work, pick up a draft, or return to something you use often."
        eyebrow={workspace.name ?? 'Roster workspace'}
        title="What would you like to get done?"
      />

      <form action="/library" className="grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] border border-[var(--line-strong)] bg-white" method="get" role="search">
        <label className="sr-only" htmlFor="home-library-search">Search the work Library</label>
        <input
          className="min-h-12 min-w-0 bg-transparent px-4 text-sm text-[var(--ink)] outline-none"
          id="home-library-search"
          name="q"
          placeholder="Search by outcome, team, or task"
          type="search"
        />
        <button className="border-l border-[var(--line)] bg-[var(--panel-soft)] px-5 text-sm font-semibold text-[var(--ink)]" type="submit">
          Search
        </button>
      </form>

      {workspace.status === 'error' ? (
        <div className="space-y-4">
          <SurfaceNotice
            description="Roster could not verify your workspace access. Reload and try again."
            title="Your workspace needs attention"
            tone="error"
          />
          {workspace.retry ? (
            <ActionButton onClick={workspace.retry} tone="primary">
              Reload workspace
            </ActionButton>
          ) : null}
        </div>
      ) : (
        <div className="space-y-10">
          <GallerySection
            actionLabel="Continue"
            description="Your most recently edited work."
            empty={
              <>
                Work you save will appear here.{' '}
                <Link className="font-semibold text-[var(--ink)] underline underline-offset-4" href="/library/new">
                  Save useful work
                </Link>
              </>
            }
            items={gallery.continueWorking}
            loading={loading}
            title="Continue working"
          />

          <GallerySection
            actionLabel="Open favorite"
            description="The work you want close at hand."
            empty={
              <>
                Mark useful work as a favorite and it will stay easy to find.{' '}
                <Link className="font-semibold text-[var(--ink)] underline underline-offset-4" href="/library">
                  Browse the Library
                </Link>
              </>
            }
            items={gallery.favorites}
            loading={loading}
            title="Favorites"
          />

          <GallerySection
            actionLabel="Use"
            description="Work reviewed for team or workspace use."
            empty={
              <>
                Approved work will appear here after a curator reviews it.{' '}
                <Link className="font-semibold text-[var(--ink)] underline underline-offset-4" href="/library">
                  See all shared work
                </Link>
              </>
            }
            items={gallery.recentlyApproved}
            loading={loading}
            title="Recently approved"
          />
        </div>
      )}
    </div>
  );
}
