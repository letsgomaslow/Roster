import type { Metadata } from 'next';

import { RunsScreen } from '@/app/components/screens/RunsScreen';

export const metadata: Metadata = {
  title: 'Runs',
};

export default function RunsPage() {
  return <RunsScreen />;
}
