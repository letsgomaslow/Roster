'use client';

import { useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  PageIntro,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import {
  MCP_SETUP_CLIENTS,
  getMcpSetupClient,
  type McpSetupCategory,
  type McpSetupClient,
} from '@/lib/mcp-setup-catalog';
import { useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { RosterTool } from '@/lib/roster-types';
import { RouteStatusScreen } from './RouteStatusScreen';

const CATEGORY_LABELS: Record<McpSetupCategory, string> = {
  connect_myself: 'Connect myself',
  ask_admin: 'Ask an admin',
  build_deploy: 'Build or deploy',
  limited: 'Limited',
};

function verificationTone(value: McpSetupClient['verification']) {
  if (value === 'Live tested') return 'success' as const;
  if (value === 'Limited') return 'warning' as const;
  return 'info' as const;
}

function TechnicalDiagnostics({
  healthStatus,
  loading,
  onToggle,
  tools,
}: {
  healthStatus?: string;
  loading: boolean;
  onToggle: (open: boolean) => void;
  tools: RosterTool[];
}) {
  return (
    <details
      className="border border-[var(--line)] bg-[var(--panel)]"
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
        Technical diagnostics
      </summary>
      <div className="border-t border-[var(--line)] px-5 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={healthStatus === 'healthy' ? 'success' : 'warning'}>
            {loading ? 'Checking server' : healthStatus === 'healthy' ? 'Server healthy' : 'Check server'}
          </Badge>
          <span className="text-sm text-[var(--muted)]">
            {loading ? 'Discovering tools…' : `${tools.length} MCP tools discovered`}
          </span>
        </div>
        {loading ? (
          <div className="mt-4"><SkeletonList dense rows={3} /></div>
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {tools.map((tool) => (
              <li className="border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-3" key={tool.name}>
                <p className="text-sm font-semibold text-[var(--ink)]">{tool.name}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {tool.description || 'No description available.'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function IntegrationsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const workspace = useWorkspace();
  const [category, setCategory] = useState<McpSetupCategory>('connect_myself');
  const [activeClientId, setActiveClientId] = useState<McpSetupClient['id']>('claude');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const activeClient = getMcpSetupClient(activeClientId);
  const canAdmin = workspace.role === 'owner' || workspace.role === 'admin';
  const diagnosticsEnabled = canAdmin && diagnosticsOpen;
  const tools = useRosterResource<RosterEnvelope<RosterTool[]>>(
    '/api/roster/mcp/tools',
    diagnosticsEnabled,
  );
  const health = useRosterResource<RosterEnvelope<{ status?: string }>>(
    '/api/roster/health',
    diagnosticsEnabled,
  );
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const visibleClients = MCP_SETUP_CLIENTS.filter((client) => client.category === category);

  if (
    workspace.status !== 'error' &&
    (authLoading || (!isAuthenticated && workspace.status === 'bootstrapping'))
  ) {
    return (
      <div className="space-y-8">
        <PageIntro
          description="Your workspace is connecting. Setup guidance will appear here without changing pages."
          eyebrow="Optional connection"
          title="Preparing the Setup Center"
        />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (workspace.status === 'error') {
    return (
      <div className="space-y-4">
        <SurfaceNotice
          description={workspace.error ?? 'Roster could not verify your workspace connection.'}
          title="Setup Center needs attention"
          tone="error"
        />
        {workspace.retry ? (
          <ActionButton onClick={workspace.retry} tone="primary">
            Reload workspace
          </ActionButton>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/integrations"
      />
    );
  }

  function chooseCategory(nextCategory: McpSetupCategory) {
    setCategory(nextCategory);
    const first = MCP_SETUP_CLIENTS.find((client) => client.category === nextCategory);
    if (first) setActiveClientId(first.id);
  }

  return (
    <div className="space-y-7">
      <PageIntro
        description="Choose the AI tool you already use. Roster shows only the setup path, permissions, and limitations that apply to that client."
        eyebrow="Optional connection"
        title="Use Roster where you already work"
      />

      <SurfaceNotice
        description="Search, fill, copy, and export always work in Roster. Connecting another AI tool is optional and is not an onboarding requirement."
        title="Your Library works without a connection"
        tone="info"
      />

      <div aria-label="Connection path" className="flex flex-wrap gap-2" role="group">
        {(Object.keys(CATEGORY_LABELS) as McpSetupCategory[]).map((item) => (
          <button
            aria-pressed={category === item}
            className={
              category === item
                ? 'min-h-11 border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-white'
                : 'min-h-11 border border-[var(--line-strong)] bg-[var(--panel)] px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]'
            }
            key={item}
            onClick={() => chooseCategory(item)}
            type="button"
          >
            {CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleClients.map((client) => (
          <button
            aria-pressed={activeClientId === client.id}
            className={
              activeClientId === client.id
                ? 'min-h-48 border-2 border-[var(--strategy-strong)] bg-[var(--panel)] p-5 text-left'
                : 'min-h-48 border border-[var(--line)] bg-[var(--panel)] p-5 text-left hover:border-[var(--line-strong)]'
            }
            key={client.id}
            onClick={() => {
              setActiveClientId(client.id);
            }}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">{client.name}</h2>
              <Badge tone={verificationTone(client.verification)}>{client.verification}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{client.summary}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--strategy-strong)]">
              {client.authority}
            </p>
          </button>
        ))}
      </div>

      <section className="grid gap-5 border border-[var(--line)] bg-[var(--panel)] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={verificationTone(activeClient.verification)}>{activeClient.verification}</Badge>
            <Badge>{activeClient.transport}</Badge>
            <span className="text-xs text-[var(--muted)]">Verified Aug 20, 2026</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Set up {activeClient.name}
          </h2>
          <ol className="mt-5 space-y-3">
            {activeClient.steps.map((step, index) => (
              <li className="grid grid-cols-[32px_1fr] gap-3 text-sm leading-6 text-[var(--ink-soft)]" key={step}>
                <span className="flex h-8 w-8 items-center justify-center border border-[var(--line-strong)] text-xs font-semibold text-[var(--ink)]">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <a
            className="mt-5 inline-flex min-h-11 items-center border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
            href={activeClient.officialDocs}
            rel="noreferrer"
            target="_blank"
          >
            Open official instructions
          </a>
        </div>

        <aside className="border-l-2 border-[var(--strategy-strong)] bg-[var(--strategy-wash)] p-5">
          <h3 className="text-base font-semibold text-[var(--ink)]">Roster connection details</h3>
          {activeClient.setupPayload ? (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              <strong className="text-[var(--ink)]">Connection URL isn’t available in this preview yet.</strong>{' '}
              Review the setup steps now. A copyable, workspace-specific URL will appear here only after Roster’s secure remote endpoint is enabled.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This path requires an administrator or product-specific deployment. Roster will not show a configuration that cannot be used directly.
            </p>
          )}
        </aside>
      </section>

      {canAdmin ? (
        <TechnicalDiagnostics
          healthStatus={health.data?.data.status}
          loading={tools.loading || health.loading}
          onToggle={setDiagnosticsOpen}
          tools={tools.data?.data ?? []}
        />
      ) : null}
    </div>
  );
}
