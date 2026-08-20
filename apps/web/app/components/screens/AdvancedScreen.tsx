'use client';

import { useConvexAuth } from 'convex/react';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  PageIntro,
  Panel,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { RouteStatusScreen } from './RouteStatusScreen';
import { LegacyAdvancedUnavailable } from './LegacyAdvancedUnavailable';
import { isLegacyAdvancedEnabled } from '@/lib/legacy-advanced-access';

const ADVANCED_AREAS = [
  { title: 'Setup Center', description: 'Connect supported AI clients and open administrator diagnostics.', href: '/integrations' },
  { title: 'Agent catalog', description: 'Inspect the legacy specialist and orchestration registry.', href: '/agents' },
  { title: 'Run traces', description: 'Review technical execution history and reports.', href: '/runs' },
  { title: 'Technical settings', description: 'Inspect legacy usage, environment, and feedback diagnostics.', href: '/settings' },
] as const;

export function AdvancedScreen() {
  if (!isLegacyAdvancedEnabled(process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED)) {
    return <LegacyAdvancedUnavailable />;
  }
  return <EnabledAdvancedScreen />;
}

function EnabledAdvancedScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const allowed = workspace.role === 'owner' || workspace.role === 'admin';
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="loading"
        pathname="/advanced"
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
        pathname="/advanced"
      />
    );
  }

  if (workspace.status !== 'ready') {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Roster is confirming your workspace role before opening technical controls."
          eyebrow="Advanced"
          title="Checking Advanced access"
        />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <SurfaceNotice
        description="The everyday library keeps MCP configuration and legacy control-plane detail out of the way."
        title="Advanced access is limited to workspace admins"
        tone="info"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="Technical setup, traces, and the legacy control plane stay available without becoming the default Roster experience."
        eyebrow="Advanced"
        title="Open the technical layer when you need it"
      />
      <SurfaceNotice
        description="The original technical prompt corpus remains quarantined here until a curator reviews each item for the normal Library."
        title="Legacy assets are not team-approved content"
        tone="warning"
      />
      <div className="grid gap-5 md:grid-cols-2">
        {ADVANCED_AREAS.map((area) => (
          <Panel key={area.href} subtitle={area.description} title={area.title} tone="tech">
            <ActionButton href={area.href} tone="ghost">Open {area.title.toLowerCase()}</ActionButton>
          </Panel>
        ))}
      </div>
    </div>
  );
}
