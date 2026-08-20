'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import { Badge, PageIntro, Panel, SurfaceNotice } from '@/app/components/control-plane/primitives';
import { titleCase } from '@/lib/formatters';

export function WorkspaceAdminScreen() {
  const workspace = useWorkspace();
  const seedStarterLibrary = useMutation(api.workLibrary.seedStarterLibrary);
  const [starterState, setStarterState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [starterMessage, setStarterMessage] = useState<string | null>(null);
  const allowed = workspace.role === 'owner' || workspace.role === 'admin';

  async function addStarterLibrary() {
    setStarterState('working');
    try {
      const result = await seedStarterLibrary({});
      setStarterState('done');
      setStarterMessage(
        result.created
          ? `${result.created} starter prompts were added as shared drafts for curator review.`
          : 'The complete starter library is already present.',
      );
    } catch (error) {
      setStarterState('error');
      setStarterMessage(error instanceof Error ? error.message : 'Roster could not add the starter library.');
    }
  }

  if (workspace.status === 'ready' && !allowed) {
    return (
      <SurfaceNotice
        description="Ask a workspace owner if you need to manage people, providers, or policies."
        title="Workspace admin access is required"
        tone="warning"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="Keep people, AI providers, model choices, and data rules understandable in one place."
        eyebrow="Workspace admin"
        title="Set the boundaries your team works within"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel subtitle="Clerk organization membership is the source of access." title="People and roles" tone="strategy">
          <div className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] p-4">
            <div>
              <p className="font-medium text-[var(--ink)]">{workspace.name ?? 'Current workspace'}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Your role</p>
            </div>
            <Badge tone="strategy">{titleCase(workspace.role ?? 'loading')}</Badge>
          </div>
        </Panel>
        <Panel subtitle="Roster sends content only when a member explicitly runs a test." title="AI providers" tone="tech">
          <SurfaceNotice
            description="No workspace provider is connected yet. Manual Save, Find, Use, Copy, and Export remain available."
            title="AI assistance is opt-in"
            tone="info"
          />
        </Panel>
        <Panel subtitle="Launch scope is general business information only." title="Data policy" tone="strategy">
          <p className="text-sm leading-7 text-[var(--ink-soft)]">
            Do not save credentials, payment-card data, protected health information, or highly regulated records in Roster.
          </p>
        </Panel>
        <Panel subtitle="Model allowlists arrive with provider connections in Phase 2." title="Approved models" tone="tech">
          <p className="text-sm leading-7 text-[var(--ink-soft)]">
            Members will choose only from models an admin approves, with one friendly default per provider.
          </p>
        </Panel>
        <Panel subtitle="Begin the alpha with useful examples, not an empty screen." title="Starter library" tone="strategy">
          <p className="text-sm leading-7 text-[var(--ink-soft)]">
            Add 12 client-delivery, business-development, and marketing prompts. They arrive shared for review—never pre-approved.
          </p>
          <button
            className="mt-4 min-h-11 rounded-full bg-[var(--button-secondary)] px-4 text-sm font-semibold text-[var(--button-secondary-ink)] disabled:opacity-60"
            disabled={starterState === 'working' || !allowed}
            onClick={addStarterLibrary}
            type="button"
          >
            {starterState === 'working' ? 'Adding starter prompts…' : 'Add starter library'}
          </button>
          {starterMessage ? (
            <div className="mt-4">
              <SurfaceNotice
                description={starterMessage}
                title={starterState === 'error' ? 'Starter library needs attention' : 'Starter library is ready'}
                tone={starterState === 'error' ? 'error' : 'success'}
              />
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
