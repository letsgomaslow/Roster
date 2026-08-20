import type { Metadata } from 'next';
import { LibraryScreen } from '@/app/components/screens/LibraryScreen';

export const metadata: Metadata = {
  title: 'Approvals',
};

export default function ApprovalsPage() {
  return <LibraryScreen scope="approvals" />;
}
