import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { AGENT_STATUS_LABEL } from "../../src/lib/savana/labels";
import type { AgentSnapshot, AgentStatus, SavanaEvent } from "../../src/lib/savana/types";
import type { SavanaService } from "./service";

/**
 * Speaks the Claw3D gateway protocol (the same one the bundled demo gateway
 * uses) so the existing 3D office renders the five Savana agents without a
 * second rendering path. Agent activity in the office mirrors the real
 * agent status computed by SavanaService — nothing is invented here.
 */

const MAIN_KEY = "main";
const sessionKeyFor = (agentId: string) => `agent:${agentId}:${MAIN_KEY}`;

type OfficeActivity = "running" | "error" | "idle";

export const officeActivityFor = (status: AgentStatus): OfficeActivity => {
  if (status === "preparando" || status === "trabalhando" || status === "em_revisao" || status === "aguardando_aprovacao") {
    return "running";
  }
  if (status === "bloqueado" || status === "falhou") return "error";
  return "idle";
};

type Frame = { type: string; id?: string; method?: string; params?: Record<string, unknown> };

const SUPPORTED_METHODS = [
  "agents.list",
  "sessions.list",
  "sessions.preview",
  "sessions.patch",
  "sessions.reset",
  "chat.send",
  "chat.abort",
  "chat.history",
  "agent.wait",
  "status",
  "config.get",
  "agents.files.get",
  "exec.approvals.get",
  "skills.status",
  "models.list",
  "cron.list",
  "wake",
];

const READ_ONLY_REJECT = new Set([
  "agents.create",
  "agents.update",
  "agents.delete",
  "agents.files.set",
  "config.set",
  "config.patch",
  "exec.approvals.set",
  "exec.approval.resolve",
  "cron.add",
  "cron.run",
  "cron.remove",
]);

export class OfficeGateway {
  private clients = new Set<(frame: unknown) => void>();
  private runIdByAgent = new Map<string, string>();
  private activityByAgent = new Map<string, OfficeActivity>();
  private history = new Map<string, { role: string; content: string }[]>();

  constructor(private readonly service: SavanaService) {
    for (const agent of service.listAgents()) {
      this.applyActivity(agent, false);
    }
    service.on("event", (event: SavanaEvent) => {
      if (event.type !== "agents.updated") return;
      for (const agent of event.agents) this.applyActivity(agent, true);
    });
  }

  private broadcast(frame: unknown) {
    for (const send of this.clients) {
      try {
        send(frame);
      } catch {
        // ignore broken clients
      }
    }
  }

  private lifecycleFrame(agentId: string, runId: string, phase: "start" | "end" | "error") {
    return {
      type: "event",
      event: "agent",
      payload: {
        runId,
        sessionKey: sessionKeyFor(agentId),
        stream: "lifecycle",
        data: { phase },
      },
    };
  }

  /** Converts a status change into office lifecycle events. */
  private applyActivity(agent: AgentSnapshot, notify: boolean) {
    const next = officeActivityFor(agent.status);
    const previous = this.activityByAgent.get(agent.id) ?? "idle";
    this.activityByAgent.set(agent.id, next);
    if (next === previous) return;
    const currentRunId = this.runIdByAgent.get(agent.id);
    if (next === "running") {
      const runId = randomUUID();
      this.runIdByAgent.set(agent.id, runId);
      if (notify) this.broadcast(this.lifecycleFrame(agent.id, runId, "start"));
      return;
    }
    if (currentRunId) {
      this.runIdByAgent.delete(agent.id);
      if (notify) this.broadcast(this.lifecycleFrame(agent.id, currentRunId, next === "error" ? "error" : "end"));
    } else if (next === "error" && notify) {
      const runId = randomUUID();
      this.broadcast(this.lifecycleFrame(agent.id, runId, "start"));
      this.broadcast(this.lifecycleFrame(agent.id, runId, "error"));
    }
  }

