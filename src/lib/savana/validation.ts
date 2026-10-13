import { isAgentId } from "./agents";
import {
  GATED_ACTIONS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type GatedAction,
  type TaskPriority,
  type TaskStatus,
} from "./types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Strips control characters (except newline/tab) and trims. */
export const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === "string"
    ? value
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, maxLength)
    : "";

export const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);

export const isPriority = (value: unknown): value is TaskPriority =>
  typeof value === "string" && (TASK_PRIORITIES as readonly string[]).includes(value);

export const isGatedAction = (value: unknown): value is GatedAction =>
  typeof value === "string" && (GATED_ACTIONS as readonly string[]).includes(value);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const validateCreateTask = (input: unknown): ValidationResult<CreateTaskInput> => {
  if (!isRecord(input)) return { ok: false, errors: ["Corpo da requisição inválido."] };
  const errors: string[] = [];
  const title = cleanText(input.title, 160);
  const briefing = cleanText(input.briefing, 8000);
  const project = cleanText(input.project, 80);
  if (title.length < 3) errors.push("Título precisa ter ao menos 3 caracteres.");
  if (briefing.length < 10) errors.push("Briefing precisa ter ao menos 10 caracteres.");
  if (!project) errors.push("Projeto é obrigatório.");
  if (!isPriority(input.priority)) errors.push("Prioridade inválida.");
  if (!isAgentId(input.agentId)) errors.push("Agente responsável inválido.");
  let dueDate: string | null = null;
  if (input.dueDate !== undefined && input.dueDate !== null && input.dueDate !== "") {
    const raw = cleanText(input.dueDate, 10);
    if (!DATE_RE.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
      errors.push("Prazo deve estar no formato AAAA-MM-DD.");
    } else {
      dueDate = raw;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      briefing,
      project,
      priority: input.priority as TaskPriority,
      agentId: input.agentId as CreateTaskInput["agentId"],
      dueDate,
    },
  };
};

/**
 * Validates a workspace-relative path for artifacts or worktrees. Rejects
 * absolute paths, traversal, NUL bytes, home expansion and hidden git dirs.
 */
export const validateRelativePath = (value: unknown): ValidationResult<string> => {
  if (typeof value !== "string" || !value.trim()) return { ok: false, errors: ["Caminho vazio."] };
  const raw = value.trim();
  if (raw.length > 300) return { ok: false, errors: ["Caminho longo demais."] };
  if (raw.includes("\0")) return { ok: false, errors: ["Caminho contém byte nulo."] };
  if (raw.startsWith("/") || raw.startsWith("\\") || /^[a-zA-Z]:/.test(raw) || raw.startsWith("~")) {
    return { ok: false, errors: ["Caminho precisa ser relativo ao workspace."] };
  }
  const parts = raw.split(/[\\/]+/);
  if (parts.some((part) => part === ".." )) return { ok: false, errors: ["Caminho não pode subir diretórios (..)."] };
  if (parts.some((part) => part === ".git")) return { ok: false, errors: ["Acesso a .git não é permitido."] };
  if (!/^[\w.\-\\/ ]+$/.test(raw)) return { ok: false, errors: ["Caminho contém caracteres não permitidos."] };
  return { ok: true, value: parts.filter((part) => part && part !== ".").join("/") };
};
