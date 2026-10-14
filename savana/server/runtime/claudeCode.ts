import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getAgentDefinition } from "../../../src/lib/savana/agents";
import type { AgentId, Approval, Run, RuntimeInfo, RuntimeRequirement, Task } from "../../../src/lib/savana/types";
import type { SavanaConfig } from "../config";
import { SavanaError, type MutationContext, type SavanaService } from "../service";
import { commitStaged, ensureWorktree, gitErrorMessage, isGitRepo, pushBranch, stageAndDiff } from "./git";
import { redactSecrets, resolveInside } from "./safety";
import type { AgentRuntime } from "./types";

/** Looks for an executable on PATH without spawning anything. */
export const findOnPath = (binary: string, envPath = process.env.PATH ?? ""): string | null => {
  if (path.isAbsolute(binary)) {
    try {
      fs.accessSync(binary, fs.constants.X_OK);
      return binary;
    } catch {
      return null;
    }
  }
  for (const dir of envPath.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, binary);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
};

/** Document agents: always runnable once Claude Code is ready. FORJA also needs a git repository. */
export const RUNNABLE_AGENTS: AgentId[] = ["nexo", "atlas", "lume", "pulso"];

/** Tools the agent may use: files inside its own task folder only. */
export const ALLOWED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"];
/** Never available: shell (git, network, messages), web, sub-agents. */
export const DISALLOWED_TOOLS = ["Bash", "WebFetch", "WebSearch", "Task", "NotebookEdit"];

/**
 * FORJA: file tools plus only test / lint / read-only git commands. Anything
 * else (commit, push, rm, network, package installs) is denied: in
 * non-interactive mode, commands not listed here cannot run.
 */
export const FORJA_ALLOWED_TOOLS = [
  ...ALLOWED_TOOLS,
  "Bash(npm test:*)",
  "Bash(npm run test:*)",
  "Bash(npm run lint:*)",
  "Bash(npm run typecheck:*)",
  "Bash(npx vitest:*)",
  "Bash(npx tsc:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(ls:*)",
];
export const FORJA_DISALLOWED_TOOLS = [
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git reset:*)",
  "Bash(git checkout:*)",
  "Bash(rm:*)",
  "Bash(curl:*)",
  "Bash(npm install:*)",
  "WebFetch",
  "WebSearch",
  "Task",
  "NotebookEdit",
];

export const RESULT_FILE = "resultado.md";
export const BRIEFING_FILE = "BRIEFING.md";

export const describeClaudeCodeRequirements = (config: SavanaConfig): RuntimeRequirement[] => {
  const cli = findOnPath(config.claudeBin);
  const repoIsGit = Boolean(config.repoRoot && isGitRepo(config.repoRoot));
  const worktreeOutsideRepo = Boolean(
    config.repoRoot &&
      config.worktreeRoot !== config.repoRoot &&
      !config.worktreeRoot.startsWith(config.repoRoot + path.sep)
  );
  return [
    {
      id: "cli",
      label: "Claude Code instalado (`claude` disponível no computador que roda a Savana)",
      ok: Boolean(cli),
      hint: "Instale o Claude Code e faça login uma vez rodando `claude` no Terminal (ver guia, seção 'Ligar a IA').",
    },
    {
      id: "enabled",
      label: "Execução habilitada (iniciar com `npm run savana:ia`)",
      ok: config.claudeCodeEnabled,
      hint: "Chave de segurança: sem ela nenhum processo do Claude Code é iniciado.",
    },
    {
      id: "executor",
      label: "Executor de tarefas (NEXO, ATLAS, LUME, PULSO) em pasta isolada",
      ok: true,
      hint: "",
    },
    {
      id: "forja",
      label: config.repoRoot
        ? `FORJA (código): repositório ${config.repoRoot}`
        : "FORJA (código): repositório Git definido em SAVANA_REPO_ROOT",
      ok: repoIsGit && worktreeOutsideRepo,
      hint: !config.repoRoot
        ? "Opcional, só para o FORJA. No arquivo .env, adicione SAVANA_REPO_ROOT=/caminho/do/projeto (um repositório Git) e reinicie."
        : !repoIsGit
          ? "SAVANA_REPO_ROOT não aponta para um repositório Git."
          : "SAVANA_WORKTREE_ROOT precisa ficar fora do repositório.",
    },
  ];
};

