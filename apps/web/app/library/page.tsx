import type { Metadata } from 'next';

import { LibraryScreen } from '@/app/components/screens/LibraryScreen';

export const metadata: Metadata = {
  title: 'Library',
};

export default function LibraryPage() {
  return <LibraryScreen />;
}
