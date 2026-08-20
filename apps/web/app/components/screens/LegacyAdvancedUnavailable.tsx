import { ActionButton, SurfaceNotice } from '@/app/components/control-plane/primitives';

export function LegacyAdvancedUnavailable() {
  return (
    <SurfaceNotice
      action={
        <ActionButton href="/integrations" tone="ghost">
          Open Setup Center
        </ActionButton>
      }
      description="The Work Library alpha keeps legacy agent, run, and control-plane tools turned off. The Setup Center remains available for connection guidance."
      title="Legacy Advanced tools are unavailable"
      tone="info"
    />
  );
}
