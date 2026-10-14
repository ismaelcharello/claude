import os from "node:os";
import path from "node:path";
import type { RuntimeMode } from "../../src/lib/savana/types";

export type SavanaConfig = {
  host: string;
  port: number;
  runtimeMode: RuntimeMode;
  dataDir: string;
  dbPath: string;
  demoStepMs: number;
  repoRoot: string | null;
  worktreeRoot: string;
  claudeCodeEnabled: boolean;
  /** Claude Code binary: a name looked up on PATH, or an absolute path. */
  claudeBin: string;
  /** Hard time limit for one agent execution. */
  runTimeoutMs: number;
  /** Maximum agent turns per execution (cost guard). */
  maxTurns: number;
  /** Isolated working folders, one per task (non-code agents). */
  workspacesDir: string;
  /** Origins allowed to open the realtime WebSocket. */
  allowedOrigins: string[];
};

const parseRuntimeMode = (raw: string | undefined): RuntimeMode => {
  const value = (raw ?? "").trim().toLowerCase();
  if (["demo", "demonstracao", "demonstração"].includes(value)) return "demonstracao";
  if (["claude", "claude-code", "claude_code"].includes(value)) return "claude_code";
  return "nao_configurado";
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): SavanaConfig => {
  const runtimeMode = parseRuntimeMode(env.SAVANA_RUNTIME);
  const dataDir = path.resolve(env.SAVANA_DATA_DIR?.trim() || path.join(process.cwd(), "data"));
  // Demonstration data never mixes with real data: it lives in its own file.
  const dbFile = runtimeMode === "demonstracao" ? "savana-demo.db" : "savana.db";
  const host = env.SAVANA_API_HOST?.trim() || "127.0.0.1";
  if (!LOOPBACK_HOSTS.has(host)) {
    // There is no authentication layer yet, so refuse to listen publicly.
    throw new Error(
      `SAVANA_API_HOST=${host} não é permitido: o backend Savana ainda não tem autenticação e só escuta em loopback.`
    );
  }
  const port = Number.parseInt(env.SAVANA_API_PORT ?? "3100", 10);
  const studioPort = Number.parseInt(env.PORT ?? "3000", 10);
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 3100,
    runtimeMode,
    dataDir,
    dbPath: path.join(dataDir, dbFile),
    demoStepMs: Math.max(0, Number.parseInt(env.SAVANA_DEMO_STEP_MS ?? "3500", 10) || 0),
    repoRoot: env.SAVANA_REPO_ROOT?.trim() ? path.resolve(env.SAVANA_REPO_ROOT.trim()) : null,
    // FORJA's isolated git worktrees live outside any repository by default.
    worktreeRoot: path.resolve(env.SAVANA_WORKTREE_ROOT?.trim() || path.join(os.homedir(), "savana-worktrees")),
    claudeCodeEnabled: env.SAVANA_CLAUDE_CODE_ENABLED === "true",
    claudeBin: env.SAVANA_CLAUDE_BIN?.trim() || "claude",
    runTimeoutMs: Math.max(10_000, Number.parseInt(env.SAVANA_RUN_TIMEOUT_MS ?? "600000", 10) || 600_000),
    maxTurns: Math.min(100, Math.max(1, Number.parseInt(env.SAVANA_MAX_TURNS ?? "25", 10) || 25)),
    workspacesDir: path.join(dataDir, "workspaces"),
    // Studio (browser) origin, plus the backend's own origin, which the Studio
    // gateway proxy sends when it connects server-side to /gateway.
    allowedOrigins: [studioPort, port].flatMap((p) => [`http://localhost:${p}`, `http://127.0.0.1:${p}`]),
  };
};
