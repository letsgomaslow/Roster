'use client';

import { useDeferredValue, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { openFeedback } from '@/lib/control-plane-events';
import { convexEnabled } from '@/lib/convex-client';
import { cx } from '@/lib/cx';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { MaslowRosterLogo } from './MaslowRosterLogo';
import { useDialogA11y } from './useDialogA11y';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATIC_ITEMS = [
  { id: 'go-home', label: 'Go to Home', description: 'Overview and readiness dashboard', href: '/' },
  { id: 'go-library', label: 'Open Library', description: 'Search prompts and templates', href: '/library' },
  { id: 'go-agents', label: 'Browse Agents', description: 'Inspect subagents and main agents', href: '/agents' },
  { id: 'go-runs', label: 'Inspect Runs', description: 'Review orchestration history', href: '/runs' },
  { id: 'go-integrations', label: 'Open Integrations', description: 'Claude Desktop, Cursor, and MCP setup', href: '/integrations' },
  { id: 'go-settings', label: 'Open Settings', description: 'Plan, usage, feedback, and environment', href: '/settings' },
] as const;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const library = useQuery(
    api.prompts.listLibrary,
    convexEnabled && open
      ? { search: deferredQuery || undefined, limit: 8 }
      : 'skip',
  );

  function closePalette() {
    onOpenChange(false);
    setQuery('');
  }

  useDialogA11y({
    open,
    onClose: closePalette,
    containerRef,
    initialFocusRef: inputRef,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === 'Escape') {
        onOpenChange(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange, open]);

  const text = deferredQuery.toLowerCase();
  const staticMatches = STATIC_ITEMS.filter((item) => {
    if (!text) return true;
    return (
      item.label.toLowerCase().includes(text) ||
      item.description.toLowerCase().includes(text) ||
      item.href.toLowerCase().includes(text)
    );
  });

  const actionMatches = [
    {
      id: 'new-prompt',
      label: 'New prompt',
      description: 'Create a prompt in the beta library',
      action: () => {
        closePalette();
        router.push('/library/new');
      },
    },
    {
      id: 'send-feedback',
      label: 'Send feedback',
      description: 'Open the contextual beta feedback drawer',
      action: () => {
        closePalette();
        openFeedback({ page: 'Command palette', route: window.location.pathname });
      },
    },
    {
      id: 'open-setup',
      label: 'Open setup guide',
      description: 'Jump to integrations onboarding',
      action: () => {
        closePalette();
        router.push('/integrations');
      },
    },
  ].filter((item) => {
    if (!text) return true;
    return item.label.toLowerCase().includes(text) || item.description.toLowerCase().includes(text);
  });

  return (
    <>
      <div
        aria-hidden={!open}
        className={cx(
          'fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px] transition',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        hidden={!open}
        onClick={() => closePalette()}
      />
      <div
        className={cx(
          'fixed left-1/2 top-20 z-[60] w-[min(92vw,840px)] -translate-x-1/2 rounded-[34px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow-panel-strong)] backdrop-blur-xl transition duration-300',
          open ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none',
        )}
        aria-describedby={descriptionId}
        aria-label="Command palette"
        aria-labelledby={titleId}
        aria-modal="true"
        hidden={!open}
        ref={containerRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="sr-only">
          <h2 id={titleId}>Command palette</h2>
          <p id={descriptionId}>
            Search prompts, navigate between pages, and run global control plane actions.
          </p>
        </div>
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <MaslowRosterLogo compact />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Quick navigation and prompt lookup
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3">
          <label className="sr-only" htmlFor={inputId}>
            Search commands and prompts
          </label>
          <input
            autoFocus={open}
            className="w-full bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            id={inputId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prompts, jump between pages, run actions"
            ref={inputRef}
            value={query}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-[var(--strategy-soft)] bg-[linear-gradient(180deg,rgba(160,112,166,0.1),rgba(255,255,255,0.9))] p-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Navigation
            </p>
            <div className="mt-2 space-y-1">
              {staticMatches.map((item) => (
                <Link
                  className="block rounded-[20px] px-3 py-3 transition hover:bg-white/90"
                  href={item.href}
                  key={item.id}
                  onClick={() => closePalette()}
                >
                  <p className="font-medium text-[var(--ink)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-[28px] border border-[var(--tech-soft)] bg-[linear-gradient(180deg,rgba(115,193,174,0.1),rgba(255,255,255,0.9))] p-3">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Actions
              </p>
              <div className="mt-2 space-y-1">
                {actionMatches.map((item) => (
                  <button
                    className="block w-full rounded-[20px] px-3 py-3 text-left transition hover:bg-white/90"
                    key={item.id}
                    onClick={item.action}
                    type="button"
                  >
                    <p className="font-medium text-[var(--ink)]">{item.label}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-soft)] p-3">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Prompt Search
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {library ? `${library.total} results` : 'Convex search'}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                {library?.items?.length ? (
                  library.items.slice(0, 6).map((item) => (
                    <button
                      className="block w-full rounded-[20px] px-3 py-3 text-left transition hover:bg-white/90"
                      key={item.promptId}
                      onClick={() => {
                        closePalette();
                        router.push(`/library/${encodeURIComponent(item.promptId)}`);
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[var(--ink)]">{item.name}</p>
                        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {titleCase(item.promptType)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{item.description || item.category}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Updated {formatRelativeDate(item.updatedAt)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[20px] px-3 py-5 text-sm text-[var(--muted)]">
                    {convexEnabled
                      ? 'Type to search the prompt library.'
                      : 'Set NEXT_PUBLIC_CONVEX_URL to enable instant prompt search.'}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
