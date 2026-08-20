'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useAuth } from '@clerk/nextjs';
import { openFeedback } from '@/lib/control-plane-events';
import { cx } from '@/lib/cx';
import { authSurfaceAllowsHostedUi, type AuthSurfaceState } from '@/lib/auth-surface';
import { AuthCtas } from './AuthCtas';
import { MaslowRosterLogo } from './MaslowRosterLogo';
import { CommandPalette } from './CommandPalette';
import { AuthSurfaceFeedbackDrawer, ClerkFeedbackDrawer, FeedbackDrawer } from './FeedbackDrawer';
import { useDialogA11y } from './useDialogA11y';

const NAV_ITEMS = [
  { href: '/', label: 'Home', caption: 'Overview' },
  { href: '/library', label: 'Library', caption: 'Prompts' },
  { href: '/agents', label: 'Agents', caption: 'Catalog' },
  { href: '/runs', label: 'Runs', caption: 'Execution' },
  { href: '/integrations', label: 'Integrations', caption: 'MCP setup' },
  { href: '/settings', label: 'Settings', caption: 'Usage' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function describePathname(pathname: string) {
  if (pathname === '/') return 'Operational overview';
  if (pathname === '/getting-started') return 'Setup checklist';
  if (pathname.startsWith('/library/new')) return 'New prompt';
  if (pathname.startsWith('/library/')) return 'Prompt detail';
  if (pathname === '/library') return 'Prompt library';
  if (pathname.startsWith('/agents/')) return 'Agent detail';
  if (pathname === '/agents') return 'Agent catalog';
  if (pathname.startsWith('/runs/')) return 'Run detail';
  if (pathname === '/runs') return 'Execution history';
  if (pathname === '/integrations') return 'Host and MCP setup';
  if (pathname === '/settings') return 'Usage and feedback';
  return pathname;
}

function ClerkAuthSection({ authSurfaceState }: { authSurfaceState: AuthSurfaceState }) {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="space-y-3">
        <AuthCtas authSurfaceState={authSurfaceState} layout="stack" />
        <p className="text-sm leading-6 text-[var(--muted)]">
          Open public beta uses Google, GitHub, or email and lands new users on a setup checklist
          before the full dashboard.
        </p>
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

function AuthUnavailableSection({ authSurfaceState }: { authSurfaceState: AuthSurfaceState }) {
  const copy =
    authSurfaceState === 'loading'
      ? 'Hosted auth is still loading. The signed-out shell stays visible until Clerk finishes booting.'
      : 'Hosted auth failed to initialize in this browser session. Reload the page after checking your local Clerk configuration.';

  return (
    <div className="rounded-[24px] border border-[var(--attention-soft)] bg-[var(--attention-wash)] px-4 py-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--ink)]">
        Auth unavailable
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{copy}</p>
    </div>
  );
}

export function ControlPlaneShell({
  children,
  authSurfaceState,
  signedIn,
}: {
  children: React.ReactNode;
  authSurfaceState: AuthSurfaceState;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement | null>(null);

  useDialogA11y({
    open: mobileNavOpen,
    onClose: () => setMobileNavOpen(false),
    containerRef: mobileNavRef,
    initialFocusRef: mobileNavCloseRef,
    returnFocusRef: mobileNavTriggerRef,
  });

  const isPublicEntrySurface =
    !signedIn &&
    (pathname === '/' ||
      pathname === '/getting-started' ||
      authSurfaceState === 'loading' ||
      authSurfaceState === 'failed');

  const authHeaderCopy =
    authSurfaceState === 'ready'
      ? 'Hosted auth with Google, GitHub, and email. New sessions go to setup first.'
      : authSurfaceState === 'loading'
        ? 'Checking hosted auth before the app enables any signed-in surfaces.'
        : authSurfaceState === 'failed'
          ? 'Hosted auth failed to initialize, so the app fell back to the signed-out beta surface.'
          : 'Hosted auth is disabled until Clerk keys are configured in apps/web/.env.local.';

  if (isPublicEntrySurface) {
    return (
      <>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="min-h-screen bg-[var(--background)]">
          <div className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 md:px-6">
            <div className="rounded-[34px] border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[var(--shadow-panel)] md:px-7 md:py-6">
              <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-center md:justify-between">
                <Link aria-label="Go to the Roster public beta entry" href="/">
                  <MaslowRosterLogo rosterSuffix="Public Beta" />
                </Link>
                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-sm text-[var(--muted)]">{authHeaderCopy}</p>
                  <AuthCtas
                    authSurfaceState={authSurfaceState}
                    signInLabel="Sign in"
                    signUpLabel="Create account"
                  />
                </div>
              </header>
              <main className="pt-8" id="main-content">
                {children}
              </main>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto grid min-h-screen max-w-[1440px] gap-4 px-3 py-3 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div
            aria-hidden={!mobileNavOpen}
            className={cx(
              'fixed inset-0 z-20 bg-black/30 backdrop-blur-[2px] transition xl:hidden',
              mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            aria-describedby="mobile-navigation-description"
            aria-labelledby="mobile-navigation-title"
            aria-modal={mobileNavOpen ? 'true' : undefined}
            className={cx(
              'fixed inset-y-3 left-3 z-30 w-[280px] transition xl:static xl:w-auto',
              mobileNavOpen ? 'translate-x-0' : '-translate-x-[110%] xl:translate-x-0',
            )}
            ref={mobileNavRef}
            role={mobileNavOpen ? 'dialog' : undefined}
            tabIndex={mobileNavOpen ? -1 : undefined}
          >
            <aside
              aria-label={mobileNavOpen ? undefined : 'Primary navigation'}
              className="rounded-[34px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl"
              id="primary-navigation-panel"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--strategy-strong)] xl:hidden"
                    id="mobile-navigation-title"
                  >
                    Primary navigation
                  </p>
                  <p className="sr-only" id="mobile-navigation-description">
                    Navigation links for the core control-plane areas.
                  </p>
                  <Link aria-label="Go to the Roster home screen" href="/">
                    <MaslowRosterLogo rosterSuffix="Beta" />
                  </Link>
                </div>
                <button
                  className="min-h-11 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-white xl:hidden"
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
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/85">
                  Beta posture
                </p>
                <p className="mt-3 text-lg font-medium tracking-[-0.03em]">
                  Setup, prompts, and execution now share one operating surface.
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  The shell keeps primary actions obvious, secondary work visible, and recovery
                  paths close to the workflows they unblock.
                </p>
                <button
                  className="mt-4 min-h-11 rounded-full bg-[var(--button-primary)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                  onClick={() => openFeedback({ page: 'Sidebar', route: pathname })}
                  type="button"
                >
                  Share beta feedback
                </button>
              </div>

              <div className="mt-8 border-t border-[var(--line)] pt-5">
                {authSurfaceState === 'ready' ? (
                  <ClerkAuthSection authSurfaceState={authSurfaceState} />
                ) : authSurfaceState === 'disabled' ? (
                  <DisabledAuthSection />
                ) : (
                  <AuthUnavailableSection authSurfaceState={authSurfaceState} />
                )}
              </div>
            </aside>
          </div>

          <main
            className="rounded-[34px] border border-[var(--line)] bg-[var(--panel)] px-4 py-4 shadow-[var(--shadow-panel)] backdrop-blur-xl md:px-6 md:py-5"
            id="main-content"
          >
            <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  aria-controls="primary-navigation-panel"
                  aria-expanded={mobileNavOpen}
                  aria-haspopup="dialog"
                  className="min-h-11 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-white xl:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  ref={mobileNavTriggerRef}
                  type="button"
                >
                  Menu
                </button>
                <Link aria-label="Go to the Roster home screen" className="xl:hidden" href="/">
                  <MaslowRosterLogo compact />
                </Link>
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--strategy-strong)]">
                    Control plane
                  </p>
                  <p className="text-sm text-[var(--ink)]">{describePathname(pathname)}</p>
                  <p className="text-sm text-[var(--muted)]">
                    One primary action per screen, with setup and recovery kept visible.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  aria-haspopup="dialog"
                  aria-label="Open command palette"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--ink)] transition hover:bg-white"
                  onClick={() => setPaletteOpen(true)}
                  type="button"
                >
                  Search
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    ⌘K
                  </span>
                </button>
                <button
                  aria-label="Share beta feedback"
                  className="min-h-11 rounded-full bg-[var(--button-primary)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
                  onClick={() => openFeedback({ page: pathname, route: pathname })}
                  type="button"
                >
                  Share beta feedback
                </button>
              </div>
            </div>

            <div className="py-6">{children}</div>
          </main>
        </div>
      </div>

      <CommandPalette onOpenChange={setPaletteOpen} open={paletteOpen} />
      {authSurfaceAllowsHostedUi(authSurfaceState) ? (
        <ClerkFeedbackDrawer />
      ) : authSurfaceState === 'disabled' ? (
        <FeedbackDrawer />
      ) : (
        <AuthSurfaceFeedbackDrawer authSurfaceState={authSurfaceState} />
      )}
    </>
  );
}
