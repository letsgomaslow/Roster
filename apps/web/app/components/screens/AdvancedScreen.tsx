'use client';

import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import { ActionButton, PageIntro, Panel, SurfaceNotice } from '@/app/components/control-plane/primitives';

const ADVANCED_AREAS = [
  { title: 'MCP setup', description: 'Connect supported AI clients and verify the Roster server.', href: '/integrations' },
  { title: 'Agent catalog', description: 'Inspect the legacy specialist and orchestration registry.', href: '/agents' },
  { title: 'Run traces', description: 'Review technical execution history and reports.', href: '/runs' },
  { title: 'Technical settings', description: 'Inspect legacy usage, environment, and feedback diagnostics.', href: '/settings' },
] as const;

export function AdvancedScreen() {
  const workspace = useWorkspace();
  const allowed = workspace.role === 'owner' || workspace.role === 'admin';

  if (workspace.status === 'ready' && !allowed) {
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
