/**
 * Savana Command Center — shared domain types.
 *
 * Pure TypeScript with no runtime dependencies so it can be imported both by
 * the Node backend (savana/server) and by the Next.js frontend.
 */

/** Agent states, as shown in the office and in the Command Center. */
export const AGENT_STATUSES = [
  "offline",
  "disponivel",
  "preparando",
  "trabalhando",
  "bloqueado",
  "aguardando_aprovacao",
  "em_revisao",
  "concluido",
  "falhou",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/** Task states. `na_fila` and `cancelada` exist only for tasks. */
export const TASK_STATUSES = [
  "na_fila",
  "preparando",
  "trabalhando",
  "bloqueado",
  "aguardando_aprovacao",
  "em_revisao",
  "concluido",
  "falhou",
  "cancelada",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["baixa", "media", "alta", "critica"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const AGENT_IDS = ["nexo", "atlas", "lume", "pulso", "forja"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/**
 * Actions that ALWAYS require an explicit human approval before any runtime
 * may perform them. The runtime layer must call the approval gate for these.
 */
export const GATED_ACTIONS = [
  "escrita_externa",
  "commit",
  "push",
  "pull_request",
  "mensagem",
  "uso_de_credencial",
] as const;
export type GatedAction = (typeof GATED_ACTIONS)[number];

export const APPROVAL_STATUSES = ["pendente", "aprovada", "rejeitada"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Which runtime backs the agents. */
export const RUNTIME_MODES = ["nao_configurado", "demonstracao", "claude_code"] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export type ActorKind = "humano" | "sistema" | "agente" | "demonstracao";

export type AgentPermission = {
  id: string;
  label: string;
  /** `livre`: allowed without asking; `aprovacao`: needs human approval; `negado`: never. */
  level: "livre" | "aprovacao" | "negado";
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
  responsibilities: string[];
  permissions: AgentPermission[];
  /** Hex colour used for the avatar and accents. */
  color: string;
  /** Short label for the desk/area in the office. */
  area: string;
};

export type AgentSnapshot = AgentDefinition & {
  status: AgentStatus;
  statusReason: string;
  activeTaskIds: string[];
  counts: { ativas: number; concluidas: number; falhas: number; aprovacoesPendentes: number };
};

export type Task = {
  id: string;
  title: string;
  briefing: string;
  priority: TaskPriority;
  project: string;
  agentId: AgentId;
  dueDate: string | null;
  status: TaskStatus;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** True when the record was produced by the demonstration runtime. */
  simulated: boolean;
};

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  taskId: string;
  kind: "criada" | "status" | "nota" | "subtarefa" | "aprovacao" | "artefato" | "runtime";
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  message: string;
  actor: ActorKind;
  createdAt: string;
  simulated: boolean;
};

export type Approval = {
  id: string;
  taskId: string;
  agentId: AgentId;
  action: GatedAction;
  summary: string;
  details: string;
  status: ApprovalStatus;
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  simulated: boolean;
};

export type Artifact = {
  id: string;
  taskId: string;
  kind: "documento" | "link" | "arquivo" | "relatorio" | "diff";
  title: string;
  /** Free text, a URL, or a workspace-relative path (validated). */
  content: string;
  createdAt: string;
  simulated: boolean;
};

export type AgentLog = {
  id: string;
  agentId: AgentId;
  taskId: string | null;
  level: "info" | "aviso" | "erro";
  message: string;
  createdAt: string;
  simulated: boolean;
};

export type RuntimeRequirement = { id: string; label: string; ok: boolean; hint: string };

export type RuntimeInfo = {
  mode: RuntimeMode;
  label: string;
  /** True only when the runtime can actually execute agent work. */
  canExecute: boolean;
  /** True when activity shown is simulated. */
  simulated: boolean;
  summary: string;
  requirements: RuntimeRequirement[];
  nextSteps: string[];
  /** True when tasks can be started on demand ("Executar com IA"). */
  supportsManualRun?: boolean;
  /** Agents the manual run supports (others are explained in the UI). */
  runnableAgents?: AgentId[];
};

/** A (future) runtime execution attempt. `planejado` = prepared but not executed. */
export type Run = {
  id: string;
  taskId: string;
  agentId: AgentId;
  runtime: RuntimeMode;
  status: "planejado" | "executando" | "concluido" | "falhou" | "cancelado";
  prompt: string;
  worktreePath: string | null;
  branch: string | null;
  command: string[] | null;
  filesChanged: string[];
  resultSummary: string | null;
  exitCode: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** FORJA: commit created by the backend after approval. */
  commitSha: string | null;
  /** FORJA: when the branch was pushed (after a separate approval). */
  pushedAt: string | null;
};

export type TaskDetail = {
  task: Task;
  subtasks: Subtask[];
  timeline: TimelineEvent[];
  approvals: Approval[];
  artifacts: Artifact[];
  runs: Run[];
  logs: AgentLog[];
};

export type AgentDetail = {
  agent: AgentSnapshot;
  tasks: Task[];
  logs: AgentLog[];
  artifacts: Artifact[];
  approvals: Approval[];
};

export type Overview = {
  runtime: RuntimeInfo;
  agents: AgentSnapshot[];
  tasks: Task[];
  pendingApprovals: Approval[];
  blockedTasks: Task[];
  generatedAt: string;
};

/** Realtime messages pushed over the Savana WebSocket. */
export type SavanaEvent =
  | { type: "hello"; runtime: RuntimeInfo }
  | { type: "task.updated"; task: Task }
  | { type: "timeline.added"; event: TimelineEvent }
  | { type: "approval.updated"; approval: Approval }
  | { type: "artifact.added"; artifact: Artifact }
  | { type: "log.added"; log: AgentLog }
  | { type: "agents.updated"; agents: AgentSnapshot[] }
  | { type: "run.updated"; run: Run };

export type CreateTaskInput = {
  title: string;
  briefing: string;
  priority: TaskPriority;
  project: string;
  agentId: AgentId;
  dueDate?: string | null;
};
