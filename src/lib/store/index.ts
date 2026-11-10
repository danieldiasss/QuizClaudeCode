import "server-only";
import { memoryStore } from "./memory-store";
import { createSupabaseStore } from "./supabase-store";
import type { QuizStore } from "./types";

export type { QuizStore } from "./types";

/**
 * Picks the persistence adapter from DATA_STORE:
 * - "memory": in-process Map (dev, tests, E2E). Data is lost on restart.
 * - "supabase": Postgres via service role (production).
 * In production DATA_STORE must be set explicitly, so a missing Vercel env var
 * fails loudly instead of silently using memory.
 */
export function resolveStore(env: NodeJS.ProcessEnv = process.env): QuizStore {
  const kind =
    env.DATA_STORE ?? (env.NODE_ENV === "production" ? undefined : "memory");

  if (kind === "memory") return memoryStore;

  if (kind === "supabase") {
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "DATA_STORE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return createSupabaseStore(url, key);
  }

  throw new Error(
    `DATA_STORE must be "memory" or "supabase" (got ${JSON.stringify(kind)}).`,
  );
}

let cached: QuizStore | undefined;

export function getStore(): QuizStore {
  cached ??= resolveStore();
  return cached;
}
