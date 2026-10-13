import type { Metadata } from "next";
import { isAgentId } from "@/lib/savana/agents";
import { CommandCenterScreen } from "@/features/savana/screens/CommandCenterScreen";

export const metadata: Metadata = { title: "Central de Comando · Savana" };

export default async function SavanaPage({
  searchParams,
}: {
  searchParams: Promise<{ nova?: string | string[] }>;
}) {
  const { nova } = await searchParams;
  const agent = typeof nova === "string" && isAgentId(nova) ? nova : null;
  return <CommandCenterScreen newTaskFor={agent} />;
}
