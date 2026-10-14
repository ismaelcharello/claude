import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { SAVANA_AGENTS, getAgentDefinition } from "../../src/lib/savana/agents";
import { GATED_ACTION_LABEL, TASK_STATUS_LABEL } from "../../src/lib/savana/labels";
import { ACTIVE_TASK_STATUSES, canTransition, deriveAgentStatus } from "../../src/lib/savana/stateMachine";
import type {
  ActorKind,
  AgentDetail,
  AgentId,
  AgentLog,
  AgentSnapshot,
  Approval,
  Artifact,
  CreateTaskInput,
  GatedAction,
  Overview,
  Run,
  RuntimeInfo,
  SavanaEvent,
  Subtask,
  Task,
  TaskDetail,
  TaskStatus,
  TimelineEvent,
} from "../../src/lib/savana/types";
import { cleanText, isGatedAction, validateRelativePath } from "../../src/lib/savana/validation";
import type { SavanaDb } from "./db";
import { redactSecrets } from "./runtime/safety";

export class SavanaError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = "invalid_request"
  ) {
    super(message);
  }
}

type Row = Record<string, unknown>;

const bool = (value: unknown) => value === 1 || value === true;

const mapTask = (r: Row): Task => ({
  id: String(r.id),
  title: String(r.title),
  briefing: String(r.briefing),
  priority: r.priority as Task["priority"],
  project: String(r.project),
  agentId: r.agent_id as AgentId,
  dueDate: (r.due_date as string | null) ?? null,
  status: r.status as TaskStatus,
  blockedReason: (r.blocked_reason as string | null) ?? null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  simulated: bool(r.simulated),
});

const mapSubtask = (r: Row): Subtask => ({
  id: String(r.id),
  taskId: String(r.task_id),
  title: String(r.title),
  done: bool(r.done),
  createdAt: String(r.created_at),
});

const mapTimeline = (r: Row): TimelineEvent => ({
  id: String(r.id),
  taskId: String(r.task_id),
  kind: r.kind as TimelineEvent["kind"],
  fromStatus: (r.from_status as TaskStatus | null) ?? null,
  toStatus: (r.to_status as TaskStatus | null) ?? null,
  message: String(r.message),
  actor: r.actor as ActorKind,
  createdAt: String(r.created_at),
  simulated: bool(r.simulated),
});

const mapApproval = (r: Row): Approval => ({
  id: String(r.id),
  taskId: String(r.task_id),
  agentId: r.agent_id as AgentId,
  action: r.action as GatedAction,
  summary: String(r.summary),
  details: String(r.details),
  status: r.status as Approval["status"],
  decidedBy: (r.decided_by as string | null) ?? null,
  decisionNote: (r.decision_note as string | null) ?? null,
  createdAt: String(r.created_at),
  decidedAt: (r.decided_at as string | null) ?? null,
  simulated: bool(r.simulated),
});

const mapArtifact = (r: Row): Artifact => ({
  id: String(r.id),
  taskId: String(r.task_id),
  kind: r.kind as Artifact["kind"],
  title: String(r.title),
  content: String(r.content),
  createdAt: String(r.created_at),
  simulated: bool(r.simulated),
});

const mapLog = (r: Row): AgentLog => ({
  id: String(r.id),
  agentId: r.agent_id as AgentId,
  taskId: (r.task_id as string | null) ?? null,
  level: r.level as AgentLog["level"],
  message: String(r.message),
  createdAt: String(r.created_at),
  simulated: bool(r.simulated),
});