export type WorktreePlan = { branch: string; worktreePath: string; commands: string[][] };

/** Plans (does not run) an isolated git worktree for a code task. */
export const planWorktree = (config: SavanaConfig, task: Pick<Task, "id" | "agentId">): WorktreePlan | null => {
  if (!config.repoRoot || !config.worktreeRoot) return null;
  const shortId = task.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  const branch = `savana/${task.agentId}/${shortId}`;
  const worktreePath = resolveInside(config.worktreeRoot, `${task.agentId}-${shortId}`);
  if (!worktreePath) return null;
  return {
    branch,
    worktreePath,
    commands: [["git", "-C", config.repoRoot, "worktree", "add", "-b", branch, worktreePath]],
  };
};

/** Builds the prompt a Claude Code agent receives. Stored with the run for auditability. */
export const buildAgentPrompt = (task: Task, code?: { branch: string }): string => {
  const agent = getAgentDefinition(task.agentId);
  const allowed = agent?.permissions.filter((p) => p.level === "livre").map((p) => `- ${p.label}`) ?? [];
  const gated = agent?.permissions.filter((p) => p.level === "aprovacao").map((p) => `- ${p.label}`) ?? [];
  const denied = agent?.permissions.filter((p) => p.level === "negado").map((p) => `- ${p.label}`) ?? [];
  return [
    `Você é ${agent?.name ?? task.agentId} (${agent?.role ?? ""}) no Savana Command Center.`,
    `Missão: ${agent?.mission ?? ""}`,
    "",
    `Tarefa: ${task.title}`,
    `Projeto: ${task.project} · Prioridade: ${task.priority}${task.dueDate ? ` · Prazo: ${task.dueDate}` : ""}`,
    `O briefing completo está no arquivo ${BRIEFING_FILE} desta pasta.`,
    "",
    "Permitido sem pedir:",
    ...allowed,
    "Exige aprovação humana (NÃO faça; apenas liste no resultado):",
    ...gated,
    "Proibido:",
    ...denied,
    "",
    "Regras desta execução:",
    ...(code
      ? [
          `- Você está numa cópia isolada (git worktree) do repositório, na branch ${code.branch}. Altere o código só aqui.`,
          "- Você pode rodar testes, lint, typecheck e git status/diff/log. Não pode fazer commit, push, apagar arquivos com rm, instalar pacotes nem acessar a internet.",
          "- Ao terminar, NÃO faça commit: o sistema vai mostrar o diff e pedir aprovação humana para o commit.",
          `- No ${RESULT_FILE}, liste também: arquivos alterados, testes executados e o resultado deles, e riscos.`,
        ]
      : ["- Trabalhe somente com arquivos desta pasta. Você não tem terminal, internet nem acesso a outros sistemas."]),
    "- Não invente fatos, números, depoimentos ou datas. Marque como [PENDENTE] o que precisar de confirmação.",
    `- Escreva a entrega final em português no arquivo ${RESULT_FILE}, com as seções:`,
    "  ## Resumo · ## Entrega · ## Pendências e dúvidas · ## Ações que precisam de aprovação (se houver)",
    "- Nunca publique, envie mensagens, faça commit/push ou use credenciais.",
  ].join("\n");
};

