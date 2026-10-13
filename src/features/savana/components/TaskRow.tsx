"use client";

import Link from "next/link";
import { getAgentDefinition } from "@/lib/savana/agents";
import type { Task } from "@/lib/savana/types";
import { AgentAvatar, PriorityLabel, SimulatedTag, TaskStatusBadge, formatDate, formatDateTime } from "./ui";

export function TaskRow({ task, showAgent = true }: { task: Task; showAgent?: boolean }) {
  const agent = getAgentDefinition(task.agentId);
  const overdue =
    task.dueDate && !["concluido", "cancelada"].includes(task.status) && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <Link
      href={`/savana/tasks/${task.id}`}
      className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-savana-gold/25 hover:bg-savana-mid/20"
    >
      {showAgent && agent ? <AgentAvatar name={agent.name} color={agent.color} size={34} /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-savana-ivory group-hover:text-white">{task.title}</span>
          {task.simulated ? <SimulatedTag /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-savana-ivory/50">
          <span>{task.project}</span>
          {showAgent && agent ? <span>{agent.name}</span> : null}
          {task.dueDate ? (
            <span className={overdue ? "text-[#f0aaa1]" : ""}>Prazo {formatDate(task.dueDate)}</span>
          ) : null}
          <span>Atualizada {formatDateTime(task.updatedAt)}</span>
        </div>
        {task.status === "bloqueado" && task.blockedReason ? (
          <p className="mt-1 text-xs text-[#f0aaa1]">Bloqueio: {task.blockedReason}</p>
        ) : null}
      </div>
      <PriorityLabel priority={task.priority} />
      <TaskStatusBadge status={task.status} />
    </Link>
  );
}
