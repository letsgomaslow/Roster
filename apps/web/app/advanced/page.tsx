import type { Metadata } from 'next';
import { AdvancedScreen } from '@/app/components/screens/AdvancedScreen';

export const metadata: Metadata = {
  title: 'Advanced',
};

export default function AdvancedPage() {
  return <AdvancedScreen />;
}
