import { notFound } from "next/navigation";
import { isAgentId } from "@/lib/savana/agents";
import { AgentScreen } from "@/features/savana/screens/AgentScreen";

export default async function SavanaAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAgentId(id)) notFound();
  return <AgentScreen agentId={id} />;
}
