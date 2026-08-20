'use client';

import { usePathname } from 'next/navigation';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import {
  ActionButton,
  Badge,
  EmptyState,
  PageIntro,
  Panel,
} from '@/app/components/control-plane/primitives';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';

type RouteMode = 'signed_out' | 'loading' | 'failed';

type RouteMeta = {
  eyebrow: string;
  signedOutTitle: string;
  summary: string;
  bullets: string[];
  supportTitle: string;
  supportDescription: string;
  supportHref: string;
  supportLabel: string;
};

const LIBRARY_META: RouteMeta = {
  eyebrow: 'Team library',
  signedOutTitle: 'Sign in to open your team’s Library',
  summary: 'Find trusted work, add the details that change, and reuse the exact version your team reviewed.',
  bullets: [
    'Find trusted work by outcome, team, or owner.',
    'Fill in friendly fields without changing the saved instructions.',
    'Copy, review, or export one dependable version.',
  ],
  supportTitle: 'Want to see the first-use flow?',
  supportDescription: 'The guided introduction shows how a teammate or workspace owner gets started.',
  supportHref: '/getting-started',
  supportLabel: 'See how Roster works',
};

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/library')) return LIBRARY_META;

  if (pathname.startsWith('/my-work')) {
    return {
      ...LIBRARY_META,
      eyebrow: 'My work',
      signedOutTitle: 'Sign in to continue your saved work',
      summary: 'Return to your private drafts, favorites, and work you have shared with the team.',
    };
  }

  if (pathname.startsWith('/approvals')) {
    return {
      ...LIBRARY_META,
      eyebrow: 'Approvals',
      signedOutTitle: 'Sign in to review team work',
      summary: 'Curators and admins review one exact version before the team treats it as trusted.',
      bullets: [
        'Read the purpose and exact saved instructions.',
        'Check the version and existing evidence.',
        'Approve only the version you reviewed.',
      ],
    };
  }

  if (pathname.startsWith('/integrations')) {
    return {
      eyebrow: 'Setup Center',
      signedOutTitle: 'Sign in to open the Setup Center',
      summary: 'Connecting another AI tool is optional. Roster remains useful for search, copy, review, and export without a connection.',
      bullets: [
        'Choose the AI tool you already use.',
        'See whether you can connect it yourself or need an administrator.',
        'Follow one short, product-specific setup guide.',
      ],
      supportTitle: 'Prefer to start with useful work?',
      supportDescription: 'Open the Library first. Connections can wait until they would save your team time.',
      supportHref: '/library',
      supportLabel: 'Go to the Library',
    };
  }

  if (pathname.startsWith('/workspace-admin')) {
    return {
      eyebrow: 'Library settings',
      signedOutTitle: 'Sign in to manage Library settings',
      summary:
        'Curators organize teams and work types. Owners and admins also manage workspace controls.',
      bullets: [
        'Keep Library labels clear and current.',
        'Archive labels without deleting saved work.',
        'Keep people and policy controls restricted to owners and admins.',
      ],
      supportTitle: 'Looking for everyday work?',
      supportDescription: 'The normal Library stays focused on finding, saving, and using team work.',
      supportHref: '/library',
      supportLabel: 'Go to the Library',
    };
  }

  if (
    pathname.startsWith('/advanced') ||
    pathname.startsWith('/agents') ||
    pathname.startsWith('/runs') ||
    pathname.startsWith('/settings')
  ) {
    return {
      eyebrow: 'Advanced',
      signedOutTitle: 'Sign in to open this advanced workspace area',
      summary: 'Technical setup and legacy tools stay available to workspace admins without crowding the everyday Library.',
      bullets: ['Keep advanced settings role-gated.', 'Inspect technical detail only when needed.', 'Return to the Library for everyday work.'],
      supportTitle: 'Looking for the simple experience?',
      supportDescription: 'Start in the Library and open Advanced only when a technical task requires it.',
      supportHref: '/library',
      supportLabel: 'Go to the Library',
    };
  }

  return {
    eyebrow: 'Roster',
    signedOutTitle: 'Sign in to continue',
    summary: 'Your workspace keeps reusable AI work private to the people who belong there.',
    bullets: ['Find useful work.', 'Save a private draft.', 'Share one exact version when it is ready.'],
    supportTitle: 'New to Roster?',
    supportDescription: 'See the short first-use experience before you sign in.',
    supportHref: '/getting-started',
    supportLabel: 'See how Roster works',
  };
}

export function RouteStatusScreen({
  authSurfaceState,
  diagnostic,
  mode,
  pathname: pathnameProp,
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
  mode: RouteMode;
  pathname?: string;
}) {
  const pathname = usePathname();
  const meta = getRouteMeta(pathnameProp ?? pathname);
  const heading =
    mode === 'signed_out'
      ? meta.signedOutTitle
      : mode === 'loading'
        ? `Opening ${meta.eyebrow}`
        : `${meta.eyebrow} is temporarily unavailable`;
  const description =
    mode === 'signed_out'
      ? meta.summary
      : mode === 'loading'
        ? 'This page will stay in place while your sign-in session finishes loading.'
        : 'Roster kept your current destination in place. Reload to try sign-in again without losing context.';

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          mode === 'signed_out' ? (
            <AuthCtas
              authSurfaceState={authSurfaceState}
              signInLabel="Sign in"
              signUpLabel="Create workspace"
            />
          ) : undefined
        }
        description={description}
        eyebrow={meta.eyebrow}
        title={heading}
      />

      <Badge tone={mode === 'failed' ? 'warning' : mode === 'loading' ? 'info' : 'brand'}>
        {mode === 'signed_out' ? 'Workspace sign-in required' : mode === 'loading' ? 'Opening workspace' : 'Try again'}
      </Badge>

      {mode !== 'signed_out' ? (
        <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel subtitle="The page stays focused on what you can accomplish after sign-in." title="What you can do here" tone="strategy">
          <ol className="grid gap-3">
            {meta.bullets.map((bullet, index) => (
              <li className="flex items-start gap-3 border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4" key={bullet}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-xs font-semibold text-[var(--strategy-strong)]">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-6 text-[var(--ink-soft)]">{bullet}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel subtitle={meta.supportDescription} title={meta.supportTitle} tone="tech">
          <div className="space-y-4">
            <ActionButton href={meta.supportHref} tone="ghost">
              {meta.supportLabel}
            </ActionButton>
            <EmptyState
              description={
                mode === 'signed_out'
                  ? 'Your workspace content remains private until sign-in succeeds.'
                  : 'Your destination will remain the same while you retry.'
              }
              title={mode === 'signed_out' ? 'Your work stays protected' : 'Your place is saved'}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
