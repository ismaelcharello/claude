import type { Metadata } from "next";
import { CommandCenterScreen } from "@/features/savana/screens/CommandCenterScreen";

export const metadata: Metadata = { title: "Central de Comando · Savana" };

export default function SavanaPage() {
  return <CommandCenterScreen />;
}
