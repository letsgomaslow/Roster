'use client';

import { useState } from 'react';
import {
  Badge,
  CodeBlock,
  EmptyState,
  PageIntro,
  Panel,
} from '@/app/components/control-plane/primitives';
import {
  useTrackPageView,
  useTrackProductEvent,
} from '@/app/components/control-plane/useProductEvents';
import { titleCase } from '@/lib/formatters';
import { rosterFetchEnvelope, useRosterResource, type RosterEnvelope } from '@/lib/roster-client';
import type { AgentRecord } from '@/lib/roster-types';

type AgentDetailScreenProps = {
  kind: 'subagents' | 'main-agents';
  agentId: string;
};

export function AgentDetailScreen({ kind, agentId }: AgentDetailScreenProps) {
  const track = useTrackProductEvent();
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useTrackPageView('agent_detail_view', { route: `/agents/${kind}/${agentId}`, kind, agentId });

  const detail = useRosterResource<RosterEnvelope<Record<string, unknown>>>(
    `/api/roster/${kind}/${encodeURIComponent(agentId)}`,
  );
  const stats = useRosterResource<RosterEnvelope<{ stats?: Record<string, unknown> }>>(
    kind === 'subagents' ? `/api/roster/subagents/${encodeURIComponent(agentId)}/stats` : '',
    kind === 'subagents',
  );
  const configuration = useRosterResource<RosterEnvelope<Record<string, unknown>>>(
    kind === 'main-agents'
      ? `/api/roster/main-agents/${encodeURIComponent(agentId)}/configuration`
      : '',
    kind === 'main-agents',
  );

  const agent = (
    kind === 'subagents' ? detail.data?.data?.subagent : detail.data?.data?.mainAgent
  ) as AgentRecord | undefined;

  async function loadValidation() {
    try {
      const response = await rosterFetchEnvelope<Record<string, unknown>>(
        `/api/roster/main-agents/${encodeURIComponent(agentId)}/validate`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      setValidation(response.data);
      await track('main_agent_validated', { agentId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Validation failed');
    }
  }

  async function loadSystemPrompt() {
    try {
      const response = await rosterFetchEnvelope<{ systemPrompt: string }>(
        `/api/roster/main-agents/${encodeURIComponent(agentId)}/system-prompt`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      setSystemPrompt(response.data.systemPrompt);
      await track('main_agent_system_prompt_viewed', { agentId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'System prompt failed');
    }
  }

  async function loadPreview() {
    try {
      const response = await rosterFetchEnvelope<Record<string, unknown>>(
        `/api/roster/main-agents/${encodeURIComponent(agentId)}/preview`,
      );
      setPreview(response.data);
      await track('main_agent_preview_viewed', { agentId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Preview failed');
    }
  }

  return (
    <div className="space-y-8">
      <PageIntro
        description="The detail surface exists to answer configuration questions, not just restate metadata. If the user still needs to read backend code after this page, the beta UI is still missing information."
        eyebrow={kind === 'subagents' ? 'Subagent Detail' : 'Main Agent Detail'}
        title={agent?.name ?? agentId}
      />

      {error ? (
        <div
          className="rounded-[24px] border border-[color:color-mix(in_oklab,var(--error)_28%,white)] bg-[color:color-mix(in_oklab,var(--error)_9%,white)] px-4 py-4 text-sm text-[var(--error-strong)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          action={agent?.promptType ? <Badge>{titleCase(agent.promptType)}</Badge> : undefined}
          subtitle="This is the baseline record returned from the backend route."
          title="Catalog record"
          tone="strategy"
        >
          {agent ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                <p className="font-medium text-[var(--ink)]">
                  {agent.description || 'No description available.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(agent.tags ?? []).map((tag: string) => (
                    <span
                      className="rounded-full border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Category
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink)]">{agent.category || 'Unknown'}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Model
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink)]">
                    {agent.agentConfig?.model || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Tools
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink)]">
                    {(agent.agentConfig?.tools ?? []).join(', ') || 'No tools listed'}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    MCP servers
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink)]">
                    {(agent.agentConfig?.mcpServers ?? []).join(', ') || 'No MCP servers listed'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              description="The backend did not return an agent record for this identifier."
              title="Agent not found"
            />
          )}
        </Panel>

        <div className="space-y-5">
          {kind === 'subagents' ? (
            <Panel
              subtitle="Execution statistics come from the dedicated subagent stats route."
              title="Execution statistics"
              tone="tech"
            >
              <CodeBlock value={JSON.stringify(stats.data?.data?.stats ?? {}, null, 2)} />
            </Panel>
          ) : (
            <>
              <Panel
                subtitle="This route exposes the full main-agent configuration, including expected subagents."
                title="Configuration"
                tone="strategy"
              >
                <CodeBlock value={JSON.stringify(configuration.data?.data ?? {}, null, 2)} />
              </Panel>

              <Panel
                subtitle="The beta needs one-click access to validation, preview, and system prompt generation."
                title="Interactive checks"
                tone="tech"
              >
                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                    onClick={loadValidation}
                    type="button"
                  >
                    Validate configuration
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                    onClick={loadPreview}
                    type="button"
                  >
                    Load execution preview
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center rounded-full bg-[var(--button-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-secondary-ink)] transition hover:bg-[var(--button-secondary-hover)]"
                    onClick={loadSystemPrompt}
                    type="button"
                  >
                    Generate system prompt
                  </button>
                </div>

                {validation ? (
                  <div className="mt-4">
                    <CodeBlock value={JSON.stringify(validation, null, 2)} />
                  </div>
                ) : null}
                {preview ? (
                  <div className="mt-4">
                    <CodeBlock value={JSON.stringify(preview, null, 2)} />
                  </div>
                ) : null}
                {systemPrompt ? (
                  <div className="mt-4">
                    <CodeBlock value={systemPrompt} />
                  </div>
                ) : null}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
