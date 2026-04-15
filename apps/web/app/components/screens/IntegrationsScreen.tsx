'use client';

import { useState } from 'react';
import { CodeBlock, EmptyState, PageIntro, Panel, Badge } from '@/app/components/control-plane/primitives';
import { useTrackPageView, useTrackProductEvent } from '@/app/components/control-plane/useProductEvents';
import { openMicroFeedback } from '@/lib/control-plane-events';
import { rosterFetchEnvelope, useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { IntegrationSetupPayload, RosterTool } from '@/lib/roster-types';

type ClientId = 'claude' | 'cursor' | 'generic';

export function IntegrationsScreen() {
  const track = useTrackProductEvent();
  const [activeClient, setActiveClient] = useState<ClientId>('claude');
  const [toolName, setToolName] = useState('');
  const [toolArguments, setToolArguments] = useState('{}');
  const [toolResult, setToolResult] = useState<string>('');
  const [toolError, setToolError] = useState<string | null>(null);

  useTrackPageView('integrations_view', { route: '/integrations' });

  const setup = useRosterResource<RosterEnvelope<IntegrationSetupPayload>>(
    `/api/roster/setup/${activeClient}`,
  );
  const tools = useRosterResource<RosterEnvelope<RosterTool[]>>('/api/roster/mcp/tools');
  const health = useRosterResource<RosterEnvelope<{ status?: string }>>('/api/roster/health');

  async function runToolSmokeTest() {
    setToolError(null);
    try {
      const parsedArgs = JSON.parse(toolArguments);
      const response = await rosterFetchEnvelope<{ result: unknown }>('/api/roster/mcp/tools', {
        method: 'POST',
        body: JSON.stringify({ tool: toolName, arguments: parsedArgs }),
      });
      if (!response.success) {
        throw new Error(response.error || 'Tool run failed');
      }
      setToolResult(JSON.stringify(response.data.result, null, 2));
      await track('tool_executed', { tool: toolName });
      openMicroFeedback({
        type: 'missing_capability',
        page: 'Integrations',
        route: '/integrations',
        context: { tool: toolName, action: 'tool_smoke_test' },
      });
    } catch (error) {
      setToolError(error instanceof Error ? error.message : 'Tool run failed');
    }
  }

  const toolItems = tools.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageIntro
        description="Integrations is the beta setup center. The interface keeps setup payloads, connection status, and tool testing together so users do not have to leave the product to prove that the MCP server works."
        eyebrow="Integrations"
        title="Claude Desktop, Cursor, and generic MCP onboarding"
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          action={<Badge tone={health.data?.data?.status === 'healthy' ? 'success' : 'warning'}>{health.data?.data?.status === 'healthy' ? 'Healthy' : 'Check server'}</Badge>}
          subtitle="Setup payloads are generated from one place so the beta user can compare hosts without reading docs."
          title="Setup payloads"
          tone="strategy"
        >
          <div aria-label="MCP host selector" className="flex flex-wrap gap-3" role="group">
            {[
              { id: 'claude', label: 'Claude Desktop' },
              { id: 'cursor', label: 'Cursor' },
              { id: 'generic', label: 'Generic host' },
            ].map((item) => (
              <button
                aria-pressed={activeClient === item.id}
                className={`rounded-full border px-4 py-2.5 text-sm transition ${
                  activeClient === item.id
                    ? 'border-[var(--strategy-soft)] bg-[var(--strategy-wash)] text-[var(--ink)]'
                    : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--panel-soft)]'
                }`}
                key={item.id}
                onClick={async () => {
                  setActiveClient(item.id as ClientId);
                  await track('setup_started', { client: item.id });
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {setup.data?.data ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="font-medium text-[var(--ink)]">{setup.data.data.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {setup.data.data.summary}
                </p>
                <ol className="mt-4 space-y-2 text-sm leading-6 text-[var(--muted)]">
                  {setup.data.data.steps.map((step, index) => (
                    <li key={step}>
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[var(--ink)]">
                  {setup.data.data.configLabel}
                </p>
                <CodeBlock value={setup.data.data.config} />
              </div>
            </div>
          ) : (
            <EmptyState
              description="Setup payloads load through the local route handlers."
              title="Setup payload unavailable"
            />
          )}
        </Panel>

        <Panel
          action={<Badge tone="info">{toolItems.length} tools</Badge>}
          subtitle="Smoke-test at least one MCP tool from the UI so setup problems surface before the user leaves the page."
          title="MCP tool explorer"
          tone="tech"
        >
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {toolItems.length ? (
                toolItems.map((tool) => (
                  <button
                    className={`block w-full rounded-[22px] border px-4 py-4 text-left transition ${
                      toolName === tool.name
                        ? 'border-[var(--tech-soft)] bg-[var(--tech-wash)]'
                        : 'border-[var(--line)] bg-[var(--panel-soft)] hover:bg-white'
                    }`}
                    key={tool.name}
                    onClick={() => {
                      setToolName(tool.name);
                      setToolArguments('{}');
                    }}
                    type="button"
                  >
                    <p className="font-medium text-[var(--ink)]">{tool.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {tool.description || 'No description available.'}
                    </p>
                  </button>
                ))
              ) : (
                <EmptyState
                  description="Tool metadata is not available yet."
                  title="No tools discovered"
                />
              )}
            </div>

            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="text-[var(--muted)]">Arguments JSON</span>
                <textarea
                  className="min-h-44 w-full rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 font-mono text-sm text-[var(--ink)]"
                  onChange={(event) => setToolArguments(event.target.value)}
                  value={toolArguments}
                />
              </label>
              <button
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
                disabled={!toolName}
                onClick={runToolSmokeTest}
                type="button"
              >
                Run smoke test
              </button>
              {toolError ? (
                <div className="rounded-[20px] border border-[var(--error-soft)] bg-[rgba(213,44,44,0.08)] px-4 py-3 text-sm text-[var(--error)]" role="alert">
                  {toolError}
                </div>
              ) : null}
              {toolResult ? (
                <div aria-live="polite">
                  <CodeBlock value={toolResult} />
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
