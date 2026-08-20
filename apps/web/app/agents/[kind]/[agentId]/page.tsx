import type { Metadata } from 'next';

import { AgentDetailScreen } from '@/app/components/screens/AgentDetailScreen';

type PageProps = {
  params: Promise<{ kind: 'subagents' | 'main-agents'; agentId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind } = await params;
  return {
    title: kind === 'subagents' ? 'Subagent Detail' : 'Main Agent Detail',
  };
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { kind, agentId } = await params;
  return <AgentDetailScreen agentId={agentId} kind={kind} />;
}
