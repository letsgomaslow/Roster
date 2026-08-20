import type { Metadata } from 'next';

import { AssetDetailScreen } from '@/app/components/screens/AssetDetailScreen';

type PageProps = {
  params: Promise<{ promptId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return {
    title: 'Work Detail',
  };
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { promptId } = await params;
  return <AssetDetailScreen assetId={promptId} />;
}
