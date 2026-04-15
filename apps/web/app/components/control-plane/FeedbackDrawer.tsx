'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { cx } from '@/lib/cx';
import { openFeedback } from '@/lib/control-plane-events';
import { useTrackProductEvent } from './useProductEvents';
import { useDialogA11y } from './useDialogA11y';

type FeedbackSeed = {
  type?: 'bug' | 'confusing_ux' | 'missing_capability' | 'feature_request';
  page?: string;
  route?: string;
  message?: string;
  context?: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  micro?: boolean;
};

const TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'confusing_ux', label: 'Confusing UX' },
  { value: 'missing_capability', label: 'Missing capability' },
  { value: 'feature_request', label: 'Feature request' },
] as const;

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

function seedToState(seed?: FeedbackSeed) {
  return {
    type: seed?.type ?? 'confusing_ux',
    severity: seed?.severity ?? 'medium',
    page: seed?.page ?? 'Control plane',
    route: seed?.route ?? '/',
    message: seed?.message ?? '',
    context: seed?.context ?? {},
    micro: seed?.micro ?? false,
  };
}

export function FeedbackDrawer() {
  return <FeedbackDrawerInner isSignedIn={false} />;
}

export function ClerkFeedbackDrawer() {
  const { isSignedIn } = useAuth();
  return <FeedbackDrawerInner isSignedIn={Boolean(isSignedIn)} />;
}

function FeedbackDrawerInner({ isSignedIn }: { isSignedIn: boolean }) {
  const submitFeedback = useMutation(api.prompts.submitFeedback);
  const track = useTrackProductEvent();
  const titleId = useId();
  const descriptionId = useId();
  const typeId = useId();
  const severityId = useId();
  const pageId = useId();
  const routeId = useId();
  const messageId = useId();
  const errorId = useId();
  const statusId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [state, setState] = useState(seedToState());
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const seed = (event as CustomEvent<FeedbackSeed | undefined>).detail;
      setState(seedToState(seed));
      setStatus('idle');
      setError(null);
      setOpen(true);
    };

    window.addEventListener('roster:feedback', handleFeedback as EventListener);
    window.addEventListener('roster:micro-feedback', handleFeedback as EventListener);

    return () => {
      window.removeEventListener('roster:feedback', handleFeedback as EventListener);
      window.removeEventListener('roster:micro-feedback', handleFeedback as EventListener);
    };
  }, []);

  useDialogA11y({
    open,
    onClose: () => setOpen(false),
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSignedIn) {
      setError('Sign in before sending beta feedback.');
      return;
    }

    setStatus('saving');
    setError(null);
    try {
      await submitFeedback({
        type: state.type,
        severity: state.severity,
        page: state.page,
        route: state.route,
        message: state.message.trim(),
        context: state.context,
      });
      await track('feedback_submitted', {
        page: state.page,
        route: state.route,
        type: state.type,
        severity: state.severity,
        micro: state.micro,
      });
      setStatus('saved');
      setTimeout(() => setOpen(false), 650);
    } catch (submissionError) {
      setStatus('error');
      setError(submissionError instanceof Error ? submissionError.message : 'Feedback failed');
    }
  }

  return (
    <>
      <button
        className="hidden"
        onClick={() => openFeedback({ page: 'Control plane', route: '/', micro: false })}
        type="button"
      />
      <div
        aria-hidden={!open}
        className={cx(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        hidden={!open}
        onClick={() => setOpen(false)}
      />
      <aside
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx(
          'fixed inset-y-4 right-4 z-50 w-[min(92vw,460px)] rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-panel-strong)] backdrop-blur-xl transition duration-300',
          open ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0 pointer-events-none',
        )}
        hidden={!open}
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--strategy-strong)]">
              Beta Feedback
            </p>
            <h2 className="font-heading text-2xl tracking-[-0.04em] text-[var(--ink)]" id={titleId}>
              {state.micro
                ? 'What blocked the last step?'
                : 'Tell us where the control plane breaks down'}
            </h2>
            <p className="text-sm leading-6 text-[var(--muted)]" id={descriptionId}>
              Feedback is stored with route and entity context so the beta backlog stays actionable.
            </p>
          </div>
          <button
            className="min-h-11 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-white"
            onClick={() => setOpen(false)}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]" id={`${typeId}-label`}>
                Type
              </span>
              <select
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                id={typeId}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    type: event.target.value as typeof current.type,
                  }))
                }
                value={state.type}
              >
                {TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Severity</span>
              <select
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                id={severityId}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    severity: event.target.value as typeof current.severity,
                  }))
                }
                value={state.severity}
              >
                {SEVERITIES.map((severity) => (
                  <option key={severity.value} value={severity.value}>
                    {severity.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Page</span>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                id={pageId}
                onChange={(event) =>
                  setState((current) => ({ ...current, page: event.target.value }))
                }
                value={state.page}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--muted)]">Route</span>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 font-mono text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
                id={routeId}
                onChange={(event) =>
                  setState((current) => ({ ...current, route: event.target.value }))
                }
                value={state.route}
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--muted)]">What happened?</span>
            <textarea
              aria-describedby={error ? errorId : statusId}
              aria-invalid={error ? 'true' : 'false'}
              className="min-h-40 w-full rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-[var(--ink)] outline-none transition focus:border-[var(--focus-ring-solid)]"
              id={messageId}
              onChange={(event) =>
                setState((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="The setup flow looked complete, but the generated config still needed manual edits..."
              required
              value={state.message}
            />
          </label>

          {error ? (
            <div
              className="rounded-2xl border border-[var(--error-soft)] bg-[rgba(213,44,44,0.08)] px-4 py-3 text-sm text-[var(--error)]"
              id={errorId}
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p
              aria-live="polite"
              className="text-xs text-[var(--muted)]"
              id={statusId}
              role="status"
            >
              {status === 'saved'
                ? 'Feedback saved.'
                : status === 'saving'
                  ? 'Saving feedback…'
                  : 'Stored with route metadata and optional entity context.'}
            </p>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--button-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-ink)] transition hover:bg-[var(--button-primary-hover)] disabled:opacity-60"
              disabled={status === 'saving' || state.message.trim().length < 10}
              type="submit"
            >
              Send feedback
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
