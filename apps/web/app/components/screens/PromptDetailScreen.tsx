'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  CodeBlock,
  EmptyState,
  PageIntro,
  Panel,
  Badge,
} from '@/app/components/control-plane/primitives';
import {
  useTrackPageView,
  useTrackProductEvent,
} from '@/app/components/control-plane/useProductEvents';
import { openMicroFeedback } from '@/lib/control-plane-events';
import { convexEnabled } from '@/lib/convex-client';
import { formatRelativeDate, titleCase } from '@/lib/formatters';
import { rosterFetchEnvelope } from '@/lib/roster-client';

type FormState = {
  promptId: string;
  name: string;
  description: string;
  category: string;
  promptType:
    | 'standard'
    | 'subagent_registry'
    | 'main_agent_template'
    | 'project_orchestration_template';
  accessLevel: string;
  tags: string;
  variables: string;
  template: string;
  model: string;
  tools: string;
  mcpServers: string;
  compatibleWith: string;
  subagents: string;
  systemPrompt: string;
};

const EMPTY_FORM: FormState = {
  promptId: '',
  name: '',
  description: '',
  category: 'general',
  promptType: 'standard',
  accessLevel: 'private',
  tags: '',
  variables: '',
  template: '',
  model: '',
  tools: '',
  mcpServers: '',
  compatibleWith: '',
  subagents: '',
  systemPrompt: '',
};

function parseList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseVariables(value: string) {
  return parseList(value);
}

function buildLocalPreview(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (accumulator, [key, current]) => accumulator.replaceAll(`{{${key}}}`, current),
    template,
  );
}

