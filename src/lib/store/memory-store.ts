import { randomUUID } from "node:crypto";
import { compareEntries } from "../scoring";
import type { LeaderboardRow, QuizStore, SessionRecord } from "./types";

type MemoryState = {
  sessions: Map<string, SessionRecord>;
  entries: Map<string, LeaderboardRow>;
  rateLimits: Map<string, { windowStart: number; count: number }>;
};

const GLOBAL_KEY = Symbol.for("quiz-claude-code.memory-store");

// Kept on globalThis so data survives Next.js dev hot reloads.
function state(): MemoryState {
  const g = globalThis as unknown as Record<symbol, MemoryState | undefined>;
  g[GLOBAL_KEY] ??= {
    sessions: new Map(),
    entries: new Map(),
    rateLimits: new Map(),
  };
  return g[GLOBAL_KEY];
}

export function resetMemoryStore() {
  const s = state();
  s.sessions.clear();
  s.entries.clear();
  s.rateLimits.clear();
}

const clone = <T>(v: T): T => structuredClone(v);

export const memoryStore: QuizStore = {
  async createSession(input) {
    const record: SessionRecord = {
      id: randomUUID(),
      ...input,
      answers: null,
      correctCount: null,
      score: null,
      finishedAt: null,
      durationMs: null,
      published: false,
    };
    state().sessions.set(record.id, record);
    return clone(record);
  },

  async getSession(id) {
    const s = state().sessions.get(id);
    return s ? clone(s) : null;
  },

  async finishSession(id, data) {
    const s = state().sessions.get(id);
    if (!s || s.finishedAt) return null;
    Object.assign(s, data);
    return clone(s);
  },

  async publishEntry(row) {
    const { sessions, entries } = state();
    const s = sessions.get(row.sessionId);
    if (!s || !s.finishedAt || s.published || entries.has(row.sessionId))
      return null;
    s.published = true;
    entries.set(row.sessionId, { ...row });
    return { ...row };
  },

  async getEntry(sessionId) {
    const e = state().entries.get(sessionId);
    return e ? { ...e } : null;
  },

  async getRank(row) {
    const all = [...state().entries.values()];
    const better = all.filter((e) => compareEntries(e, row) < 0).length;
    return { rank: better + 1, total: all.length };
  },

  async listLeaderboard({ limit, offset }) {
    const all = [...state().entries.values()].sort(compareEntries);
    return {
      entries: all.slice(offset, offset + limit).map((e) => ({ ...e })),
      total: all.length,
    };
  },

  async hitRateLimit(key, limit, windowMs) {
    const now = Date.now();
    const { rateLimits } = state();
    const current = rateLimits.get(key);
    if (!current || now - current.windowStart >= windowMs) {
      rateLimits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  },
};
