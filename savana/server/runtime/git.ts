import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Minimal git helpers for FORJA. Always `execFile` (never a shell), always
 * with an explicit working directory, and only the commands listed here.
 * Commit and push are called by the backend after human approval — the agent
 * itself has no way to run them.
 */

/** Files the runtime writes into the worktree that must never be committed. */
export const RUNTIME_FILES = ["BRIEFING.md", "resultado.md", "node_modules"];
const EXCLUDES = RUNTIME_FILES.map((f) => `:(exclude)${f}`);

const git = (cwd: string, args: string[], timeoutMs = 60_000): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] }).trim();

export const isGitRepo = (dir: string): boolean => {
  try {
    return git(dir, ["rev-parse", "--is-inside-work-tree"]) === "true";
  } catch {
    return false;
  }
};

/** Creates (or reuses) the isolated worktree for a task, on its own branch. */
export const ensureWorktree = (repoRoot: string, worktreePath: string, branch: string): "created" | "reused" => {
  if (fs.existsSync(worktreePath) && isGitRepo(worktreePath)) return "reused";
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  let branchExists = true;
  try {
    git(repoRoot, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
  } catch {
    branchExists = false;
  }
  git(
    repoRoot,
    branchExists ? ["worktree", "add", worktreePath, branch] : ["worktree", "add", "-b", branch, worktreePath, "HEAD"],
    120_000
  );
  // Reuse the main checkout's dependencies so tests can run without network.
  const deps = path.join(repoRoot, "node_modules");
  const link = path.join(worktreePath, "node_modules");
  if (fs.existsSync(deps) && !fs.existsSync(link)) {
    try {
      fs.symlinkSync(deps, link, "dir");
    } catch {
      // tests may still run without it
    }
  }
  return "created";
};

/** Stages every change except runtime files and returns the staged diff. */
export const stageAndDiff = (worktreePath: string): { files: string[]; diff: string } => {
  git(worktreePath, ["add", "-A", "--", ".", ...EXCLUDES]);
  const files = git(worktreePath, ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  const diff = files.length ? git(worktreePath, ["diff", "--cached", "--stat", "--patch", "--no-color"]) : "";
  return { files, diff };
};

export const commitStaged = (worktreePath: string, message: string): string => {
  git(worktreePath, ["commit", "-m", message]);
  return git(worktreePath, ["rev-parse", "HEAD"]);
};

/** Pushes ONLY the FORJA branch to `origin`. Never touches other branches. */
export const pushBranch = (worktreePath: string, branch: string): string => {
  if (!branch.startsWith("savana/forja/")) throw new Error("Push permitido apenas para branches savana/forja/*.");
  return execFileSync("git", ["push", "-u", "origin", `${branch}:${branch}`], {
    cwd: worktreePath,
    encoding: "utf8",
    timeout: 120_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
};

export const gitErrorMessage = (error: unknown): string => {
  const e = error as { stderr?: string | Buffer; message?: string };
  const stderr = e?.stderr ? String(e.stderr).trim() : "";
  return (stderr || e?.message || String(error)).slice(0, 600);
};
