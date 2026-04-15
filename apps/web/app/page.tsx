import type { Metadata } from 'next';

import { HomeScreen } from './components/screens/HomeScreen';

export const metadata: Metadata = {
  title: 'Home',
};

export default function Home() {
  return <HomeScreen />;
}
