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
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';

type RouteMode = 'signed_out' | 'loading' | 'failed';

type RouteMeta = {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  supportTitle: string;
  supportDescription: string;
  supportHref: string;
  supportLabel: string;
};

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/library')) {
    return {
      eyebrow: 'Prompt Library',
      title: 'Prompt search, filtering, and editing stay behind sign-in',
      summary:
        'The library is where beta users search prompt inventory, inspect prompt types, and move into authoring without leaving the web app.',
      bullets: [
        'Search prompt names, tags, and template content.',
        'Filter by prompt type and category.',
        'Open detail views for editing and apply preview.',
      ],
      supportTitle: 'Need setup before you browse?',
      supportDescription:
        'Start with the setup route so your host, tool discovery, and first prompt path are all visible before you enter the library.',
      supportHref: '/getting-started',
      supportLabel: 'Open getting started',
    };
  }

  if (pathname.startsWith('/agents')) {
    return {
      eyebrow: 'Agent Catalog',
      title: 'Agent detail and validation stay tied to the signed-in workspace',
      summary:
        'The agent catalog is useful only when it can read the real Convex-backed registry and show compatible tools, models, and validation paths.',
      bullets: [
        'Browse subagents and main agents separately.',
        'Inspect compatible tools, MCP servers, and models.',
        'Open validation, preview, and system-prompt checks.',
      ],
      supportTitle: 'Need context first?',
      supportDescription:
        'The public beta entry explains the control-plane model and why the product keeps setup, prompts, and execution together.',
      supportHref: '/',
      supportLabel: 'Return to beta entry',
    };
  }

  if (pathname.startsWith('/runs')) {
    return {
      eyebrow: 'Orchestration Runs',
      title: 'Run history and reports require an authenticated beta workspace',
      summary:
        'The runs surface should prove that orchestration can start, land in history, and open a report. That needs the real signed-in backend path.',
      bullets: [
        'Start an orchestration against the connected host.',
        'Return to recent run history without guessing the endpoint.',
        'Open summary, JSON, markdown, and HTML reports.',
      ],
      supportTitle: 'Need to finish setup first?',
      supportDescription:
        'Connect a host and verify health before expecting the run surface to feel useful.',
      supportHref: '/integrations',
      supportLabel: 'Open integrations',
    };
  }

  if (pathname.startsWith('/integrations')) {
    return {
      eyebrow: 'Integrations',
      title: 'Host setup and tool smoke tests belong to a real session',
      summary:
        'Integrations is the beta setup center. It generates host payloads, checks health, and exposes tool smoke tests from the same surface.',
      bullets: [
        'Generate Claude Desktop, Cursor, or generic host configs.',
        'Check server health and discovered tools.',
        'Run a UI smoke test against at least one MCP tool.',
      ],
      supportTitle: 'Need the overall product context?',
      supportDescription:
        'The public beta entry explains what the setup route is trying to accomplish before the dashboard takes over.',
      supportHref: '/',
      supportLabel: 'Return to beta entry',
    };
  }

  if (pathname.startsWith('/settings')) {
    return {
      eyebrow: 'Settings',
      title: 'Usage, billing state, and feedback stay tied to the beta account',
      summary:
        'Settings is intentionally operational in beta. It should show who is signed in, what the backend sees for usage, and which feedback already exists.',
      bullets: [
        'Review account and plan visibility.',
        'Check environment reachability and tool counts.',
        'Read structured feedback history from the product.',
      ],
      supportTitle: 'Need a better first step?',
      supportDescription:
        'If you are still setting up the workspace, the getting-started route keeps the first-session path more focused.',
      supportHref: '/getting-started',
      supportLabel: 'Open getting started',
    };
  }

  return {
    eyebrow: 'Control Plane',
    title: 'This route becomes useful after sign-in completes',
    summary:
      'Roster keeps setup, prompt management, and execution in one authenticated surface so the beta workflow stays coherent.',
    bullets: [
      'Finish setup before the dashboard becomes the default surface.',
      'Keep prompt inventory and execution history in the same product.',
      'Use feedback from the route where the issue occurred.',
    ],
    supportTitle: 'Need a stable entry point?',
    supportDescription:
      'Return to getting started for the clearest setup and recovery path during beta.',
    supportHref: '/getting-started',
    supportLabel: 'Open getting started',
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
  const routePath = pathnameProp ?? pathname;
  const meta = getRouteMeta(routePath);

  const heading =
    mode === 'signed_out'
      ? `Sign in to continue to ${meta.eyebrow.toLowerCase()}`
      : mode === 'loading'
        ? `${meta.eyebrow} is waiting for hosted auth`
        : `${meta.eyebrow} is unavailable until auth recovers`;

  const description =
    mode === 'signed_out'
      ? meta.summary
      : mode === 'loading'
        ? `Roster is keeping the current route visible while Clerk finishes booting. Once auth is ready, this surface should load without swapping you into unrelated content.`
        : `Hosted auth failed during bootstrap, so Roster kept this route visible and switched to a recovery state instead of showing the wrong screen under the current URL.`;

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          mode === 'signed_out' ? (
            <AuthCtas
              authSurfaceState={authSurfaceState}
              signInLabel="Sign in to continue"
              signUpLabel="Create beta account"
            />
          ) : undefined
        }
        description={description}
        eyebrow={meta.eyebrow}
        title={heading}
      />

      <div className="flex flex-wrap gap-3">
        <Badge tone={mode === 'failed' ? 'warning' : mode === 'loading' ? 'info' : 'brand'}>
          {mode === 'signed_out'
            ? 'Route is gated'
            : mode === 'loading'
              ? 'Waiting for auth'
              : 'Auth recovery'}
        </Badge>
        <Badge tone="strategy">{routePath}</Badge>
      </div>

      {mode !== 'signed_out' ? (
        <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          subtitle="The recovery state stays specific to the current route so users do not lose context during auth issues."
          title={`What ${meta.eyebrow.toLowerCase()} should let you do`}
          tone="strategy"
        >
          <div className="grid gap-3">
            {meta.bullets.map((bullet, index) => (
              <div
                className="flex items-start gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4"
                key={bullet}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[11px] font-semibold text-[var(--strategy-strong)]">
                  0{index + 1}
                </span>
                <p className="text-sm leading-6 text-[var(--ink-soft)]">{bullet}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel subtitle={meta.supportDescription} title={meta.supportTitle} tone="tech">
          <div className="space-y-4">
            <ActionButton href={meta.supportHref} tone="ghost">
              {meta.supportLabel}
            </ActionButton>
            {mode === 'signed_out' ? (
              <EmptyState
                description="Hosted auth is available on this route. Sign in when you want the live product data instead of the access gate."
                title="This route is staying truthful"
              />
            ) : (
              <EmptyState
                description="The screen keeps your current destination visible while auth recovers, so the beta workflow stays understandable even when bootstrap breaks."
                title="Why this recovery state exists"
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
