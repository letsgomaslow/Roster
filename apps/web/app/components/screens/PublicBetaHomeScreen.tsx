'use client';

import Link from 'next/link';
import { AuthCtas } from '@/app/components/control-plane/AuthCtas';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';
import { Badge } from '@/app/components/control-plane/primitives';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';

export function PublicBetaHomeScreen({
  authSurfaceState,
  diagnostic,
}: {
  authSurfaceState: AuthSurfaceState;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="brand">Public beta</Badge>
            <p className="text-sm text-[var(--muted)]">
              Open signup for teams validating MCP setup, prompt inventory, and run visibility.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--strategy-strong)]">
              Beta Entry
            </p>
            <h1 className="max-w-4xl font-heading text-balance text-4xl tracking-[-0.06em] text-[var(--ink)] md:text-6xl">
              Public beta access for the Roster MCP server control plane
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--muted)] md:text-lg">
              Roster is the operational surface for teams shipping MCP-backed prompts and agent
              workflows. Sign in to connect a host, prove server health, create a first prompt, and
              open a traceable run without leaving the product.
            </p>
          </div>
          <AuthCtas
            authSurfaceState={authSurfaceState}
            className="pt-2"
            signInLabel="Sign in to beta"
            signUpLabel="Create beta account"
          />
          {authSurfaceState !== 'ready' ? (
            <AuthSurfaceNotice authSurfaceState={authSurfaceState} diagnostic={diagnostic} />
          ) : null}
          <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
            <p>Supported auth: Google, GitHub, and email</p>
            <p>Expected outcome: a working host config and first successful orchestration</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(145deg,rgba(25,35,50,0.98),rgba(64,24,119,0.96))] p-6 text-white shadow-[var(--shadow-panel-strong)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/80">
            What happens after signup
          </p>
          <ol className="mt-5 space-y-4">
            {[
              'Connect Claude Desktop, Cursor, or another MCP-compatible host.',
              'Verify health, tool discovery, and rate visibility in one checklist.',
              'Create a prompt and run the first orchestration from the same control plane.',
            ].map((item, index) => (
              <li
                className="flex items-start gap-4 rounded-[24px] border border-white/12 bg-white/6 px-4 py-4"
                key={item}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold">
                  0{index + 1}
                </span>
                <p className="text-sm leading-7 text-white/90">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--strategy-strong)]">
            Who beta is for
          </p>
          <p className="mt-4 text-lg font-semibold text-[var(--ink)]">
            Teams that need an operational view, not a generic prompt gallery.
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            The product is tuned for developers, operators, and prompt owners who need to see setup
            readiness, prompt creation, and orchestration history in one workflow.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--strategy-strong)]">
            Beta expectations
          </p>
          <p className="mt-4 text-lg font-semibold text-[var(--ink)]">
            Core setup and execution flows are the priority.
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            You should expect a stable auth path, readable status surfaces, and responsive setup
            tooling. Broader workflow depth will continue expanding during beta.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-soft)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--strategy-strong)]">
            Support path
          </p>
          <p className="mt-4 text-lg font-semibold text-[var(--ink)]">Need help before signup?</p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Use the in-product feedback path once signed in, or review the setup guidance before
            you connect a host.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            href="/integrations"
          >
            Review setup guidance
          </Link>
        </div>
      </section>
    </div>
  );
}
