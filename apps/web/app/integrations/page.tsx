import type { Metadata } from 'next';

import { IntegrationsScreen } from '@/app/components/screens/IntegrationsScreen';

export const metadata: Metadata = {
  title: 'Integrations',
};

export default function IntegrationsPage() {
  return <IntegrationsScreen />;
}
