import type { Metadata } from "next";
import { GuideScreen } from "@/features/savana/screens/GuideScreen";

export const metadata: Metadata = { title: "Como usar · Savana" };

export default function SavanaGuidePage() {
  return <GuideScreen />;
}
