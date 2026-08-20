'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useWorkspace } from '@/app/components/work-library/WorkspaceContext';
import {
  ActionButton,
  Badge,
  PageIntro,
  Panel,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';
import { extractPromptInputs } from '@/lib/work-library';
import { RouteStatusScreen } from './RouteStatusScreen';

const fieldClass =
  'min-h-12 w-full rounded-[18px] border border-[var(--line-strong)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--strategy-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]';

export function SaveAssetScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const workspace = useWorkspace();
  const createDraft = useMutation(api.workLibrary.createDraft);
  const [kind, setKind] = useState<'prompt' | 'playbook'>('prompt');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [teamKey, setTeamKey] = useState('client-delivery');
  const [jobKey, setJobKey] = useState('create-proposal');
  const [body, setBody] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const inputs = useMemo(() => extractPromptInputs(body), [body]);
  const hostedAuthConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!isAuthenticated) {
    return (
      <RouteStatusScreen
        authSurfaceState={hostedAuthConfigured ? 'ready' : 'disabled'}
        mode="signed_out"
        pathname="/library/new"
      />
    );
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaveState('saving');
    setMessage(`Reading ${file.name} for your review…`);
    const form = new FormData();
    form.set('file', file);
    try {
      const response = await fetch('/api/import/review', { method: 'POST', body: form });
      const result = (await response.json()) as {
        error?: string;
        fileName?: string;
        text?: string;
        warnings?: string[];
      };
      if (!response.ok || !result.text) throw new Error(result.error ?? 'Roster could not read this file.');
      setBody(result.text);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]+/g, ' '));
      setSaveState('idle');
      const warning = result.warnings?.length ? ` Review note: ${result.warnings[0]}` : '';
      setMessage(`${result.fileName ?? file.name} is ready for review. Nothing has been published.${warning}`);
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not read this file.');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workspace.status !== 'ready') {
      setMessage('Roster is still preparing your workspace. Try again in a moment.');
      return;
    }
    setSaveState('saving');
    setMessage(null);
    try {
      const result = await createDraft({
        kind,
        title: title.trim(),
        purpose: purpose.trim(),
        teamKey,
        jobKey,
        body,
        inputs,
      });
      router.push(`/library/${result.assetId}`);
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Roster could not save this draft.');
    }
  }

  return (
    <div className="space-y-8">
      <PageIntro
        actions={
          <ActionButton href="/library" tone="ghost">
            Back to Library
          </ActionButton>
        }
        description="Paste work your team already uses. Add just enough context for another person to understand and reuse it."
        eyebrow="Save new work"
        title="Turn a useful prompt into team knowledge"
      />

      <SurfaceNotice
        description="Roster will save a private draft first. It will never auto-publish imported or AI-assisted content."
        title="You stay in control of what the team sees"
        tone="info"
      />

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]" onSubmit={onSubmit}>
        <Panel
          subtitle="The exact text you save is the text Roster will copy or test."
          title="1. Paste the work"
          tone="strategy"
        >
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-medium text-[var(--ink)]">What are you saving?</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {(['prompt', 'playbook'] as const).map((value) => (
                  <label
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--line-strong)] bg-white px-4 text-sm text-[var(--ink)]"
                    key={value}
                  >
                    <input
                      checked={kind === value}
                      name="kind"
                      onChange={() => setKind(value)}
                      type="radio"
                    />
                    {value === 'prompt' ? 'Prompt' : 'Playbook'}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
              Prompt or instructions
              <textarea
                className={`${fieldClass} min-h-72 resize-y py-4 font-mono leading-7`}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Paste the prompt exactly as you use it. Use {{client_name}} for details another person should fill in."
                required
                value={body}
              />
            </label>

            <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[var(--panel-soft)] p-4">
              <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="prompt-file">
                Or import a file for review
              </label>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                TXT, Markdown, DOCX, and PDF are extracted into this private review screen. Roster never publishes an import automatically.
              </p>
              <input
                accept=".txt,.md,.docx,.pdf,text/plain,text/markdown"
                className="mt-3 block w-full text-sm text-[var(--ink)] file:mr-3 file:min-h-11 file:rounded-full file:border file:border-[var(--line)] file:bg-white file:px-4 file:text-sm file:font-medium"
                id="prompt-file"
                onChange={onFileSelected}
                type="file"
              />
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            subtitle="Describe the outcome, not the prompt engineering."
            title="2. Make it findable"
            tone="tech"
          >
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                Clear title
                <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} required value={title} />
              </label>
              <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                What does this help someone accomplish?
                <textarea
                  className={`${fieldClass} min-h-28 py-3`}
                  onChange={(event) => setPurpose(event.target.value)}
                  required
                  value={purpose}
                />
              </label>
              <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                Team
                <select className={fieldClass} onChange={(event) => setTeamKey(event.target.value)} value={teamKey}>
                  <option value="client-delivery">Client delivery</option>
                  <option value="marketing">Marketing</option>
                  <option value="business-development">Business development</option>
                  <option value="operations">Operations</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium text-[var(--ink)]">
                Job to be done
                <select className={fieldClass} onChange={(event) => setJobKey(event.target.value)} value={jobKey}>
                  <option value="create-proposal">Create a proposal</option>
                  <option value="draft-sow">Draft a statement of work</option>
                  <option value="research-account">Research an account</option>
                  <option value="summarize-meeting">Summarize a meeting</option>
                  <option value="create-campaign">Create a campaign</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel
            subtitle="Roster detects reusable fields without changing your prompt."
            title="3. Review the inputs"
            tone="strategy"
          >
            {inputs.length ? (
              <div className="flex flex-wrap gap-2">
                {inputs.map((input) => (
                  <Badge key={input.key} tone="strategy">{input.label} · {input.kind === 'long_text' ? 'Long text' : 'Text'}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">
                Add variables such as {'{{client_name}}'} or {'{{discovery_notes}}'} to create friendly fill-in fields.
              </p>
            )}
          </Panel>

          {message ? (
            <SurfaceNotice
              description={message}
              title={saveState === 'error' ? 'Draft not saved' : 'Import note'}
              tone={saveState === 'error' ? 'error' : 'info'}
            />
          ) : null}

          <button
            className="min-h-12 w-full rounded-full bg-[var(--button-primary)] px-5 text-sm font-semibold text-[var(--button-primary-ink)] shadow-[0_12px_26px_rgba(25,35,50,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saveState === 'saving' || workspace.status !== 'ready'}
            type="submit"
          >
            {saveState === 'saving' ? 'Saving private draft…' : 'Save private draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
