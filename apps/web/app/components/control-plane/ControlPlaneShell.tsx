'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { openFeedback } from '@/lib/control-plane-events';
import { cx } from '@/lib/cx';
import { MaslowRosterLogo } from './MaslowRosterLogo';
import { CommandPalette } from './CommandPalette';
import { ClerkFeedbackDrawer, FeedbackDrawer } from './FeedbackDrawer';
import { useDialogA11y } from './useDialogA11y';

const NAV_ITEMS = [
  { href: '/', label: 'Home', caption: 'Overview' },
  { href: '/library', label: 'Library', caption: 'Prompts' },
  { href: '/agents', label: 'Agents', caption: 'Catalog' },
  { href: '/runs', label: 'Runs', caption: 'Execution' },
  { href: '/integrations', label: 'Integrations', caption: 'MCP setup' },
  { href: '/settings', label: 'Settings', caption: 'Usage' },
];

const AUTH_REDIRECT_URL = '/';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ClerkAuthSection() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="flex flex-wrap gap-2">
        <SignInButton
          fallbackRedirectUrl={AUTH_REDIRECT_URL}
          forceRedirectUrl={AUTH_REDIRECT_URL}
          signUpFallbackRedirectUrl={AUTH_REDIRECT_URL}
          signUpForceRedirectUrl={AUTH_REDIRECT_URL}
        >
          <button className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--ink)] transition hover:bg-white">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton
          fallbackRedirectUrl={AUTH_REDIRECT_URL}
          forceRedirectUrl={AUTH_REDIRECT_URL}
          signInFallbackRedirectUrl={AUTH_REDIRECT_URL}
          signInForceRedirectUrl={AUTH_REDIRECT_URL}
        >
          <button className="rounded-full bg-[var(--button-primary)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]">
            Create account
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Session
        </p>
        <p className="mt-1 text-sm text-[var(--ink)]">Private beta workspace</p>
      </div>
      <UserButton />
    </div>
  );
}

