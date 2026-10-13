#!/usr/bin/env node
/**
 * Starts the Savana Command Center locally: the Savana backend (Node +
 * TypeScript, SQLite) and the Claw3D Studio server, wired together.
 *
 *   npm run savana        -> runtime not configured (default, nothing executes)
 *   npm run savana:demo   -> demonstration mode (simulated, separate database)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = process.argv.includes("--demo");

// Minimal .env loader (KEY=VALUE lines); real environment variables win.
const envFile = path.join(root, ".env");
const fileEnv = {};
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !line.trim().startsWith("#")) fileEnv[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const apiPort = process.env.SAVANA_API_PORT || fileEnv.SAVANA_API_PORT || "3100";
const dataDir = path.resolve(root, process.env.SAVANA_DATA_DIR || fileEnv.SAVANA_DATA_DIR || "data");

const env = {
  ...fileEnv,
  ...process.env,
  SAVANA_API_PORT: apiPort,
  SAVANA_DATA_DIR: dataDir,
  ...(demo ? { SAVANA_RUNTIME: "demo" } : {}),
  // The 3D office connects to the Savana backend through the Claw3D gateway protocol.
  CLAW3D_GATEWAY_URL: `ws://localhost:${apiPort}/gateway`,
  CLAW3D_GATEWAY_ADAPTER_TYPE: "demo",
  NEXT_PUBLIC_SAVANA_OFFICE: "1",
  // Keep Studio settings inside the project so an existing OpenClaw setup is never touched.
  OPENCLAW_STATE_DIR: path.join(dataDir, demo ? "studio-demo" : "studio"),
};
delete env.DEMO_ADAPTER_PORT;
delete env.HERMES_ADAPTER_PORT;

const children = [];
const run = (name, args) => {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    console.log(`[savana] ${name} encerrou (${signal ?? code}).`);
    shutdown(code ?? 0);
  });
  children.push(child);
};

let stopping = false;
const shutdown = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
};
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`[savana] Iniciando ${demo ? "em MODO DEMONSTRAÇÃO" : "(runtime de agentes não configurado)"}…`);
run("backend", ["--import", "tsx", "savana/server/main.ts"]);
run("studio", ["server/index.js", "--dev"]);
