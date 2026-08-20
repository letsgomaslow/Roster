import { PageIntro } from '@/app/components/control-plane/primitives';

function loadingTitle(pathname: string) {
  if (pathname === '/') return 'Preparing your workspace';
  if (pathname.startsWith('/library')) return 'Preparing your Library';
  if (pathname.startsWith('/getting-started')) return 'Preparing your first step';
  return 'Preparing this workspace screen';
}

export function WorkspaceLoadingScreen({ pathname }: { pathname: string }) {
  return (
    <div aria-busy="true" className="space-y-8" role="status">
      <PageIntro
        description="Roster is resolving identity, workspace access, and the data needed for one complete first render."
        eyebrow="Roster workspace"
        title={loadingTitle(pathname)}
      />
      <div aria-hidden="true" className="grid gap-4 border-t border-[var(--line)] pt-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="min-h-48 border border-[var(--line)] bg-[var(--panel-soft)] p-5" key={item}>
            <div className="h-3 w-24 bg-[var(--panel-muted)]" />
            <div className="mt-5 h-7 w-2/3 bg-[var(--panel-muted)]" />
            <div className="mt-5 h-3 w-full bg-[var(--panel-muted)]" />
            <div className="mt-2 h-3 w-4/5 bg-[var(--panel-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