const parseJsonArray = (value: unknown): string[] => {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const mapRun = (r: Row): Run => ({
  id: String(r.id),
  taskId: String(r.task_id),
  agentId: r.agent_id as AgentId,
  runtime: r.runtime as Run["runtime"],
  status: r.status as Run["status"],
  prompt: String(r.prompt),
  worktreePath: (r.worktree_path as string | null) ?? null,
  branch: (r.branch as string | null) ?? null,
  command: r.command_json ? parseJsonArray(r.command_json) : null,
  filesChanged: parseJsonArray(r.files_changed_json),
  resultSummary: (r.result_summary as string | null) ?? null,
  exitCode: (r.exit_code as number | null) ?? null,
  createdAt: String(r.created_at),
  startedAt: (r.started_at as string | null) ?? null,
  finishedAt: (r.finished_at as string | null) ?? null,
  commitSha: (r.commit_sha as string | null) ?? null,
  pushedAt: (r.pushed_at as string | null) ?? null,
});

export type MutationContext = {
  actor: ActorKind;
  /** Marks rows produced by the demonstration runtime. */
  simulated?: boolean;
};

const HUMAN: MutationContext = { actor: "humano" };

/**
 * All reads and writes of Savana state go through this class. It enforces the
 * task state machine and the approval gate, and emits a `SavanaEvent` for
 * every change so the realtime layer and the office adapter stay in sync.
 */
export class SavanaService extends EventEmitter {
  private runtimeInfo: () => RuntimeInfo;

  constructor(
    private readonly db: SavanaDb,
    private readonly clock: () => Date = () => new Date()
  ) {
    super();
    this.runtimeInfo = () => {
      throw new Error("Runtime not attached");
    };
  }

  attachRuntimeInfo(getInfo: () => RuntimeInfo) {
    this.runtimeInfo = getInfo;
  }

  getRuntimeInfo(): RuntimeInfo {
    return this.runtimeInfo();
  }

  private now() {
    return this.clock().toISOString();
  }

  private emitEvent(event: SavanaEvent) {
    this.emit("event", event);
  }

  private emitAgents() {
    this.emitEvent({ type: "agents.updated", agents: this.listAgents() });
  }

  // ---------------------------------------------------------------- reads

  listTasks(filter: { agentId?: string; status?: string } = {}): Task[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.agentId) {
      where.push("agent_id = ?");
      params.push(filter.agentId);
    }
    if (filter.status) {
      where.push("status = ?");
      params.push(filter.status);
    }
    const sql = `SELECT * FROM tasks ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY CASE priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      created_at DESC`;
    return (this.db.prepare(sql).all(...params) as Row[]).map(mapTask);
  }

  getTask(id: string): Task {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row | undefined;
    if (!row) throw new SavanaError("Tarefa não encontrada.", 404, "not_found");
    return mapTask(row);
  }

  getTaskDetail(id: string): TaskDetail {
    const task = this.getTask(id);
    const all = <T>(sql: string, map: (r: Row) => T) => (this.db.prepare(sql).all(id) as Row[]).map(map);
    return {
      task,
      subtasks: all("SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at, rowid", mapSubtask),
      timeline: all("SELECT * FROM timeline WHERE task_id = ? ORDER BY created_at, rowid", mapTimeline),
      approvals: all("SELECT * FROM approvals WHERE task_id = ? ORDER BY created_at DESC, rowid DESC", mapApproval),
      artifacts: all("SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at, rowid", mapArtifact),
      runs: all("SELECT * FROM runs WHERE task_id = ? ORDER BY created_at DESC, rowid DESC", mapRun),
      logs: all("SELECT * FROM agent_logs WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 300", mapLog),
    };
  }

  listApprovals(status?: string): Approval[] {
    const rows = status
      ? this.db.prepare("SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC").all(status)
      : this.db.prepare("SELECT * FROM approvals ORDER BY created_at DESC").all();
    return (rows as Row[]).map(mapApproval);
  }

  listAgents(): AgentSnapshot[] {
    const runtime = this.runtimeInfo();
    const nowMs = this.clock().getTime();
    return SAVANA_AGENTS.map((definition) => {
      const tasks = this.listTasks({ agentId: definition.id });
      const derived = deriveAgentStatus({ tasks, runtimeAvailable: runtime.canExecute, nowMs });
      const pending = this.db
        .prepare("SELECT COUNT(*) AS n FROM approvals WHERE agent_id = ? AND status = 'pendente'")
        .get(definition.id) as { n: number };
      return {
        ...definition,
        status: derived.status,
        statusReason: derived.reason,
        activeTaskIds: tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status)).map((t) => t.id),
        counts: {
          ativas: tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status) || t.status === "na_fila").length,
          concluidas: tasks.filter((t) => t.status === "concluido").length,
          falhas: tasks.filter((t) => t.status === "falhou").length,
          aprovacoesPendentes: pending.n,
        },
      };
    });
  }

  getAgentDetail(agentId: string): AgentDetail {
    const agent = this.listAgents().find((a) => a.id === agentId);
    if (!agent) throw new SavanaError("Agente não encontrado.", 404, "not_found");
    const logs = (
      this.db
        .prepare("SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200")
        .all(agentId) as Row[]
    ).map(mapLog);
    const artifacts = (
      this.db
        .prepare(
          `SELECT a.* FROM artifacts a JOIN tasks t ON t.id = a.task_id
           WHERE t.agent_id = ? ORDER BY a.created_at DESC LIMIT 100`
        )
        .all(agentId) as Row[]
    ).map(mapArtifact);
    const approvals = (
      this.db.prepare("SELECT * FROM approvals WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100").all(agentId) as Row[]
    ).map(mapApproval);
    return { agent, tasks: this.listTasks({ agentId }), logs, artifacts, approvals };
  }

  overview(): Overview {
    const tasks = this.listTasks();
    return {
      runtime: this.runtimeInfo(),
      agents: this.listAgents(),
      tasks,
      pendingApprovals: this.listApprovals("pendente"),
      blockedTasks: tasks.filter((t) => t.status === "bloqueado"),
      generatedAt: this.now(),
    };
  }

  // --------------------------------------------------------------- writes

  private insertTimeline(
    taskId: string,
    kind: TimelineEvent["kind"],
    message: string,
    ctx: MutationContext,
    statuses: { from?: TaskStatus | null; to?: TaskStatus | null } = {}
  ): TimelineEvent {
    const event: TimelineEvent = {
      id: randomUUID(),
      taskId,
      kind,
      fromStatus: statuses.from ?? null,
      toStatus: statuses.to ?? null,
      message: redactSecrets(cleanText(message, 4000)),
      actor: ctx.actor,
      createdAt: this.now(),
      simulated: Boolean(ctx.simulated),
    };
    this.db
      .prepare(
        `INSERT INTO timeline (id, task_id, kind, from_status, to_status, message, actor, created_at, simulated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        taskId,
        kind,
        event.fromStatus,
        event.toStatus,
        event.message,
        event.actor,
        event.createdAt,
        event.simulated ? 1 : 0
      );
    this.emitEvent({ type: "timeline.added", event });
    return event;
  }

  addLog(
    agentId: AgentId,
    message: string,
    ctx: MutationContext,
    options: { taskId?: string | null; level?: AgentLog["level"] } = {}
  ): AgentLog {
    const log: AgentLog = {
      id: randomUUID(),
      agentId,
      taskId: options.taskId ?? null,
      level: options.level ?? "info",
      message: redactSecrets(cleanText(message, 4000)),
      createdAt: this.now(),
      simulated: Boolean(ctx.simulated),
    };
    this.db
      .prepare(
        `INSERT INTO agent_logs (id, agent_id, task_id, level, message, created_at, simulated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(log.id, agentId, log.taskId, log.level, log.message, log.createdAt, log.simulated ? 1 : 0);
    this.emitEvent({ type: "log.added", log });
    return log;
  }

  createTask(input: CreateTaskInput, ctx: MutationContext = HUMAN): Task {
    const now = this.now();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      briefing: input.briefing,
      priority: input.priority,
      project: input.project,
      agentId: input.agentId,
      dueDate: input.dueDate ?? null,
      status: "na_fila",
      blockedReason: null,
      createdAt: now,
      updatedAt: now,
      simulated: Boolean(ctx.simulated),
    };
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, briefing, priority, project, agent_id, due_date, status, blocked_reason,
         created_at, updated_at, simulated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.id,
        task.title,
        task.briefing,
        task.priority,
        task.project,
        task.agentId,
        task.dueDate,
        task.status,
        null,
        now,
        now,
        task.simulated ? 1 : 0
      );
    const agentName = getAgentDefinition(task.agentId)?.name ?? task.agentId;
    this.insertTimeline(task.id, "criada", `Tarefa criada e atribuída a ${agentName}.`, ctx, { to: "na_fila" });
    this.emitEvent({ type: "task.updated", task });
    this.emitAgents();
    this.emit("task.created", task);
    return task;
  }

  transitionTask(
    taskId: string,
    to: TaskStatus,
    ctx: MutationContext = HUMAN,
    options: { note?: string; blockedReason?: string } = {}
  ): Task {
    const task = this.getTask(taskId);
    if (task.status === to) return task;
    if (!canTransition(task.status, to)) {
      throw new SavanaError(
        `Transição inválida: ${TASK_STATUS_LABEL[task.status]} → ${TASK_STATUS_LABEL[to]}.`,
        409,
        "invalid_transition"
      );
    }
    const pending = this.pendingApprovalsFor(taskId);
    if (to === "aguardando_aprovacao" && pending.length === 0) {
      throw new SavanaError(
        "Uma tarefa só entra em 'Aguardando aprovação' quando existe um pedido de aprovação.",
        409,
        "approval_required"
      );
    }
    if (
      task.status === "aguardando_aprovacao" &&
      pending.length > 0 &&
      !["cancelada", "falhou", "bloqueado"].includes(to)
    ) {
      throw new SavanaError("Decida a aprovação pendente antes de seguir com a tarefa.", 409, "approval_pending");
    }
    const blockedReason = to === "bloqueado" ? cleanText(options.blockedReason, 500) : "";
    if (to === "bloqueado" && !blockedReason) {
      throw new SavanaError("Informe o motivo do bloqueio.", 400, "blocked_reason_required");
    }
    const now = this.now();
    this.db
      .prepare("UPDATE tasks SET status = ?, blocked_reason = ?, updated_at = ? WHERE id = ?")
      .run(to, to === "bloqueado" ? blockedReason : null, now, taskId);
    const note = cleanText(options.note, 1000);
    const message =
      `${TASK_STATUS_LABEL[task.status]} → ${TASK_STATUS_LABEL[to]}` +
      (to === "bloqueado" ? ` · Motivo: ${blockedReason}` : "") +
      (note ? ` · ${note}` : "");
    this.insertTimeline(taskId, "status", message, ctx, { from: task.status, to });
    const updated = this.getTask(taskId);
    this.emitEvent({ type: "task.updated", task: updated });
    this.emitAgents();
    this.emit("task.transitioned", updated, task.status);
    return updated;
  }

  addNote(taskId: string, message: string, ctx: MutationContext = HUMAN): TimelineEvent {
    this.getTask(taskId);
    const text = cleanText(message, 2000);
    if (!text) throw new SavanaError("Nota vazia.");
    return this.insertTimeline(taskId, "nota", text, ctx);
  }

  addSubtask(taskId: string, title: string, ctx: MutationContext = HUMAN): Subtask {
    this.getTask(taskId);
    const clean = cleanText(title, 200);
    if (clean.length < 2) throw new SavanaError("Subtarefa precisa de um título.");
    const subtask: Subtask = { id: randomUUID(), taskId, title: clean, done: false, createdAt: this.now() };
    this.db
      .prepare("INSERT INTO subtasks (id, task_id, title, done, created_at) VALUES (?, ?, ?, 0, ?)")
      .run(subtask.id, taskId, clean, subtask.createdAt);
    this.insertTimeline(taskId, "subtarefa", `Subtarefa adicionada: ${clean}`, ctx);
    this.touchTask(taskId);
    return subtask;
  }

  setSubtaskDone(subtaskId: string, done: boolean, ctx: MutationContext = HUMAN): Subtask {
    const row = this.db.prepare("SELECT * FROM subtasks WHERE id = ?").get(subtaskId) as Row | undefined;
    if (!row) throw new SavanaError("Subtarefa não encontrada.", 404, "not_found");
    this.db.prepare("UPDATE subtasks SET done = ? WHERE id = ?").run(done ? 1 : 0, subtaskId);
    const subtask = { ...mapSubtask(row), done };
    this.insertTimeline(
      subtask.taskId,
      "subtarefa",
      `${done ? "Concluída" : "Reaberta"}: ${subtask.title}`,
      ctx
    );
    this.touchTask(subtask.taskId);
    return subtask;
  }

  private touchTask(taskId: string) {
    this.db.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?").run(this.now(), taskId);
    this.emitEvent({ type: "task.updated", task: this.getTask(taskId) });
  }

  private pendingApprovalsFor(taskId: string): Approval[] {
    return (
      this.db.prepare("SELECT * FROM approvals WHERE task_id = ? AND status = 'pendente'").all(taskId) as Row[]
    ).map(mapApproval);
  }

  /**
   * The approval gate. Any runtime that wants to perform a gated action
   * (external write, commit, push, PR, message, credential use) must call
   * this and wait for `approval.resolved`. The task moves to
   * `aguardando_aprovacao` until a human decides.
   */
  requestApproval(
    params: { taskId: string; action: GatedAction; summary: string; details?: string },
    ctx: MutationContext
  ): Approval {
    const task = this.getTask(params.taskId);
    if (!isGatedAction(params.action)) throw new SavanaError("Ação de aprovação inválida.");
    if (["concluido", "cancelada", "falhou"].includes(task.status)) {
      throw new SavanaError("Tarefa encerrada não pode pedir aprovação.", 409, "task_closed");
    }
    const summary = cleanText(params.summary, 300);
    if (!summary) throw new SavanaError("Resumo da aprovação é obrigatório.");
    const approval: Approval = {
      id: randomUUID(),
      taskId: task.id,
      agentId: task.agentId,
      action: params.action,
      summary,
      details: cleanText(params.details, 4000),
      status: "pendente",
      decidedBy: null,
      decisionNote: null,
      createdAt: this.now(),
      decidedAt: null,
      simulated: Boolean(ctx.simulated),
    };
    this.db
      .prepare(
        `INSERT INTO approvals (id, task_id, agent_id, action, summary, details, status, created_at, simulated)
         VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`
      )
      .run(
        approval.id,
        approval.taskId,
        approval.agentId,
        approval.action,
        approval.summary,
        approval.details,
        approval.createdAt,
        approval.simulated ? 1 : 0
      );
    this.insertTimeline(
      task.id,
      "aprovacao",
      `Aprovação solicitada (${GATED_ACTION_LABEL[approval.action]}): ${summary}`,
      ctx
    );
    this.emitEvent({ type: "approval.updated", approval });
    if (task.status !== "aguardando_aprovacao") {
      if (canTransition(task.status, "aguardando_aprovacao")) {
        this.transitionTask(task.id, "aguardando_aprovacao", ctx);
      } else {
        this.emitAgents();
      }
    } else {
      this.emitAgents();
    }
    return approval;
  }

  resolveApproval(
    approvalId: string,
    decision: "aprovada" | "rejeitada",
    params: { note?: string; decidedBy?: string } = {}
  ): Approval {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(approvalId) as Row | undefined;
    if (!row) throw new SavanaError("Aprovação não encontrada.", 404, "not_found");
    const approval = mapApproval(row);
    if (approval.status !== "pendente") {
      throw new SavanaError("Esta aprovação já foi decidida.", 409, "already_decided");
    }
    if (decision !== "aprovada" && decision !== "rejeitada") throw new SavanaError("Decisão inválida.");
    const note = cleanText(params.note, 1000);
    if (decision === "rejeitada" && !note) {
      throw new SavanaError("Explique o motivo da rejeição.", 400, "note_required");
    }
    const decidedAt = this.now();
    const decidedBy = cleanText(params.decidedBy, 80) || "Operador local";
    this.db
      .prepare("UPDATE approvals SET status = ?, decided_by = ?, decision_note = ?, decided_at = ? WHERE id = ?")
      .run(decision, decidedBy, note || null, decidedAt, approvalId);
    const resolved: Approval = { ...approval, status: decision, decidedBy, decisionNote: note || null, decidedAt };
    const ctx: MutationContext = { actor: "humano" };
    this.insertTimeline(
      approval.taskId,
      "aprovacao",
      `${decision === "aprovada" ? "Aprovado" : "Rejeitado"} (${GATED_ACTION_LABEL[approval.action]}) por ${decidedBy}` +
        (note ? ` · ${note}` : ""),
      ctx
    );
    this.emitEvent({ type: "approval.updated", approval: resolved });

    const task = this.getTask(approval.taskId);
    if (task.status === "aguardando_aprovacao" && this.pendingApprovalsFor(task.id).length === 0) {
      if (decision === "aprovada") {
        this.transitionTask(task.id, "trabalhando", ctx, { note: "Liberada após aprovação" });
      } else {
        this.transitionTask(task.id, "bloqueado", ctx, {
          blockedReason: `Aprovação rejeitada: ${note}`,
        });
      }
    } else {
      this.emitAgents();
    }
    this.emit("approval.resolved", resolved);
    return resolved;
  }

  addArtifact(
    params: { taskId: string; kind: Artifact["kind"]; title: string; content: string },
    ctx: MutationContext = HUMAN
  ): Artifact {
    this.getTask(params.taskId);
    const kinds: Artifact["kind"][] = ["documento", "link", "arquivo", "relatorio", "diff"];
    if (!kinds.includes(params.kind)) throw new SavanaError("Tipo de artefato inválido.");
    const title = cleanText(params.title, 160);
    if (!title) throw new SavanaError("Artefato precisa de título.");
    let content = cleanText(params.content, 20000);
    if (params.kind === "link") {
      let url: URL;
      try {
        url = new URL(content);
      } catch {
        throw new SavanaError("Link inválido.");
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new SavanaError("Apenas links http(s) são aceitos.");
      }
      content = url.toString();
    }
    if (params.kind === "arquivo") {
      const checked = validateRelativePath(content);
      if (!checked.ok) throw new SavanaError(checked.errors.join(" "));
      content = checked.value;
    }
    const artifact: Artifact = {
      id: randomUUID(),
      taskId: params.taskId,
      kind: params.kind,
      title,
      content,
      createdAt: this.now(),
      simulated: Boolean(ctx.simulated),
    };
    this.db
      .prepare(
        `INSERT INTO artifacts (id, task_id, kind, title, content, created_at, simulated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(artifact.id, artifact.taskId, artifact.kind, title, content, artifact.createdAt, artifact.simulated ? 1 : 0);
    this.insertTimeline(params.taskId, "artefato", `Artefato registrado: ${title}`, ctx);
    this.emitEvent({ type: "artifact.added", artifact });
    this.touchTask(params.taskId);
    return artifact;
  }

  addRuntimeNote(taskId: string, message: string, ctx: MutationContext): TimelineEvent {
    return this.insertTimeline(taskId, "runtime", message, ctx);
  }

  recordRun(run: Omit<Run, "id" | "createdAt" | "commitSha" | "pushedAt">): Run {
    const full: Run = { ...run, id: randomUUID(), createdAt: this.now(), commitSha: null, pushedAt: null };
    this.db
      .prepare(
        `INSERT INTO runs (id, task_id, agent_id, runtime, status, prompt, worktree_path, branch, command_json,
         files_changed_json, result_summary, exit_code, created_at, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        full.id,
        full.taskId,
        full.agentId,
        full.runtime,
        full.status,
        full.prompt,
        full.worktreePath,
        full.branch,
        full.command ? JSON.stringify(full.command) : null,
        JSON.stringify(full.filesChanged),
        full.resultSummary,
        full.exitCode,
        full.createdAt,
        full.startedAt,
        full.finishedAt
      );
    this.emitEvent({ type: "run.updated", run: full });
    return full;
  }

  getRun(id: string): Run {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as Row | undefined;
    if (!row) throw new SavanaError("Execução não encontrada.", 404, "not_found");
    return mapRun(row);
  }

  listRunsByStatus(status: Run["status"]): Run[] {
    return (this.db.prepare("SELECT * FROM runs WHERE status = ?").all(status) as Row[]).map(mapRun);
  }

  updateRun(
    id: string,
    patch: Partial<
      Pick<Run, "status" | "filesChanged" | "resultSummary" | "exitCode" | "startedAt" | "finishedAt" | "commitSha" | "pushedAt">
    >
  ): Run {
    const current = this.getRun(id);
    const next: Run = { ...current, ...patch };
    this.db
      .prepare(
        `UPDATE runs SET status = ?, files_changed_json = ?, result_summary = ?, exit_code = ?, started_at = ?,
         finished_at = ?, commit_sha = ?, pushed_at = ? WHERE id = ?`
      )
      .run(
        next.status,
        JSON.stringify(next.filesChanged),
        next.resultSummary ? redactSecrets(cleanText(next.resultSummary, 4000)) : null,
        next.exitCode,
        next.startedAt,
        next.finishedAt,
        next.commitSha,
        next.pushedAt,
        id
      );
    const updated = this.getRun(id);
    this.emitEvent({ type: "run.updated", run: updated });
    return updated;
  }

  /** Re-broadcast agent snapshots (used by time-based status decay). */
  refreshAgents() {
    this.emitAgents();
  }
}