function DisabledAuthSection() {
  return (
    <div className="rounded-[24px] border border-[var(--attention-soft)] bg-[var(--attention-wash)] px-4 py-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--ink)]">
        Auth disabled
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
        Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/web/.env.local` to
        enable Clerk without keyless development mode.
      </p>
    </div>
  );
}

export function ControlPlaneShell({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode;
  clerkEnabled: boolean;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement | null>(null);

  useDialogA11y({
    open: mobileNavOpen,
    onClose: () => setMobileNavOpen(false),
    containerRef: mobileNavRef,
    initialFocusRef: mobileNavCloseRef,
    returnFocusRef: mobileNavTriggerRef,
  });

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto grid min-h-screen max-w-[1760px] gap-4 px-3 py-3 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <div
            aria-hidden={!mobileNavOpen}
            className={cx(
              'fixed inset-0 z-20 bg-black/30 backdrop-blur-[2px] transition xl:hidden',
              mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            aria-label="Primary navigation"
            aria-modal={mobileNavOpen ? 'true' : undefined}
            className={cx(
              'fixed inset-y-3 left-3 z-30 w-[280px] rounded-[34px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl transition xl:static xl:w-auto xl:translate-x-0',
              mobileNavOpen ? 'translate-x-0' : '-translate-x-[110%] xl:translate-x-0',
            )}
            id="primary-navigation-panel"
            ref={mobileNavRef}
            role={mobileNavOpen ? 'dialog' : undefined}
            tabIndex={mobileNavOpen ? -1 : undefined}
          >
            <div className="flex items-center justify-between">
              <Link aria-label="Go to the Roster home screen" href="/">
                <MaslowRosterLogo rosterSuffix="Beta" />
              </Link>
              <button
                className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-white xl:hidden"
                onClick={() => setMobileNavOpen(false)}
                ref={mobileNavCloseRef}
                type="button"
              >
                Close
              </button>
            </div>

            <nav aria-label="Primary" className="mt-8 space-y-2">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'block rounded-[24px] border px-4 py-3 transition',
                      active
                        ? 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                        : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]',
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <p className="font-medium">{item.label}</p>
                    <p
                      className={cx(
                        'mt-1 text-sm',
                        active ? 'text-[var(--strategy-strong)]' : 'text-[var(--muted)]',
                      )}
                    >
                      {item.caption}
                    </p>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[var(--panel-strong)] px-4 py-4 text-white [background-image:var(--panel-strong-gradient)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/70">
                Beta posture
              </p>
              <p className="mt-3 text-lg font-medium tracking-[-0.03em]">
                Fast path for Claude Desktop, Cursor, and any MCP-compatible host.
              </p>
              <p className="mt-2 text-sm leading-6 text-white/82">
                The web app mirrors the MCP server surface, so the shortest route from setup to
                feedback stays inside one control plane.
              </p>
              <button
                className="mt-4 rounded-full bg-[var(--button-primary)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                onClick={() => openFeedback({ page: 'Sidebar', route: pathname })}
                type="button"
              >
                Send beta feedback
              </button>
            </div>

            <div className="mt-8 border-t border-[var(--line)] pt-5">
              {clerkEnabled ? <ClerkAuthSection /> : <DisabledAuthSection />}
            </div>
          </aside>

          <main
            className="rounded-[34px] border border-[var(--line)] bg-[var(--panel)] px-4 py-4 shadow-[var(--shadow-panel)] backdrop-blur-xl md:px-6 md:py-5"
            id="main-content"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-3">
                <button
                  aria-controls="primary-navigation-panel"
                  aria-expanded={mobileNavOpen}
                  aria-haspopup="dialog"
                  className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-white xl:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  ref={mobileNavTriggerRef}
                  type="button"
                >
                  Menu
                </button>
                <Link aria-label="Go to the Roster home screen" className="xl:hidden" href="/">
                  <MaslowRosterLogo compact />
                </Link>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--strategy-strong)]">
                    Control plane
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink)]">
                    {pathname === '/' ? 'Operational overview' : pathname}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  aria-haspopup="dialog"
                  aria-label="Open command palette"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--ink)] transition hover:bg-white"
                  onClick={() => setPaletteOpen(true)}
                  type="button"
                >
                  Search
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    ⌘K
                  </span>
                </button>
                <button
                  className="rounded-full bg-[var(--button-primary)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                  onClick={() => openFeedback({ page: pathname, route: pathname })}
                  type="button"
                >
                  Feedback
                </button>
              </div>
            </div>

            <div className="py-6">{children}</div>
          </main>

          <aside
            aria-label="Control plane guidance"
            className="hidden rounded-[34px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl xl:block"
          >
            <div className="space-y-6">
              <section className="rounded-[28px] border border-[var(--tech-soft)] bg-[linear-gradient(180deg,rgba(115,193,174,0.12),rgba(255,255,255,0.9))] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--strategy-strong)]">
                  Navigation model
                </p>
                <p className="mt-3 text-lg font-medium tracking-[-0.03em] text-[var(--ink)]">
                  Setup on the left, execution in the center, recovery on the right.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Each page keeps one primary action visible and routes secondary friction into the
                  feedback drawer instead of hiding it behind docs.
                </p>
              </section>

              <section className="rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[var(--panel-strong)] px-4 py-4 text-white [background-image:var(--panel-strong-gradient)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/72">
                  Beta rubric
                </p>
                <ul className="mt-3 space-y-3 text-sm text-white/86">
                  <li>1. Setup must finish without opening repository docs.</li>
                  <li>2. Prompt edits must land in under three steps.</li>
                  <li>3. Every backend capability needs an obvious UI entry point.</li>
                </ul>
              </section>

              <section className="rounded-[28px] border border-[var(--strategy-soft)] bg-[linear-gradient(180deg,rgba(160,112,166,0.1),rgba(255,255,255,0.9))] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--strategy-strong)]">
                  Quick keys
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                  <p className="flex items-center justify-between">
                    <span>Open command palette</span>
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      ⌘K
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Open feedback drawer</span>
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      UI
                    </span>
                  </p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <CommandPalette onOpenChange={setPaletteOpen} open={paletteOpen} />
      {clerkEnabled ? <ClerkFeedbackDrawer /> : <FeedbackDrawer />}
    </>
  );
}
