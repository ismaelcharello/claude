import { useState } from "react";

const isSameJson = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/** Copies `value`, reusing each top-level field of `previous` that is structurally equal. */
export const shareFields = <T extends Record<string, unknown>>(previous: T, value: T): T => {
  let changed = Object.keys(previous).length !== Object.keys(value).length;
  const next = {} as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (isSameJson(previous[key], value[key])) {
      next[key] = previous[key];
    } else {
      next[key] = value[key];
      changed = true;
    }
  }
  return changed ? (next as T) : previous;
};

/**
 * Returns `value` with each top-level field replaced by the previous render's
 * field when the two are structurally equal. Use it for derived objects that
 * are rebuilt every render (e.g. time-based state) so effects depending on
 * individual fields only re-run when the content actually changes.
 */
export function useStructuralSharing<T extends Record<string, unknown>>(value: T): T {
  const [stable, setStable] = useState(value);
  const next = shareFields(stable, value);
  // Adjusting state while rendering is the documented React pattern for
  // "storing information from previous renders"; it only re-renders when the
  // content actually changed.
  if (next !== stable) setStable(next);
  return next;
}
