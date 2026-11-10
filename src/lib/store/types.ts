import type { Level, Locale } from "../schemas";

export type SessionRecord = {
  id: string;
  level: Level;
  locale: Locale;
  questionIds: string[];
  /** sha256 of the secret token handed to the player who started the round. */
  tokenHash: string;
  answers: Record<string, boolean> | null;
  correctCount: number | null;
  score: number | null;
  startedAt: string; // ISO
  finishedAt: string | null;
  durationMs: number | null;
  ipHash: string | null;
  published: boolean;
};

export type NewSession = Pick<
  SessionRecord,
  "level" | "locale" | "questionIds" | "tokenHash" | "ipHash"
> & { startedAt: string };

export type FinishData = {
  answers: Record<string, boolean>;
  correctCount: number;
  score: number;
  finishedAt: string;
  durationMs: number;
};

export type LeaderboardRow = {
  sessionId: string;
  nickname: string;
  level: Level;
  score: number;
  correctCount: number;
  durationMs: number;
  createdAt: string;
};

export type NewLeaderboardRow = Omit<LeaderboardRow, "createdAt"> & {
  createdAt: string;
};

export interface QuizStore {
  createSession(input: NewSession): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionRecord | null>;
  /** Atomic: finishes only an unfinished session. Returns null if it was already finished. */
  finishSession(id: string, data: FinishData): Promise<SessionRecord | null>;
  /** Atomic: publishes only a finished, unpublished session. Returns null otherwise. */
  publishEntry(row: NewLeaderboardRow): Promise<LeaderboardRow | null>;
  getEntry(sessionId: string): Promise<LeaderboardRow | null>;
  /** 1-based position of an entry and the leaderboard size. */
  getRank(row: LeaderboardRow): Promise<{ rank: number; total: number }>;
  listLeaderboard(opts: {
    limit: number;
    offset: number;
  }): Promise<{ entries: LeaderboardRow[]; total: number }>;
  /** Counts a hit for `key`; returns false when the limit for the window is exceeded. */
  hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
}
