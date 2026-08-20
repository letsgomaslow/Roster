export type WorkspaceRole = 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer';

export type WorkLibraryNavItem = {
  href: string;
  label: string;
  caption: string;
};

const CORE_ITEMS: WorkLibraryNavItem[] = [
  { href: '/', label: 'Home', caption: 'Your team’s useful work' },
  { href: '/library', label: 'Library', caption: 'Prompts and playbooks' },
  { href: '/my-work', label: 'My Work', caption: 'Drafts and saved work' },
];

const CONTROL_PLANE_ITEMS: WorkLibraryNavItem[] = [
  { href: '/', label: 'Home', caption: 'Operational readiness' },
  { href: '/library', label: 'Prompt Library', caption: 'Technical prompt catalog' },
  { href: '/agents', label: 'Agents', caption: 'Agent catalog' },
  { href: '/runs', label: 'Runs', caption: 'Execution history' },
  { href: '/integrations', label: 'Integrations', caption: 'MCP setup' },
  { href: '/settings', label: 'Settings', caption: 'Usage and feedback' },
];

export function getWorkLibraryNavigation(
  role?: WorkspaceRole,
  workLibraryEnabled = true,
): WorkLibraryNavItem[] {
  if (!workLibraryEnabled) return [...CONTROL_PLANE_ITEMS];
  const items = [...CORE_ITEMS];
  if (role === 'owner' || role === 'admin' || role === 'curator') {
    items.push({ href: '/approvals', label: 'Approvals', caption: 'Review team work' });
  }
  if (role === 'owner' || role === 'admin') {
    items.push(
      { href: '/workspace-admin', label: 'Workspace Admin', caption: 'People and policies' },
      { href: '/advanced', label: 'Advanced', caption: 'MCP and legacy tools' },
    );
  }
  return items;
}
