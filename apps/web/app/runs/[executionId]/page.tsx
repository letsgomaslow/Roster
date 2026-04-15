import type { Metadata } from 'next';

import { RunDetailScreen } from '@/app/components/screens/RunDetailScreen';

type PageProps = {
  params: Promise<{ executionId: string }>;
};

export const metadata: Metadata = {
  title: 'Run Detail',
};

export default async function RunDetailPage({ params }: PageProps) {
  const { executionId } = await params;
  return <RunDetailScreen executionId={executionId} />;
}
