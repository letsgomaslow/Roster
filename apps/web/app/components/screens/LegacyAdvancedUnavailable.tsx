import { ActionButton, SurfaceNotice } from '@/app/components/control-plane/primitives';

export function LegacyAdvancedUnavailable() {
  return (
    <div className="space-y-5">
      <div className="border-b border-[var(--line)] pb-5">
        <p className="font-brand-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--strategy-strong)]">Advanced</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Legacy Advanced tools are unavailable</h1>
      </div>
      <SurfaceNotice
        action={
          <ActionButton href="/integrations" tone="ghost">
            Open Setup Center
          </ActionButton>
        }
        description="The Work Library alpha keeps legacy agent, run, and control-plane tools turned off. The Setup Center remains available for connection guidance."
        title="This area is intentionally disabled"
        tone="info"
      />
    </div>
  );
}
