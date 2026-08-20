import type { Metadata } from 'next';

import { PromptDetailScreen } from '@/app/components/screens/PromptDetailScreen';

type PageProps = {
  params: Promise<{ promptId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { promptId } = await params;
  return {
    title: promptId === 'new' ? 'New Prompt' : 'Prompt Detail',
  };
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { promptId } = await params;
  return <PromptDetailScreen promptId={promptId} />;
}