/** Only these variables reach the agent process (no other secrets from the server environment). */
const buildChildEnv = (): Record<string, string> => {
  const keep = ["PATH", "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM",
    "ANTHROPIC_API_KEY", "CLAUDE_CONFIG_DIR", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"];
  const env: Record<string, string> = {};
  for (const key of keep) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
};

const AGENT: MutationContext = { actor: "agente" };
const SYSTEM: MutationContext = { actor: "sistema" };
const STARTABLE: Task["status"][] = ["na_fila", "bloqueado", "falhou"];

type ActiveRun = { runId: string; child: ChildProcess; cancelled: boolean; timedOut: boolean; timer: NodeJS.Timeout };

/**
 * Claude Code runtime. Executes a task only when a human clicks "Executar com
 * IA". Each task runs in its own folder with file tools only (no shell, no
 * web), so gated actions (publishing, messages, commits, credentials) are
 * impossible by construction; the agent lists them for human approval.
 */
export class ClaudeCodeRuntime implements AgentRuntime {
  private active = new Map<string, ActiveRun>();

  constructor(
    private readonly service: SavanaService,
    private readonly config: SavanaConfig
  ) {
    // Runs left "executando" by a previous server process cannot be resumed.
    for (const run of service.listRunsByStatus("executando")) {
      service.updateRun(run.id, {
        status: "falhou",
        finishedAt: new Date().toISOString(),
        resultSummary: "Execução interrompida: o servidor foi reiniciado durante a execução.",
      });
    }
  }

  info(): RuntimeInfo {
    const requirements = describeClaudeCodeRequirements(this.config);
    const ready = requirements.filter((r) => r.id === "cli" || r.id === "enabled").every((r) => r.ok);
    const forjaReady = requirements.find((r) => r.id === "forja")?.ok ?? false;
    return {
      mode: "claude_code",
      label: ready ? "Claude Code conectado" : "Claude Code (requisitos pendentes)",
      canExecute: ready,
      simulated: false,
      supportsManualRun: true,
      runnableAgents: forjaReady ? [...RUNNABLE_AGENTS, "forja"] : RUNNABLE_AGENTS,
      summary: ready
        ? "IA real conectada. Cada tarefa só é executada quando você clica em 'Executar com IA' na página dela; " +
          "o agente trabalha numa pasta isolada, sem terminal nem internet, e o resultado volta para sua revisão. " +
          "Cada execução consome sua conta do Claude."
        : "Modo Claude Code selecionado, mas faltam requisitos (veja abaixo). Nenhuma execução é possível até resolvê-los.",
      requirements,
      nextSteps: ready
        ? [
            "Abra uma tarefa e clique em 'Executar com IA'. Comece por um teste simples.",
            ...(forjaReady ? [] : requirements.filter((r) => r.id === "forja").map((r) => r.hint)),
          ]
        : requirements.filter((r) => !r.ok && r.id !== "forja").map((r) => r.hint),
    };
  }

  onTaskCreated(task: Task): void {
    const runnable = this.info().runnableAgents ?? [];
    const message = runnable.includes(task.agentId)
      ? "Pronta para execução com Claude Code. Nada roda sozinho: abra a tarefa e clique em 'Executar com IA' quando quiser."
      : "FORJA precisa de um repositório configurado (SAVANA_REPO_ROOT) para executar. Veja 'Como ativar agentes reais'.";
    this.service.addRuntimeNote(task.id, message, SYSTEM);
  }

  onApprovalResolved(approval: Approval): void {
    if (approval.agentId !== "forja" || approval.status !== "aprovada") return;
    const run = this.service.getTaskDetail(approval.taskId).runs.find((r) => r.branch && r.worktreePath);
    if (!run || !run.worktreePath || !run.branch) return;
    const log = (message: string, level: "info" | "aviso" | "erro" = "info") =>
      this.service.addLog("forja", message, AGENT, { taskId: approval.taskId, level });
    if (approval.action === "commit") {
      try {
        const task = this.service.getTask(approval.taskId);
        stageAndDiff(run.worktreePath);
        const sha = commitStaged(run.worktreePath, `savana(forja): ${task.title}`);
        this.service.updateRun(run.id, { commitSha: sha });
        log(`Commit ${sha.slice(0, 8)} criado na branch ${run.branch} (aprovado por você).`);
        this.service.addRuntimeNote(
          approval.taskId,
          `Commit ${sha.slice(0, 8)} criado na branch ${run.branch}, somente no seu computador. ` +
            "Nada foi enviado ao GitHub; para enviar, use 'Solicitar push'.",
          SYSTEM
        );
        this.safeTransition(approval.taskId, "em_revisao", { note: "Commit criado; revise o código" });
      } catch (error) {
        const message = gitErrorMessage(error);
        log(`Commit falhou: ${message}`, "erro");
        this.safeTransition(approval.taskId, "falhou", { note: `Commit falhou: ${message.slice(0, 200)}` });
      }
      return;
    }
    if (approval.action === "push") {
      try {
        pushBranch(run.worktreePath, run.branch);
        this.service.updateRun(run.id, { pushedAt: new Date().toISOString() });
        log(`Branch ${run.branch} enviada ao GitHub (aprovado por você).`);
        this.service.addRuntimeNote(approval.taskId, `Branch ${run.branch} enviada para o repositório remoto (origin).`, SYSTEM);
      } catch (error) {
        const message = gitErrorMessage(error);
        log(`Push falhou: ${message}`, "erro");
        this.service.addRuntimeNote(approval.taskId, `Push falhou: ${message}`, SYSTEM);
      }
    }
  }

  /** FORJA: asks for a separate approval to push the task branch. */
  requestPush(taskId: string): Approval {
    const task = this.service.getTask(taskId);
    const detail = this.service.getTaskDetail(taskId);
    const run = detail.runs.find((r) => r.branch && r.commitSha);
    if (task.agentId !== "forja" || !run || !run.branch) {
      throw new SavanaError("Não há commit do FORJA para enviar nesta tarefa.", 409, "nothing_to_push");
    }
    if (run.pushedAt) throw new SavanaError("Esta branch já foi enviada.", 409, "already_pushed");
    if (detail.approvals.some((a) => a.action === "push" && a.status === "pendente")) {
      throw new SavanaError("Já existe um pedido de push aguardando sua decisão.", 409, "push_pending");
    }
    return this.service.requestApproval(
      {
        taskId,
        action: "push",
        summary: `Enviar a branch ${run.branch} para o GitHub (origin)`,
        details:
          `Commit ${run.commitSha?.slice(0, 8)}. Envia somente esta branch, usando as credenciais Git do seu computador. ` +
          "Nada é enviado para a branch principal; o merge continua sendo decisão sua (pull request).",
      },
      { actor: "humano" }
    );
  }

  private safeTransition(taskId: string, to: Task["status"], options: { note?: string; blockedReason?: string }) {
    try {
      this.service.transitionTask(taskId, to, AGENT, options);
    } catch (error) {
      this.service.addRuntimeNote(taskId, `Status não alterado automaticamente: ${error instanceof Error ? error.message : error}`, SYSTEM);
    }
  }

  isRunning(taskId: string): boolean {
    return this.active.has(taskId);
  }

  /** Starts a real execution. Throws SavanaError with a user-facing reason when not allowed. */
  startRun(taskId: string): Run {
    const info = this.info();
    if (!info.canExecute) throw new SavanaError("Claude Code não está pronto: " + info.nextSteps.join(" "), 409, "runtime_unavailable");
    let task = this.service.getTask(taskId);
    const isCode = task.agentId === "forja";
    if (!(info.runnableAgents ?? []).includes(task.agentId)) {
      throw new SavanaError(
        "FORJA precisa de um repositório Git configurado (SAVANA_REPO_ROOT no .env) para executar.",
        409,
        "agent_not_runnable"
      );
    }
    if (this.active.has(taskId) || this.service.getTaskDetail(taskId).runs.some((r) => r.status === "executando")) {
      throw new SavanaError("Esta tarefa já está em execução.", 409, "already_running");
    }
    if (!STARTABLE.includes(task.status)) {
      throw new SavanaError("Só é possível executar tarefas na fila, bloqueadas ou que falharam.", 409, "not_startable");
    }

    let workspace: string | null;
    let branch: string | null = null;
    if (isCode) {
      const plan = planWorktree(this.config, task);
      if (!plan) throw new SavanaError("Não foi possível planejar a worktree do FORJA.", 500, "bad_worktree");
      try {
        ensureWorktree(this.config.repoRoot!, plan.worktreePath, plan.branch);
      } catch (error) {
        throw new SavanaError(`Não foi possível criar a cópia isolada (worktree): ${gitErrorMessage(error)}`, 500, "worktree_failed");
      }
      workspace = plan.worktreePath;
      branch = plan.branch;
    } else {
      workspace = resolveInside(this.config.workspacesDir, task.id);
      if (!workspace) throw new SavanaError("Pasta de trabalho inválida.", 500, "bad_workspace");
      fs.mkdirSync(workspace, { recursive: true });
    }
    fs.rmSync(path.join(workspace, RESULT_FILE), { force: true });
    fs.writeFileSync(
      path.join(workspace, BRIEFING_FILE),
      `# ${task.title}\n\nProjeto: ${task.project}\nPrioridade: ${task.priority}\n\n${task.briefing}\n`,
      "utf8"
    );

    if (task.status === "falhou") task = this.service.transitionTask(taskId, "na_fila", SYSTEM, { note: "Nova execução" });
    this.service.transitionTask(taskId, "preparando", AGENT, { note: "Execução com Claude Code iniciada por você" });

    const prompt = buildAgentPrompt(task, branch ? { branch } : undefined);
    const allowed = isCode ? FORJA_ALLOWED_TOOLS : ALLOWED_TOOLS;
    const disallowed = isCode ? FORJA_DISALLOWED_TOOLS : DISALLOWED_TOOLS;
    const args = [
      "-p", prompt,
      "--output-format", "stream-json",
      "--verbose",
      "--max-turns", String(this.config.maxTurns),
      "--permission-mode", "acceptEdits",
      "--allowedTools", ...allowed,
      "--disallowedTools", ...disallowed,
    ];
    const run = this.service.recordRun({
      taskId,
      agentId: task.agentId,
      runtime: "claude_code",
      status: "executando",
      prompt,
      worktreePath: workspace,
      branch,
      command: [this.config.claudeBin, ...args.map((a) => (a === prompt ? "<prompt>" : a))],
      filesChanged: [],
      resultSummary: null,
      exitCode: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });
    const log = (message: string, level: "info" | "aviso" | "erro" = "info") =>
      this.service.addLog(task.agentId, message, AGENT, { taskId, level });
    log(
      isCode
        ? `Execução iniciada na worktree ${workspace} (branch ${branch}). Comandos permitidos: testes, lint e git somente-leitura.`
        : "Execução iniciada (pasta isolada, ferramentas: " + ALLOWED_TOOLS.join(", ") + ")."
    );

    let child: ChildProcess;
    try {
      child = spawn(this.config.claudeBin, args, { cwd: workspace, env: buildChildEnv() as unknown as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      this.finish(taskId, run.id, { ok: false, summary: `Não foi possível iniciar o Claude Code: ${String(error)}` });
      throw new SavanaError("Não foi possível iniciar o Claude Code.", 500, "spawn_failed");
    }

    const timer = setTimeout(() => {
      const entry = this.active.get(taskId);
      if (!entry) return;
      entry.timedOut = true;
      entry.child.kill("SIGTERM");
      setTimeout(() => entry.child.kill("SIGKILL"), 5000).unref();
    }, this.config.runTimeoutMs);
    timer.unref();
    const entry: ActiveRun = { runId: run.id, child, cancelled: false, timedOut: false, timer };
    this.active.set(taskId, entry);

    let started = false;
    let resultText = "";
    let isError = false;
    let costUsd: number | null = null;
    let stderrTail = "";
    let buffer = "";

    const markWorking = () => {
      if (started) return;
      started = true;
      try {
        this.service.transitionTask(taskId, "trabalhando", AGENT, { note: "Agente trabalhando" });
      } catch {
        // task moved meanwhile; keep running and report at the end
      }
    };

    const handleEvent = (event: Record<string, unknown>) => {
      markWorking();
      if (event.type === "assistant") {
        const content = (event.message as { content?: unknown[] } | undefined)?.content ?? [];
        for (const block of content as Record<string, unknown>[]) {
          if (block.type === "text" && typeof block.text === "string" && block.text.trim()) {
            log(block.text.trim().slice(0, 500));
          } else if (block.type === "tool_use") {
            const input = (block.input ?? {}) as Record<string, unknown>;
            const target = typeof input.file_path === "string" ? ` → ${path.basename(input.file_path)}` : "";
            log(`Usando ${String(block.name)}${target}`);
          }
        }
      } else if (event.type === "result") {
        resultText = typeof event.result === "string" ? event.result : "";
        isError = event.is_error === true || (typeof event.subtype === "string" && event.subtype !== "success");
        costUsd = typeof event.total_cost_usd === "number" ? event.total_cost_usd : null;
      }
    };

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      buffer += chunk;
      let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        try {
          handleEvent(JSON.parse(line));
        } catch {
          // non-JSON output is ignored
        }
      }
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });
    child.on("error", (error) => {
      stderrTail += `\n${error.message}`;
    });
    child.on("close", (code) => {
      clearTimeout(entry.timer);
      this.active.delete(taskId);
      // For FORJA the folder is a whole repository: changed files come from git instead.
      const files = isCode ? [] : this.listWorkspaceFiles(workspace);
      const cost = costUsd !== null ? ` · custo informado: US$ ${costUsd.toFixed(4)}` : "";
      if (entry.cancelled) {
        this.finish(taskId, run.id, { ok: false, cancelled: true, code, files, summary: "Execução cancelada por você." });
        return;
      }
      if (entry.timedOut) {
        this.finish(taskId, run.id, { ok: false, code, files, summary: `Tempo-limite atingido (${Math.round(this.config.runTimeoutMs / 1000)} s).` });
        return;
      }
      const resultPath = path.join(workspace, RESULT_FILE);
      const hasResult = fs.existsSync(resultPath);
      if (code === 0 && !isError && hasResult) {
        markWorking(); // a run that produced no stream events is still "trabalhando" -> "em_revisao"
        const content = fs.readFileSync(resultPath, "utf8");
        if (isCode && branch) {
          this.finishCode(taskId, run.id, { code, branch, workspace, summary: (resultText || "Concluído.").slice(0, 800) + cost, resultContent: content });
          return;
        }
        this.finish(taskId, run.id, {
          ok: true,
          code,
          files,
          summary: (resultText || "Concluído.").slice(0, 800) + cost,
          resultContent: content,
        });
        return;
      }
      const reason = !hasResult && code === 0 && !isError
        ? `O agente terminou sem gerar ${RESULT_FILE}.`
        : redactSecrets((resultText || stderrTail || `Código de saída ${code}`).trim().slice(0, 800));
      this.finish(taskId, run.id, { ok: false, code, files, summary: reason + cost });
    });

    return this.service.getRun(run.id);
  }

  cancelRun(taskId: string): void {
    const entry = this.active.get(taskId);
    if (!entry) throw new SavanaError("Não há execução em andamento para esta tarefa.", 409, "not_running");
    entry.cancelled = true;
    entry.child.kill("SIGTERM");
    setTimeout(() => entry.child.kill("SIGKILL"), 5000).unref();
  }

  private listWorkspaceFiles(workspace: string): string[] {
    const out: string[] = [];
    const walk = (dir: string, prefix: string) => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".")) continue;
        const rel = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.isDirectory()) walk(path.join(dir, item.name), rel);
        else if (rel !== BRIEFING_FILE) out.push(rel);
      }
    };
    try {
      walk(workspace, "");
    } catch {
      // workspace removed
    }
    return out.slice(0, 200);
  }

  /** FORJA success: register the diff and ask for approval before any commit. */
  private finishCode(
    taskId: string,
    runId: string,
    outcome: { code: number | null; branch: string; workspace: string; summary: string; resultContent: string }
  ) {
    const log = (m: string, level: "info" | "aviso" | "erro" = "info") => this.service.addLog("forja", m, AGENT, { taskId, level });
    let staged: { files: string[]; diff: string };
    try {
      staged = stageAndDiff(outcome.workspace);
    } catch (error) {
      this.finish(taskId, runId, { ok: false, code: outcome.code, summary: `Não foi possível ler as alterações: ${gitErrorMessage(error)}` });
      return;
    }
    this.service.updateRun(runId, {
      status: "concluido",
      exitCode: outcome.code,
      filesChanged: staged.files,
      resultSummary: outcome.summary,
      finishedAt: new Date().toISOString(),
    });
    this.service.addArtifact({ taskId, kind: "relatorio", title: "Resultado de FORJA (Claude Code)", content: outcome.resultContent }, AGENT);
    if (staged.files.length === 0) {
      log("Execução concluída sem alterações de código.");
      this.safeTransition(taskId, "em_revisao", { note: "Nenhuma alteração de código foi feita" });
      return;
    }
    this.service.addArtifact(
      { taskId, kind: "diff", title: `Alterações propostas (${staged.files.length} arquivo(s))`, content: staged.diff.slice(0, 19_000) },
      AGENT
    );
    log(`Alterações prontas na branch ${outcome.branch}: ${staged.files.join(", ")}. Aguardando sua aprovação para o commit.`);
    this.service.requestApproval(
      {
        taskId,
        action: "commit",
        summary: `Criar commit com ${staged.files.length} arquivo(s) na branch ${outcome.branch}`,
        details:
          `Arquivos: ${staged.files.join(", ")}. O commit fica só no seu computador, na branch ${outcome.branch}. ` +
          "Veja o diff em Artefatos antes de aprovar. Enviar ao GitHub (push) é uma aprovação separada.",
      },
      AGENT
    );
  }

  private finish(
    taskId: string,
    runId: string,
    outcome: { ok: boolean; cancelled?: boolean; code?: number | null; files?: string[]; summary: string; resultContent?: string }
  ) {
    const task = this.service.getTask(taskId);
    this.service.updateRun(runId, {
      status: outcome.ok ? "concluido" : outcome.cancelled ? "cancelado" : "falhou",
      exitCode: outcome.code ?? null,
      filesChanged: outcome.files ?? [],
      resultSummary: outcome.summary,
      finishedAt: new Date().toISOString(),
    });
    const log = (m: string, level: "info" | "aviso" | "erro") => this.service.addLog(task.agentId, m, AGENT, { taskId, level });
    const safeTransition = (to: Task["status"], options: { note?: string; blockedReason?: string }) => {
      try {
        this.service.transitionTask(taskId, to, AGENT, options);
      } catch (error) {
        this.service.addRuntimeNote(taskId, `Status não alterado automaticamente: ${error instanceof Error ? error.message : error}`, SYSTEM);
      }
    };
    if (outcome.ok) {
      this.service.addArtifact(
        { taskId, kind: "relatorio", title: `Resultado de ${getAgentDefinition(task.agentId)?.name ?? task.agentId} (Claude Code)`, content: outcome.resultContent ?? "" },
        AGENT
      );
      log(`Execução concluída. Arquivos: ${(outcome.files ?? []).join(", ") || "nenhum"}.`, "info");
      safeTransition("em_revisao", { note: "Resultado pronto para sua revisão" });
    } else if (outcome.cancelled) {
      log("Execução cancelada.", "aviso");
      safeTransition("bloqueado", { blockedReason: "Execução cancelada por você" });
    } else {
      log(`Execução falhou: ${outcome.summary}`, "erro");
      safeTransition("falhou", { note: outcome.summary.slice(0, 300) });
    }
  }

  dispose(): void {
    for (const entry of this.active.values()) {
      entry.cancelled = true;
      clearTimeout(entry.timer);
      entry.child.kill("SIGTERM");
    }
  }
}
