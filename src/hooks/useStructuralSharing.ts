import { useRef } from "react";

const isSameJson = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/**
 * Returns `value` with each top-level field replaced by the previous render's
 * field when the two are structurally equal. Use it for derived objects that
 * are rebuilt every render (e.g. time-based state) so effects depending on
 * individual fields only re-run when the content actually changes.
 */
export function useStructuralSharing<T extends Record<string, unknown>>(value: T): T {
  const previousRef = useRef<T | null>(null);
  const previous = previousRef.current;
  if (!previous) {
    previousRef.current = value;
    return value;
  }
  let changed = false;
  const next = {} as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    const prevField = previous[key];
    const nextField = value[key];
    if (isSameJson(prevField, nextField)) {
      next[key] = prevField;
    } else {
      next[key] = nextField;
      changed = true;
    }
  }
  if (!changed && Object.keys(previous).length === Object.keys(value).length) {
    return previous;
  }
  previousRef.current = next as T;
  return next as T;
}
