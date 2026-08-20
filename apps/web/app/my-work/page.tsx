import type { Metadata } from 'next';
import { LibraryScreen } from '@/app/components/screens/LibraryScreen';

export const metadata: Metadata = {
  title: 'My Work',
};

export default function MyWorkPage() {
  return <LibraryScreen scope="my_work" />;
}