  private agentListPayload() {
    return this.service.listAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      workspace: `/savana/${agent.id}`,
      identity: { name: agent.name },
      role: agent.role,
    }));
  }

  private replyFor(agentId: string, message: string): string {
    const agent = this.service.listAgents().find((a) => a.id === agentId);
    const runtime = this.service.getRuntimeInfo();
    const who = agent ? `${agent.name} (${agent.role})` : agentId;
    const status = agent ? AGENT_STATUS_LABEL[agent.status] : "desconhecido";
    if (runtime.mode === "demonstracao") {
      return (
        `[DEMONSTRAÇÃO] Resposta pré-programada de ${who}. Status atual: ${status}. ` +
        `Recebi: "${message.slice(0, 160)}". No modo demonstração não existe um modelo respondendo — ` +
        "crie tarefas na Central de Comando (/savana) para ver o fluxo simulado."
      );
    }
    return (
      `${who} — mensagem automática do sistema: ${runtime.label}. ` +
      "Nenhum modelo de IA está conectado a este agente, então não há resposta real ao chat. " +
      "Use a Central de Comando (/savana) para registrar tarefas, aprovações e acompanhar o status."
    );
  }

  private async handle(method: string, params: Record<string, unknown>, send: (f: unknown) => void) {
    const agents = this.service.listAgents();
    switch (method) {
      case "agents.list":
        return { defaultId: "nexo", mainKey: MAIN_KEY, agents: this.agentListPayload() };
      case "sessions.list":
        return {
          sessions: agents.map((agent) => ({
            key: sessionKeyFor(agent.id),
            agentId: agent.id,
            updatedAt: null,
            displayName: "Main",
            origin: { label: agent.name, provider: "savana" },
            model: "savana/none",
            modelProvider: "savana",
          })),
        };
      case "sessions.preview": {
        const keys = Array.isArray(params.keys) ? params.keys.map(String) : [];
        return {
          ts: Date.now(),
          previews: keys.map((key) => {
            const items = this.history.get(key) ?? [];
            return items.length
              ? {
                  key,
                  status: "ok",
                  items: items.slice(-8).map((m) => ({ role: m.role, text: m.content.slice(0, 240), timestamp: Date.now() })),
                }
              : { key, status: "empty", items: [] };
          }),
        };
      }
      case "sessions.patch":
        return { ok: true, key: params.key, entry: {}, resolved: { model: "savana/none", modelProvider: "savana" } };
      case "sessions.reset":
        if (typeof params.key === "string") this.history.delete(params.key);
        return { ok: true };
      case "chat.history": {
        const key = typeof params.sessionKey === "string" ? params.sessionKey : sessionKeyFor("nexo");
        return { sessionKey: key, messages: this.history.get(key) ?? [] };
      }
      case "chat.send": {
        const sessionKey = typeof params.sessionKey === "string" ? params.sessionKey : sessionKeyFor("nexo");
        const agentId = sessionKey.split(":")[1] ?? "nexo";
        const message = typeof params.message === "string" ? params.message.trim().slice(0, 2000) : "";
        const runId =
          typeof params.idempotencyKey === "string" && params.idempotencyKey ? params.idempotencyKey : randomUUID();
        if (!message) return { status: "no-op", runId };
        const reply = this.replyFor(agentId, message);
        const history = this.history.get(sessionKey) ?? [];
        history.push({ role: "user", content: message }, { role: "assistant", content: reply });
        this.history.set(sessionKey, history.slice(-40));
        setImmediate(() =>
          send({
            type: "event",
            event: "chat",
            payload: { runId, sessionKey, state: "final", stopReason: "end_turn", message: { role: "assistant", content: reply } },
          })
        );
        return { status: "started", runId };
      }
      case "chat.abort":
        return { ok: true, aborted: 0 };
      case "agent.wait":
        return { status: "done" };
      case "status":
        return { sessions: { recent: [], byAgent: agents.map((a) => ({ agentId: a.id, recent: [] })) } };
      case "config.get":
        return { config: { gateway: { reload: { mode: "hot" } } }, hash: "savana", exists: true, path: "savana" };
      case "agents.files.get":
        return { file: { missing: true } };
      case "exec.approvals.get":
        return {
          path: "",
          exists: true,
          hash: "savana",
          file: { version: 1, defaults: { security: "deny", ask: "always", autoAllowSkills: false }, agents: {} },
        };
      case "skills.status":
        return { skills: [] };
      case "models.list":
        return { models: [] };
      case "cron.list":
        return { jobs: [] };
      case "wake":
        return { ok: true };
      default:
        return {};
    }
  }

  attach(ws: WebSocket) {
    let connected = false;
    const send = (frame: unknown) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(frame));
    };
    send({ type: "event", event: "connect.challenge", payload: { nonce: randomUUID() } });

    ws.on("message", async (raw) => {
      let frame: Frame;
      try {
        frame = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!frame || frame.type !== "req" || typeof frame.id !== "string" || typeof frame.method !== "string") return;
      const { id, method } = frame;
      const params = frame.params && typeof frame.params === "object" ? frame.params : {};
      if (method === "connect") {
        connected = true;
        this.clients.add(send);
        send({
          type: "res",
          id,
          ok: true,
          payload: {
            type: "hello-ok",
            protocol: 3,
            adapterType: "demo",
            features: { methods: SUPPORTED_METHODS, events: ["chat", "agent", "presence", "heartbeat"] },
            snapshot: {
              health: {
                agents: this.service.listAgents().map((a) => ({ agentId: a.id, name: a.name, isDefault: a.id === "nexo" })),
                defaultAgentId: "nexo",
              },
              sessionDefaults: { mainKey: MAIN_KEY },
            },
            auth: { role: "operator", scopes: ["operator.read"] },
            policy: { tickIntervalMs: 30000 },
          },
        });
        // Replay current activity after the office hydrates its agents. The
        // office may take a while to load (slow GPUs), so replay a few times and
        // then keep re-asserting running agents; repeated "start" frames for the
        // same run are idempotent on the client.
        const replay = (includeErrors: boolean) => {
          for (const [agentId, runId] of this.runIdByAgent) send(this.lifecycleFrame(agentId, runId, "start"));
          if (!includeErrors) return;
          for (const [agentId, activity] of this.activityByAgent) {
            if (activity !== "error") continue;
            const runId = randomUUID();
            send(this.lifecycleFrame(agentId, runId, "start"));
            send(this.lifecycleFrame(agentId, runId, "error"));
          }
        };
        for (const delay of [2_500, 8_000, 20_000]) {
          const timer = setTimeout(() => replay(true), delay);
          ws.once("close", () => clearTimeout(timer));
        }
        const keepAlive = setInterval(() => replay(false), 30_000);
        ws.once("close", () => clearInterval(keepAlive));
        return;
      }
      if (!connected) {
        send({ type: "res", id, ok: false, error: { code: "not_connected", message: "Send connect first." } });
        return;
      }
      if (READ_ONLY_REJECT.has(method)) {
        send({
          type: "res",
          id,
          ok: false,
          error: {
            code: "unsupported_method",
            message: "Os agentes Savana são definidos pelo backend Savana e não podem ser alterados pelo escritório.",
          },
        });
        return;
      }
      try {
        send({ type: "res", id, ok: true, payload: await this.handle(method, params, send) });
      } catch (error) {
        send({
          type: "res",
          id,
          ok: false,
          error: { code: "internal_error", message: error instanceof Error ? error.message : "Erro interno" },
        });
      }
    });
    const cleanup = () => this.clients.delete(send);
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  }
}
