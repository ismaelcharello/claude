import type {
  AgentDetail,
  Approval,
  Artifact,
  CreateTaskInput,
  Overview,
  Subtask,
  Task,
  TaskDetail,
  TaskStatus,
  TimelineEvent,
} from "@/lib/savana/types";

export class SavanaApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const BASE = "/api/savana";

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new SavanaApiError("Backend Savana inacessível. Ele está rodando? (npm run savana)", 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      (res.status >= 500 ? "Backend Savana inacessível. Ele está rodando? (npm run savana)" : `Erro ${res.status}`);
    throw new SavanaApiError(message, res.status);
  }
  return data as T;
}

export const savanaApi = {
  overview: () => request<Overview>("/overview"),
  agent: (id: string) => request<AgentDetail>(`/agents/${encodeURIComponent(id)}`),
  task: (id: string) => request<TaskDetail>(`/tasks/${encodeURIComponent(id)}`),
  createTask: (input: CreateTaskInput) => request<Task>("/tasks", { method: "POST", body: input }),
  setStatus: (id: string, status: TaskStatus, extra: { note?: string; blockedReason?: string } = {}) =>
    request<Task>(`/tasks/${encodeURIComponent(id)}/status`, { method: "POST", body: { status, ...extra } }),
  addNote: (id: string, message: string) =>
    request<TimelineEvent>(`/tasks/${encodeURIComponent(id)}/notes`, { method: "POST", body: { message } }),
  addSubtask: (id: string, title: string) =>
    request<Subtask>(`/tasks/${encodeURIComponent(id)}/subtasks`, { method: "POST", body: { title } }),
  setSubtaskDone: (id: string, done: boolean) =>
    request<Subtask>(`/subtasks/${encodeURIComponent(id)}`, { method: "POST", body: { done } }),
  addArtifact: (id: string, artifact: Pick<Artifact, "kind" | "title" | "content">) =>
    request<Artifact>(`/tasks/${encodeURIComponent(id)}/artifacts`, { method: "POST", body: artifact }),
  decide: (id: string, decision: "aprovada" | "rejeitada", note?: string) =>
    request<Approval>(`/approvals/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: { decision, note },
    }),
};
