import type { Metadata } from 'next';

import { IntegrationsScreen } from '@/app/components/screens/IntegrationsScreen';

export const metadata: Metadata = {
  title: 'Setup Center',
};

export default function IntegrationsPage() {
  return <IntegrationsScreen />;
}
