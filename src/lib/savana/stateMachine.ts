import type { AgentStatus, Task, TaskStatus } from "./types";

/**
 * Allowed task transitions. Anything not listed is rejected by the backend.
 * Terminal states (`concluido`, `cancelada`) can only be reopened back to the queue.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  na_fila: ["preparando", "trabalhando", "bloqueado", "cancelada"],
  preparando: ["trabalhando", "bloqueado", "aguardando_aprovacao", "falhou", "na_fila", "cancelada"],
  trabalhando: ["em_revisao", "aguardando_aprovacao", "bloqueado", "falhou", "concluido", "cancelada"],
  bloqueado: ["na_fila", "preparando", "trabalhando", "cancelada", "falhou"],
  aguardando_aprovacao: ["trabalhando", "em_revisao", "bloqueado", "falhou", "cancelada"],
  em_revisao: ["concluido", "trabalhando", "falhou", "bloqueado"],
  concluido: ["na_fila"],
  falhou: ["na_fila", "cancelada"],
  cancelada: ["na_fila"],
};

export const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = [
  "preparando",
  "trabalhando",
  "bloqueado",
  "aguardando_aprovacao",
  "em_revisao",
];

export const canTransition = (from: TaskStatus, to: TaskStatus): boolean =>
  TASK_TRANSITIONS[from].includes(to);

/** How long a finished task keeps its agent in `concluido`/`falhou` before it goes back to `disponivel`. */
export const AGENT_RESULT_LINGER_MS = 10 * 60 * 1000;

/**
 * Derives an agent's state from its tasks. Never invents activity: if the
 * runtime cannot execute, the agent is `offline` regardless of task state.
 */
export const deriveAgentStatus = (params: {
  tasks: readonly Pick<Task, "status" | "updatedAt">[];
  runtimeAvailable: boolean;
  nowMs: number;
}): { status: AgentStatus; reason: string } => {
  if (!params.runtimeAvailable) {
    return { status: "offline", reason: "Runtime de agentes não configurado" };
  }
  const has = (status: TaskStatus) => params.tasks.some((task) => task.status === status);
  if (has("aguardando_aprovacao")) return { status: "aguardando_aprovacao", reason: "Há ação aguardando sua aprovação" };
  if (has("bloqueado")) return { status: "bloqueado", reason: "Uma tarefa está bloqueada" };
  if (has("trabalhando")) return { status: "trabalhando", reason: "Executando tarefa" };
  if (has("preparando")) return { status: "preparando", reason: "Preparando contexto da tarefa" };
  if (has("em_revisao")) return { status: "em_revisao", reason: "Resultado em revisão" };

  const finished = params.tasks
    .filter((task) => task.status === "concluido" || task.status === "falhou")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (finished && params.nowMs - Date.parse(finished.updatedAt) < AGENT_RESULT_LINGER_MS) {
    return finished.status === "falhou"
      ? { status: "falhou", reason: "A última tarefa falhou" }
      : { status: "concluido", reason: "Última tarefa concluída" };
  }
  return { status: "disponivel", reason: "Pronto para receber tarefas" };
};
