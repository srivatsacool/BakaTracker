/** Shared primitives used across the Tool Registry, MCP, and REST layers. */

/** Deterministic id: `task_<uuid>` style prefixes keep entities greppable. */
export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Today as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function jsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}