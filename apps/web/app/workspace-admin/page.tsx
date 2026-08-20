import type { Metadata } from 'next';
import { WorkspaceAdminScreen } from '@/app/components/screens/WorkspaceAdminScreen';

export const metadata: Metadata = {
  title: 'Workspace Admin',
};

export default function WorkspaceAdminPage() {
  return <WorkspaceAdminScreen />;
}
