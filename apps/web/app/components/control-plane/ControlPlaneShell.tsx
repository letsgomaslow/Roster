'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { cx } from '@/lib/cx';
import { getWorkLibraryNavigation, type WorkLibraryNavItem } from '@/lib/work-library-navigation';
import { isWorkLibraryEnabled } from '@/lib/work-library-flags';
import { isLegacyAdvancedEnabled } from '@/lib/legacy-advanced-access';
import { authSurfaceAllowsHostedUi, type AuthSurfaceState } from '@/lib/auth-surface';
import { isClerkOrganizationsEnabled } from '@/lib/clerk-organizations';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import { AuthCtas } from './AuthCtas';
import { MaslowRosterLogo } from './MaslowRosterLogo';
import { AuthSurfaceFeedbackDrawer, ClerkFeedbackDrawer, FeedbackDrawer } from './FeedbackDrawer';
import { useDialogA11y } from './useDialogA11y';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
  items,
  pathname,
  onNavigate,
  mobile = false,
}: {
  items: WorkLibraryNavItem[];
  pathname: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  return (
    <nav aria-label="Primary">
      <ul className={mobile ? 'grid gap-2' : 'flex items-center gap-1'}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'block px-3 py-2 text-sm font-medium',
                  active
                    ? mobile
                      ? 'border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--panel-soft)] text-[var(--ink)]'
                      : 'border-b-[3px] border-[var(--accent)] text-[var(--ink)]'
                    : mobile
                      ? 'border border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]',
                  mobile && 'min-h-11 px-4 py-3',
                )}
                href={item.href}
                onClick={onNavigate}
              >
                <span>{item.label}</span>
                {mobile ? (
                  <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                    {item.caption}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AuthStatus({ authSurfaceState }: { authSurfaceState: AuthSurfaceState }) {
  if (authSurfaceState === 'ready' || authSurfaceState === 'loading') return null;
  const label =
    authSurfaceState === 'failed'
        ? 'Sign-in unavailable'
        : 'Sign-in is not configured';
  return (
    <p aria-live="polite" className="text-xs text-[var(--muted)]">
      {label}
    </p>
  );
}

function SignedOutControls({ authSurfaceState }: { authSurfaceState: AuthSurfaceState }) {
  if (authSurfaceState === 'loading') {
    return (
      <div
        aria-label="Preparing sign-in options"
        className="flex items-center gap-3"
        role="status"
      >
        <span aria-hidden="true" className="h-11 w-20 border border-[var(--line)] bg-[var(--panel-soft)]" />
        <span aria-hidden="true" className="h-11 w-32 bg-[var(--panel-muted)]" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <AuthStatus authSurfaceState={authSurfaceState} />
      <AuthCtas
        authSurfaceState={authSurfaceState}
        signInLabel="Sign in"
        signUpLabel="Create workspace"
      />
    </div>
  );
}

function WorkspaceControls({
  name,
  organizationsEnabled,
}: {
  name?: string;
  organizationsEnabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 md:block">
        <p className="max-w-44 truncate text-xs font-medium text-[var(--muted)]">
          {name ?? 'Preparing workspace'}
        </p>
        {organizationsEnabled ? <OrganizationSwitcher /> : null}
      </div>
      <UserButton />
    </div>
  );
}

function FeedbackDrawerForState({ authSurfaceState }: { authSurfaceState: AuthSurfaceState }) {
  if (authSurfaceAllowsHostedUi(authSurfaceState)) return <ClerkFeedbackDrawer />;
  if (authSurfaceState === 'disabled') return <FeedbackDrawer />;
  return <AuthSurfaceFeedbackDrawer authSurfaceState={authSurfaceState} />;
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
  const workspace = useWorkspace();
  const organizationsEnabled = isClerkOrganizationsEnabled(
    process.env.NEXT_PUBLIC_CLERK_ORGANIZATIONS_ENABLED,
  );
  const navItems = getWorkLibraryNavigation(
    workspace.role,
    isWorkLibraryEnabled(process.env.NEXT_PUBLIC_WORK_LIBRARY_ENABLED),
    isLegacyAdvancedEnabled(process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="min-h-screen bg-[var(--background)]">
        <header className="border-b border-[var(--line)] bg-[var(--panel)]">
          <div className="mx-auto flex min-h-20 max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-6">
              <Link
                aria-label="Go to the Roster home screen"
                className="inline-flex min-h-11 items-center"
                href="/"
              >
                <MaslowRosterLogo compact rosterSuffix={signedIn ? undefined : 'Beta'} />
              </Link>
              {signedIn ? (
                <div className="hidden xl:block">
                  <NavigationLinks items={navItems} pathname={pathname} />
                </div>
              ) : (
                <p className="hidden text-sm text-[var(--muted)] sm:block">AI Work Library</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {signedIn ? (
                <>
                  <WorkspaceControls
                    name={workspace.name}
                    organizationsEnabled={organizationsEnabled}
                  />
                  <button
                    aria-controls="mobile-navigation-panel"
                    aria-expanded={mobileNavOpen}
                    aria-haspopup="dialog"
                    className="min-h-11 border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] xl:hidden"
                    onClick={() => setMobileNavOpen(true)}
                    ref={mobileNavTriggerRef}
                    type="button"
                  >
                    Menu
                  </button>
                </>
              ) : (
                <div className="hidden sm:block">
                  <SignedOutControls authSurfaceState={authSurfaceState} />
                </div>
              )}
            </div>
          </div>
        </header>

        {signedIn ? (
          <div
            aria-hidden={!mobileNavOpen}
            className={cx(
              'fixed inset-0 z-30 xl:hidden',
              mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
            )}
            inert={!mobileNavOpen}
          >
            <button
              aria-label="Close navigation"
              className={cx(
                'absolute inset-0 bg-black/30 transition-opacity duration-[180ms] ease-out motion-reduce:transition-none',
                mobileNavOpen ? 'opacity-100' : 'opacity-0',
              )}
              onClick={() => setMobileNavOpen(false)}
              type="button"
            />
            <div
              aria-labelledby="mobile-navigation-title"
              aria-modal="true"
              className={cx(
                'absolute inset-y-3 right-3 w-[min(88vw,320px)] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel)] transition-[transform,opacity] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                mobileNavOpen
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-[calc(100%+0.75rem)] opacity-0',
              )}
              id="mobile-navigation-panel"
              ref={mobileNavRef}
              role="dialog"
              tabIndex={-1}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
                <p className="font-semibold text-[var(--ink)]" id="mobile-navigation-title">
                  Menu
                </p>
                <button
                  className="min-h-11 border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
                  onClick={() => setMobileNavOpen(false)}
                  ref={mobileNavCloseRef}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="mt-4">
                <NavigationLinks
                  items={navItems}
                  mobile
                  onNavigate={() => setMobileNavOpen(false)}
                  pathname={pathname}
                />
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8" id="main-content">
          {children}
        </main>
      </div>
      <FeedbackDrawerForState authSurfaceState={authSurfaceState} />
    </>
  );
}
