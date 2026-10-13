import type { IncomingMessage, ServerResponse } from "node:http";
import { isAgentId } from "../../src/lib/savana/agents";
import { isTaskStatus, validateCreateTask, cleanText } from "../../src/lib/savana/validation";
import { SavanaError, type SavanaService } from "./service";

const MAX_BODY_BYTES = 64 * 1024;

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
};

const readJsonBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const contentType = String(req.headers["content-type"] ?? "");
    if (!contentType.includes("application/json")) {
      reject(new SavanaError("Content-Type precisa ser application/json.", 415, "unsupported_media_type"));
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new SavanaError("Corpo da requisição grande demais.", 413, "payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new SavanaError("JSON inválido.", 400, "invalid_json"));
      }
    });
    req.on("error", reject);
  });

type Handler = (ctx: {
  req: IncomingMessage;
  params: Record<string, string>;
  query: URLSearchParams;
  body: () => Promise<Record<string, unknown>>;
}) => unknown | Promise<unknown>;

type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler; status?: number };

const compile = (path: string) => {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
        keys.push(key);
        return "([A-Za-z0-9_-]{1,64})";
      }) +
      "/?$"
  );
  return { pattern, keys };
};

/**
 * Minimal JSON router for the Savana API. All routes live under /api.
 * Mutating routes require a JSON content type, which also blocks simple
 * cross-site form posts.
 */
export const createApiHandler = (service: SavanaService) => {
  const routes: Route[] = [];
  const add = (method: string, path: string, handler: Handler, status?: number) =>
    routes.push({ method, ...compile(path), handler, status });

  add("GET", "/api/health", () => ({ ok: true, runtime: service.getRuntimeInfo().mode }));
  add("GET", "/api/runtime", () => service.getRuntimeInfo());
  add("GET", "/api/overview", () => service.overview());
  add("GET", "/api/agents", () => service.listAgents());
  add("GET", "/api/agents/:id", ({ params }) => {
    if (!isAgentId(params.id)) throw new SavanaError("Agente não encontrado.", 404, "not_found");
    return service.getAgentDetail(params.id);
  });
  add("GET", "/api/tasks", ({ query }) => {
    const agentId = query.get("agentId") ?? undefined;
    const status = query.get("status") ?? undefined;
    if (agentId && !isAgentId(agentId)) throw new SavanaError("Agente inválido.");
    if (status && !isTaskStatus(status)) throw new SavanaError("Status inválido.");
    return service.listTasks({ agentId, status });
  });
  add(
    "POST",
    "/api/tasks",
    async ({ body }) => {
      const result = validateCreateTask(await body());
      if (!result.ok) throw new SavanaError(result.errors.join(" "), 400, "validation_failed");
      return service.createTask(result.value);
    },
    201
  );
  add("GET", "/api/tasks/:id", ({ params }) => service.getTaskDetail(params.id));
  add("POST", "/api/tasks/:id/status", async ({ params, body }) => {
    const data = await body();
    if (!isTaskStatus(data.status)) throw new SavanaError("Status inválido.");
    return service.transitionTask(params.id, data.status, { actor: "humano" }, {
      note: cleanText(data.note, 1000),
      blockedReason: cleanText(data.blockedReason, 500),
    });
  });
  add(
    "POST",
    "/api/tasks/:id/notes",
    async ({ params, body }) => service.addNote(params.id, cleanText((await body()).message, 2000)),
    201
  );
  add(
    "POST",
    "/api/tasks/:id/subtasks",
    async ({ params, body }) => service.addSubtask(params.id, cleanText((await body()).title, 200)),
    201
  );
  add("POST", "/api/subtasks/:id", async ({ params, body }) => {
    const data = await body();
    if (typeof data.done !== "boolean") throw new SavanaError("Campo 'done' precisa ser booleano.");
    return service.setSubtaskDone(params.id, data.done);
  });
  add(
    "POST",
    "/api/tasks/:id/artifacts",
    async ({ params, body }) => {
      const data = await body();
      return service.addArtifact({
        taskId: params.id,
        kind: data.kind as never,
        title: cleanText(data.title, 160),
        content: typeof data.content === "string" ? data.content : "",
      });
    },
    201
  );
  add("GET", "/api/approvals", ({ query }) => {
    const status = query.get("status") ?? undefined;
    if (status && !["pendente", "aprovada", "rejeitada"].includes(status)) {
      throw new SavanaError("Status de aprovação inválido.");
    }
    return service.listApprovals(status);
  });
  add("POST", "/api/approvals/:id/decision", async ({ params, body }) => {
    const data = await body();
    if (data.decision !== "aprovada" && data.decision !== "rejeitada") {
      throw new SavanaError("Decisão precisa ser 'aprovada' ou 'rejeitada'.");
    }
    return service.resolveApproval(params.id, data.decision, {
      note: cleanText(data.note, 1000),
      decidedBy: cleanText(data.decidedBy, 80),
    });
  });

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://savana.local");
    const method = (req.method ?? "GET").toUpperCase();
    const candidates = routes.filter((route) => route.pattern.test(url.pathname));
    if (candidates.length === 0) {
      sendJson(res, 404, { error: { code: "not_found", message: "Rota não encontrada." } });
      return;
    }
    const route = candidates.find((candidate) => candidate.method === method);
    if (!route) {
      sendJson(res, 405, { error: { code: "method_not_allowed", message: "Método não permitido." } });
      return;
    }
    const match = route.pattern.exec(url.pathname)!;
    const params = Object.fromEntries(route.keys.map((key, index) => [key, match[index + 1]]));
    try {
      const result = await route.handler({
        req,
        params,
        query: url.searchParams,
        body: async () => {
          const parsed = await readJsonBody(req);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new SavanaError("Corpo precisa ser um objeto JSON.");
          }
          return parsed as Record<string, unknown>;
        },
      });
      sendJson(res, route.status ?? 200, result);
    } catch (error) {
      if (error instanceof SavanaError) {
        sendJson(res, error.status, { error: { code: error.code, message: error.message } });
        return;
      }
      console.error("[savana-api] erro inesperado", error);
      sendJson(res, 500, { error: { code: "internal_error", message: "Erro interno." } });
    }
  };
};
