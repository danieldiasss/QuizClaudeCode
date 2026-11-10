"use client";

import type { Level, Locale, PublicQuestion } from "./schemas";

/**
 * Browser storage can be unavailable (private mode, blocked site data), so every
 * access is wrapped: the quiz must keep working without it.
 */
function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function remove(storage: () => Storage, key: string) {
  try {
    storage().removeItem(key);
  } catch {
    /* ignore */
  }
}

const session = () => window.sessionStorage;
const local = () => window.localStorage;

export type ActiveRound = {
  sessionId: string;
  token: string;
  level: Level;
  locale: Locale;
  questions: PublicQuestion[];
  answers: Record<string, boolean>;
  index: number;
};

/** In-progress round, restored after a reload (RF11). Per tab. */
export const activeRound = {
  get: (level: Level) => read<ActiveRound>(session, `quiz:active:${level}`),
  set: (round: ActiveRound) =>
    write(session, `quiz:active:${round.level}`, round),
  clear: (level: Level) => remove(session, `quiz:active:${level}`),
};

/** Secret token of a finished round, needed to publish it to the leaderboard. */
export const roundToken = {
  get: (sessionId: string) => read<string>(local, `quiz:token:${sessionId}`),
  set: (sessionId: string, token: string) =>
    write(local, `quiz:token:${sessionId}`, token),
  clear: (sessionId: string) => remove(local, `quiz:token:${sessionId}`),
};

/** Question ids of the last round per level, to avoid repeats (RF13). */
export const lastRoundIds = {
  get: (level: Level) => read<string[]>(local, `quiz:last:${level}`) ?? [],
  set: (level: Level, ids: string[]) => write(local, `quiz:last:${level}`, ids),
};

/** Session id the player last published, to highlight their row. */
export const myEntry = {
  get: () => read<string>(local, "quiz:my-entry"),
  set: (sessionId: string) => write(local, "quiz:my-entry", sessionId),
};
