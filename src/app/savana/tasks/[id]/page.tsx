import { notFound } from "next/navigation";
import { TaskScreen } from "@/features/savana/screens/TaskScreen";

export default async function SavanaTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) notFound();
  return <TaskScreen taskId={id} />;
}
