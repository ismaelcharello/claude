import fs from "node:fs";
import path from "node:path";
import { getAgentDefinition } from "../../../src/lib/savana/agents";
import type { RuntimeInfo, RuntimeRequirement, Task } from "../../../src/lib/savana/types";
import type { SavanaConfig } from "../config";
import type { SavanaService } from "../service";
import { resolveInside } from "./safety";
import type { AgentRuntime } from "./types";

/** Looks for an executable on PATH without spawning anything. */
export const findOnPath = (binary: string, envPath = process.env.PATH ?? ""): string | null => {
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

export const describeClaudeCodeRequirements = (config: SavanaConfig): RuntimeRequirement[] => {
  const cli = findOnPath("claude");
  const repoIsGit = Boolean(config.repoRoot && fs.existsSync(path.join(config.repoRoot, ".git")));
  const worktreeOutsideRepo = Boolean(
    config.worktreeRoot &&
      config.repoRoot &&
      config.worktreeRoot !== config.repoRoot &&
      !config.worktreeRoot.startsWith(config.repoRoot + path.sep)
  );
  return [
    {
      id: "cli",
      label: "Claude Code CLI instalado (`claude` no PATH do servidor)",
      ok: Boolean(cli),
      hint: "Instale o Claude Code no computador que roda o backend e faça login com `claude` uma vez.",
    },
    {
      id: "repo",
      label: "SAVANA_REPO_ROOT aponta para um repositório Git",
      ok: repoIsGit,
      hint: "Repositório onde FORJA vai criar worktrees isoladas. Ex.: SAVANA_REPO_ROOT=/caminho/do/repo",
    },
    {
      id: "worktrees",
      label: "SAVANA_WORKTREE_ROOT definido fora do repositório",
      ok: worktreeOutsideRepo,
      hint: "Pasta onde cada tarefa de código ganha sua worktree. Ex.: SAVANA_WORKTREE_ROOT=/caminho/savana-worktrees",
    },
    {
      id: "enabled",
      label: "Execução habilitada explicitamente (SAVANA_CLAUDE_CODE_ENABLED=true)",
      ok: config.claudeCodeEnabled,
      hint: "Chave de segurança: sem ela nenhum processo do Claude Code é iniciado.",
    },
    {
      id: "executor",
      label: "Executor de processos do Claude Code implementado",
      ok: false,
      hint: "Ainda não implementado nesta versão do MVP (ver IMPLEMENTATION_STATUS.md).",
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

/** Builds the prompt a Claude Code agent would receive. Stored with the run for auditability. */
export const buildAgentPrompt = (task: Task): string => {
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
    "Briefing:",
    task.briefing,
    "",
    "Permitido sem pedir:",
    ...allowed,
    "Exige aprovação humana ANTES (pare e peça pelo Command Center):",
    ...gated,
    "Proibido:",
    ...denied,
    "",
    "Nunca faça commit, push, PR, envio de mensagens, escrita fora da worktree ou uso de credenciais sem aprovação registrada.",
    "Ao terminar, liste os arquivos alterados e um resumo verificável do resultado.",
  ].join("\n");
};

/**
 * Claude Code runtime — architecture only. It reports exactly which
 * requirements are missing and, for each new task, records a *planned* run
 * (prompt, worktree, command) without executing anything.
 */
export class ClaudeCodeRuntime implements AgentRuntime {
  constructor(
    private readonly service: SavanaService,
    private readonly config: SavanaConfig
  ) {}

  info(): RuntimeInfo {
    const requirements = describeClaudeCodeRequirements(this.config);
    const missing = requirements.filter((r) => !r.ok);
    return {
      mode: "claude_code",
      label: "Claude Code (preparado, não executa)",
      canExecute: false,
      simulated: false,
      summary:
        "A integração com Claude Code está preparada: cada tarefa ganha um plano de execução registrado " +
        "(prompt, worktree isolada, comando), mas nenhum processo é iniciado nesta versão. " +
        `${missing.length} requisito(s) pendente(s).`,
      requirements,
      nextSteps: missing.map((r) => r.hint),
    };
  }

  onTaskCreated(task: Task): void {
    const prompt = buildAgentPrompt(task);
    const worktree = task.agentId === "forja" ? planWorktree(this.config, task) : null;
    const command = ["claude", "-p", "<prompt>", "--output-format", "stream-json", "--permission-mode", "default"];
    this.service.recordRun({
      taskId: task.id,
      agentId: task.agentId,
      runtime: "claude_code",
      status: "planejado",
      prompt,
      worktreePath: worktree?.worktreePath ?? null,
      branch: worktree?.branch ?? null,
      command,
      filesChanged: [],
      resultSummary: "Plano registrado. Execução desativada nesta versão.",
      exitCode: null,
      startedAt: null,
      finishedAt: null,
    });
    this.service.addRuntimeNote(
      task.id,
      "Plano de execução Claude Code registrado (prompt" +
        (worktree ? `, worktree ${worktree.worktreePath}, branch ${worktree.branch}` : "") +
        "). Nada foi executado: o executor ainda não está habilitado.",
      { actor: "sistema" }
    );
  }

  onApprovalResolved(): void {}

  dispose(): void {}
}