export function PromptDetailScreen({ promptId }: { promptId: string }) {
  const router = useRouter();
  const track = useTrackProductEvent();
  const isNew = promptId === 'new';

  useTrackPageView(isNew ? 'prompt_create_view' : 'prompt_detail_view', {
    route: isNew ? '/library/new' : `/library/${promptId}`,
    promptId,
  });

  const { isAuthenticated } = useConvexAuth();
  const detail = useQuery(
    api.prompts.getPromptDetail,
    convexEnabled && isAuthenticated && !isNew ? { promptId } : 'skip',
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'error'>('idle');
  const [applyPreview, setApplyPreview] = useState('');
  const [applyInputs, setApplyInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detail?.prompt) {
      if (isNew) {
        setForm((current) =>
          current.promptId
            ? current
            : { ...EMPTY_FORM, promptId: `prompt_${Date.now().toString(36)}` },
        );
      }
      return;
    }

    const prompt = detail.prompt;
    setForm({
      promptId: prompt.promptId,
      name: prompt.name,
      description: prompt.description,
      category: prompt.category,
      promptType: prompt.promptType as FormState['promptType'],
      accessLevel: prompt.accessLevel,
      tags: prompt.tags.join(', '),
      variables: prompt.variables
        .map((variable) =>
          typeof variable === 'string'
            ? variable
            : typeof variable === 'object' && variable && 'name' in variable
              ? String((variable as { name: unknown }).name)
              : '',
        )
        .filter(Boolean)
        .join(', '),
      template: prompt.template,
      model: prompt.agentConfig?.model ?? '',
      tools: (prompt.agentConfig?.tools ?? []).join(', '),
      mcpServers: (prompt.agentConfig?.mcpServers ?? []).join(', '),
      compatibleWith: (prompt.agentConfig?.compatibleWith ?? []).join(', '),
      subagents: (prompt.agentConfig?.subagents ?? []).join(', '),
      systemPrompt: prompt.agentConfig?.systemPrompt ?? '',
    });
  }, [detail, isNew]);

  const variableNames = parseVariables(form.variables);

  async function onSave() {
    setSaveState('saving');
    setError(null);

    const payload = {
      id: form.promptId,
      name: form.name,
      description: form.description,
      category: form.category,
      promptType: form.promptType,
      access_level: form.accessLevel,
      tags: parseList(form.tags),
      variables: variableNames,
      template: form.template,
      agentConfig:
        form.promptType === 'standard'
          ? undefined
          : {
              model: form.model || undefined,
              tools: parseList(form.tools),
              mcpServers: parseList(form.mcpServers),
              compatibleWith: parseList(form.compatibleWith),
              subagents: parseList(form.subagents),
              systemPrompt: form.systemPrompt || undefined,
            },
    };

    try {
      const path = isNew
        ? '/api/roster/prompts'
        : `/api/roster/prompts/${encodeURIComponent(form.promptId)}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await rosterFetchEnvelope<{ prompt?: { id?: string } }>(path, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error(response.error || 'Save failed');
      }

      await track(isNew ? 'prompt_created' : 'prompt_updated', {
        promptId: form.promptId,
        promptType: form.promptType,
      });
      setSaveState('saved');
      openMicroFeedback({
        type: 'confusing_ux',
        page: isNew ? 'Prompt create' : 'Prompt detail',
        route: isNew ? '/library/new' : `/library/${form.promptId}`,
        context: { promptId: form.promptId, action: isNew ? 'create' : 'update' },
      });

      if (isNew) {
        router.replace(`/library/${encodeURIComponent(form.promptId)}`);
      }
    } catch (saveError) {
      setSaveState('error');
      setError(saveError instanceof Error ? saveError.message : 'Save failed');
    }
  }

  async function onDelete() {
    if (isNew || !window.confirm('Delete this prompt?')) return;

    try {
      const response = await rosterFetchEnvelope(
        `/api/roster/prompts/${encodeURIComponent(form.promptId)}`,
        {
          method: 'DELETE',
        },
      );
      if (!response.success) {
        throw new Error(response.error || 'Delete failed');
      }
      await track('prompt_deleted', { promptId: form.promptId });
      router.push('/library');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    }
  }

  async function onApplyPreview() {
    setApplyState('applying');
    setError(null);

    try {
      if (isNew) {
        setApplyPreview(buildLocalPreview(form.template, applyInputs));
      } else {
        const response = await rosterFetchEnvelope<{ result: string }>(
          `/api/roster/prompts/${encodeURIComponent(form.promptId)}/apply`,
          {
            method: 'POST',
            body: JSON.stringify({ variables: applyInputs }),
          },
        );
        if (!response.success) {
          throw new Error(response.error || 'Preview failed');
        }
        setApplyPreview(response.data.result);
      }
      await track('prompt_applied', {
        promptId: form.promptId,
        variableCount: Object.keys(applyInputs).length,
      });
      openMicroFeedback({
        type: 'feature_request',
        page: 'Prompt apply preview',
        route: isNew ? '/library/new' : `/library/${form.promptId}`,
        context: { promptId: form.promptId, action: 'apply_preview' },
      });
      setApplyState('idle');
    } catch (applyError) {
      setApplyState('error');
      setError(applyError instanceof Error ? applyError.message : 'Preview failed');
    }
  }

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <>
            {!isNew ? (
              <button
                className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                onClick={onDelete}
                type="button"
              >
                Delete
              </button>
            ) : null}
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)]"
              onClick={onSave}
              type="button"
            >
              {isNew ? 'Create prompt' : 'Save changes'}
            </button>
          </>
        }
        description="The editor keeps prompt metadata, template text, agent configuration, and apply-preview together. Beta users should never have to guess which backend fields are actually active."
        eyebrow={isNew ? 'Create Prompt' : 'Prompt Detail'}
        title={isNew ? 'New prompt' : form.name || form.promptId || 'Prompt'}
      />

      {error ? (
        <div
          className="rounded-[24px] border border-[color:color-mix(in_oklab,var(--error)_28%,white)] bg-[color:color-mix(in_oklab,var(--error)_9%,white)] px-4 py-4 text-sm text-[var(--error-strong)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {saveState === 'saving'
          ? 'Saving prompt changes.'
          : saveState === 'saved'
            ? 'Prompt changes saved.'
            : applyState === 'applying'
              ? 'Generating apply preview.'
              : null}
      </p>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          subtitle="These are the fields the backend actually writes and reads."
          title="Editor"
          tone="strategy"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Prompt ID</span>
              <input
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, promptId: event.target.value }))
                }
                value={form.promptId}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Name</span>
              <input
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                value={form.name}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Category</span>
              <input
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                value={form.category}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Access level</span>
              <select
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, accessLevel: event.target.value }))
                }
                value={form.accessLevel}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--muted)]">Description</span>
              <textarea
                className="min-h-28 w-full rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Prompt type</span>
              <select
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promptType: event.target.value as FormState['promptType'],
                  }))
                }
                value={form.promptType}
              >
                <option value="standard">Standard</option>
                <option value="subagent_registry">Subagent registry</option>
                <option value="main_agent_template">Main agent template</option>
                <option value="project_orchestration_template">
                  Project orchestration template
                </option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Tags</span>
              <input
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="onboarding, beta, integration"
                value={form.tags}
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--muted)]">Variables</span>
              <input
                className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, variables: event.target.value }))
                }
                placeholder="projectName, framework, repositoryUrl"
                value={form.variables}
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--muted)]">Template</span>
              <textarea
                className="min-h-[360px] w-full rounded-[28px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 font-mono text-sm text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                onChange={(event) =>
                  setForm((current) => ({ ...current, template: event.target.value }))
                }
                value={form.template}
              />
            </label>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel
            action={
              <Badge tone={saveState === 'saved' ? 'success' : 'default'}>
                {titleCase(saveState)}
              </Badge>
            }
            subtitle="Advanced fields only matter for non-standard prompt types."
            title="Agent configuration"
            tone="strategy"
          >
            {form.promptType === 'standard' ? (
              <EmptyState
                description="Standard prompts do not need an agent configuration block."
                title="No agent config required"
              />
            ) : (
              <div className="space-y-4">
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">Model</span>
                  <input
                    className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, model: event.target.value }))
                    }
                    placeholder="claude-sonnet"
                    value={form.model}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">Tools</span>
                  <input
                    className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, tools: event.target.value }))
                    }
                    placeholder="get_prompt, list_prompts"
                    value={form.tools}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">MCP servers</span>
                  <input
                    className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, mcpServers: event.target.value }))
                    }
                    placeholder="@maslowai/roster"
                    value={form.mcpServers}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">Compatible project types</span>
                  <input
                    className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, compatibleWith: event.target.value }))
                    }
                    placeholder="nextjs, node, monorepo"
                    value={form.compatibleWith}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">Subagents</span>
                  <input
                    className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subagents: event.target.value }))
                    }
                    placeholder="frontend-reviewer, backend-auditor"
                    value={form.subagents}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--muted)]">System prompt</span>
                  <textarea
                    className="min-h-36 w-full rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, systemPrompt: event.target.value }))
                    }
                    value={form.systemPrompt}
                  />
                </label>
              </div>
            )}
          </Panel>

          <Panel
            action={
              <div className="flex items-center gap-3">
                <Badge tone={applyState === 'error' ? 'warning' : 'default'}>
                  {titleCase(applyState)}
                </Badge>
                <button
                  className="inline-flex min-h-11 items-center rounded-full border border-[color:color-mix(in_oklab,var(--tech)_45%,white)] bg-[var(--tech-wash)] px-4 py-2 text-sm font-medium text-[var(--tech-strong)] transition hover:brightness-95"
                  onClick={onApplyPreview}
                  type="button"
                >
                  Run preview
                </button>
              </div>
            }
            subtitle="Preview uses the backend apply endpoint for saved prompts and local interpolation for unsaved drafts."
            title="Apply preview"
            tone="tech"
          >
            <div className="space-y-4">
              {variableNames.length ? (
                variableNames.map((variable) => (
                  <label className="block space-y-2 text-sm" key={variable}>
                    <span className="text-[var(--muted)]">{variable}</span>
                    <input
                      className="w-full rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] focus:border-[var(--focus-ring-solid)] focus:outline-none"
                      onChange={(event) =>
                        setApplyInputs((current) => ({
                          ...current,
                          [variable]: event.target.value,
                        }))
                      }
                      value={applyInputs[variable] ?? ''}
                    />
                  </label>
                ))
              ) : (
                <EmptyState
                  description="Add comma-separated variable names in the editor to generate an apply-preview form."
                  title="No variables configured"
                />
              )}

              {applyPreview ? <CodeBlock value={applyPreview} /> : null}
            </div>
          </Panel>

          <Panel
            subtitle="These version markers come straight from Convex."
            title="Versions and metadata"
          >
            {detail?.versions?.length ? (
              <div className="space-y-3">
                {detail.versions.map((version) => (
                  <div
                    className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-3"
                    key={version.version}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--ink)]">{version.version}</p>
                      {version.isLatest ? <Badge tone="success">Latest</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Updated {formatRelativeDate(version.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="A new prompt will show version history after the first save."
                title="No version history yet"
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
