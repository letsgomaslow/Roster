'use client';

import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  EmptyState,
  PageIntro,
  Panel,
  SkeletonCardGrid,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { useTrackPageView } from '@/app/components/control-plane/useProductEvents';
import { convexEnabled } from '@/lib/convex-client';
import { formatNumber, formatRelativeDate, titleCase } from '@/lib/formatters';
import { useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { DashboardApiPayload, FeedbackHistoryItem } from '@/lib/roster-types';
import { RouteStatusScreen } from './RouteStatusScreen';
import { LegacyAdvancedUnavailable } from './LegacyAdvancedUnavailable';
import { isLegacyAdvancedEnabled } from '@/lib/legacy-advanced-access';

export function SettingsScreen() {
  if (!isLegacyAdvancedEnabled(process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED)) {
    return <LegacyAdvancedUnavailable />;
  }
  return <EnabledSettingsScreen />;
}

function EnabledSettingsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="loading"
        pathname="/settings"
      />
    );
  }

  if (workspace.status === 'error') {
    return (
      <SurfaceNotice
        description={workspace.error ?? 'Roster could not verify your workspace role.'}
        title="Advanced access needs attention"
        tone="error"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/settings"
      />
    );
  }

  if (workspace.status !== 'ready') {
    return (
      <SurfaceNotice
        description="Roster is confirming your workspace role before opening technical tools."
        title="Checking advanced access"
        tone="info"
      />
    );
  }

  if (workspace.role !== 'owner' && workspace.role !== 'admin') {
    return (
      <SurfaceNotice
        description="Your everyday Library stays available. Ask a workspace owner or admin if you need technical settings."
        title="Advanced access is limited to workspace owners and admins"
        tone="info"
      />
    );
  }

  return <AuthorizedSettingsScreen />;
}

function AuthorizedSettingsScreen() {
  useTrackPageView('settings_view', { route: '/settings' });

  const { isAuthenticated } = useConvexAuth();
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const feedback = useQuery(
    api.prompts.listFeedbackHistory,
    convexEnabled && isAuthenticated ? { limit: 24 } : 'skip',
  );
  const subscription = useRosterResource<
    RosterEnvelope<{
      userId?: string;
      email?: string;
      subscriptionTier?: string;
      rateLimit?: { requests?: number; windowMs?: number };
    }>
  >('/api/roster/subscription/status');
  const plans = useRosterResource<
    RosterEnvelope<{ plans?: Array<{ id: string; name?: string; price?: number }> }>
  >('/api/roster/subscription/plans');
  const dashboard = useRosterResource<RosterEnvelope<DashboardApiPayload>>('/api/roster/dashboard');
  const settingsLoading =
    isAuthenticated &&
    (feedback === undefined || subscription.loading || plans.loading || dashboard.loading);
  const settingsError = subscription.error || plans.error || dashboard.error;

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/settings"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="Settings should stay operational in beta: identity, plan visibility, environment reachability, and structured feedback all in one route."
        eyebrow="Settings"
        title="Usage, plan visibility, and feedback history"
      />

      {settingsLoading ? (
        <SurfaceNotice
          description="Settings data is still loading from Convex and the backend routes. The shell stays visible so the route remains legible while the account data hydrates."
          title="Loading settings state"
          tone="info"
        />
      ) : null}

      {settingsError ? (
        <SurfaceNotice
          action={
            <ActionButton
              onClick={() => {
                subscription.reload();
                plans.reload();
                dashboard.reload();
              }}
              tone="ghost"
            >
              Reload settings
            </ActionButton>
          }
          description={settingsError}
          title="Some settings data is temporarily unavailable"
          tone="warning"
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          action={
            <Badge tone={settingsLoading ? 'info' : subscription.data?.data?.subscriptionTier ? 'success' : 'warning'}>
              {settingsLoading
                ? 'Loading account'
                : subscription.data?.data?.subscriptionTier
                  ? titleCase(subscription.data.data.subscriptionTier)
                  : 'Unavailable'}
            </Badge>
          }
          subtitle="Billing is intentionally read-only in beta, but plan and rate visibility still need to be obvious."
          title="Account and usage"
          tone="strategy"
        >
          {settingsLoading ? (
            <SkeletonCardGrid count={3} />
          ) : (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Account
                </p>
                <p className="mt-3 text-sm text-[var(--ink)]">
                  {subscription.data?.data?.email || 'No email returned by the backend.'}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Rate limit
                </p>
                <p className="mt-3 text-sm text-[var(--ink)]">
                  {subscription.data?.data?.rateLimit?.requests
                    ? `${subscription.data.data.rateLimit.requests} requests / ${Math.round((subscription.data.data.rateLimit.windowMs ?? 0) / 3_600_000)} hour(s)`
                    : 'Rate limit unavailable'}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Plans exposed by backend
                </p>
                <div className="mt-3 space-y-2">
                  {(plans.data?.data?.plans ?? []).map((plan) => (
                    <div className="flex items-center justify-between text-sm" key={plan.id}>
                      <span className="text-[var(--ink)]">{plan.name ?? plan.id}</span>
                      <span className="text-[var(--muted)]">
                        {typeof plan.price === 'number' ? `$${plan.price}` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          action={
            <Badge tone={settingsLoading ? 'info' : 'default'}>
              {settingsLoading ? 'Loading feedback' : formatNumber(feedback?.length)}
            </Badge>
          }
          subtitle="This is the direct Convex read path for structured beta feedback."
          title="Feedback history"
          tone="tech"
        >
          {settingsLoading ? (
            <SkeletonList rows={4} />
          ) : feedback?.length ? (
            <div className="space-y-3">
              {(feedback as FeedbackHistoryItem[]).map((item) => (
                <div
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4"
                  key={item.feedbackId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{titleCase(item.type)}</Badge>
                      {item.severity ? (
                        <Badge tone="warning">{titleCase(item.severity)}</Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink)]">{item.message}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {item.page} · {item.route}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Feedback entries will appear here after the drawer is used."
              title="No feedback submitted yet"
            />
          )}
        </Panel>
      </div>

      <Panel
        action={
          <Badge tone={settingsLoading ? 'info' : dashboard.data?.data?.health?.success ? 'success' : 'warning'}>
            {settingsLoading ? 'Loading env' : dashboard.data?.data?.health?.success ? 'Reachable' : 'Unavailable'}
          </Badge>
        }
        subtitle="This keeps environment status visible without opening server logs."
        title="Environment status"
        tone="tech"
      >
        {settingsLoading ? (
          <SkeletonCardGrid count={4} />
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Server
              </p>
              <p className="mt-3 text-sm text-[var(--ink)]">
                {dashboard.data?.data?.health?.data?.status || 'Unknown'}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Tools
              </p>
              <p className="mt-3 text-sm text-[var(--ink)]">
                {formatNumber(dashboard.data?.data?.tools?.data?.length ?? 0)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Runs
              </p>
              <p className="mt-3 text-sm text-[var(--ink)]">
                {formatNumber(dashboard.data?.data?.runs?.data?.executions?.length ?? 0)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Prompt stats
              </p>
              <p className="mt-3 text-sm text-[var(--ink)]">
                {formatNumber(dashboard.data?.data?.stats?.data?.total ?? 0)}
              </p>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
