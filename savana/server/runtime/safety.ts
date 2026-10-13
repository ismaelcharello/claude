import path from "node:path";

/**
 * Command patterns a future runtime must never run, regardless of approval.
 * Kept deliberately conservative.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[a-z]*f/i,
  /\bgit\s+(commit|merge|rebase)\b/i,
  /\bgh\s+(pr|release|repo)\b/i,
  /\b(curl|wget)\b[^|]*\|\s*(ba|z)?sh\b/i,
  /\bsudo\b/i,
  /\bmkfs\b|\bdd\s+if=/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /\bchmod\s+-R\s+777\b/i,
  />\s*\/dev\/sd[a-z]/i,
];

/** Gated actions are allowed only after approval; they are blocked here so the runtime must go through the gate. */
export const isDangerousCommand = (command: string): boolean =>
  DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));

/**
 * Resolves `relative` inside `root` and guarantees the result cannot escape it.
 * Returns null when the path is outside the root.
 */
export const resolveInside = (root: string, relative: string): string | null => {
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
};

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9_-]{10,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^\s"']{8,}/gi,
];

/** Masks secrets before anything is written to logs or the database. */
export const redactSecrets = (text: string): string =>
  SECRET_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, "[REDACTED]"), text);
