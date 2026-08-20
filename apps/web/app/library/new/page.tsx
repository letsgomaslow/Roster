import type { Metadata } from 'next';
import { SaveAssetScreen } from '@/app/components/screens/SaveAssetScreen';

export const metadata: Metadata = {
  title: 'Save New Work',
};

export default function SaveNewWorkPage() {
  return <SaveAssetScreen />;
}
