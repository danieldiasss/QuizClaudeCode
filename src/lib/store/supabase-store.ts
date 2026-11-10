import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Level, Locale } from "../schemas";
import type { LeaderboardRow, QuizStore, SessionRecord } from "./types";

type SessionRow = {
  id: string;
  level: Level;
  locale: Locale;
  question_ids: string[];
  token_hash: string;
  answers: Record<string, boolean> | null;
  correct_count: number | null;
  score: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  ip_hash: string | null;
  published: boolean;
};

type EntryRow = {
  session_id: string;
  nickname: string;
  level: Level;
  score: number;
  correct_count: number;
  duration_ms: number;
  created_at: string;
};

const toSession = (r: SessionRow): SessionRecord => ({
  id: r.id,
  level: r.level,
  locale: r.locale,
  questionIds: r.question_ids,
  tokenHash: r.token_hash,
  answers: r.answers,
  correctCount: r.correct_count,
  score: r.score,
  startedAt: new Date(r.started_at).toISOString(),
  finishedAt: r.finished_at && new Date(r.finished_at).toISOString(),
  durationMs: r.duration_ms,
  ipHash: r.ip_hash,
  published: r.published,
});

const toEntry = (r: EntryRow): LeaderboardRow => ({
  sessionId: r.session_id,
  nickname: r.nickname,
  level: r.level,
  score: r.score,
  correctCount: r.correct_count,
  durationMs: r.duration_ms,
  createdAt: new Date(r.created_at).toISOString(),
});

function fail(context: string, error: { message: string }): never {
  throw new Error(`Supabase ${context} failed: ${error.message}`);
}

export function createSupabaseStore(
  url: string,
  serviceRoleKey: string,
): QuizStore {
  const db: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async createSession(input) {
      const { data, error } = await db
        .from("quiz_sessions")
        .insert({
          level: input.level,
          locale: input.locale,
          question_ids: input.questionIds,
          token_hash: input.tokenHash,
          ip_hash: input.ipHash,
          started_at: input.startedAt,
        })
        .select()
        .single<SessionRow>();
      if (error) fail("createSession", error);
      return toSession(data);
    },

    async getSession(id) {
      const { data, error } = await db
        .from("quiz_sessions")
        .select()
        .eq("id", id)
        .maybeSingle<SessionRow>();
      if (error) fail("getSession", error);
      return data ? toSession(data) : null;
    },

    async finishSession(id, d) {
      const { data, error } = await db
        .from("quiz_sessions")
        .update({
          answers: d.answers,
          correct_count: d.correctCount,
          score: d.score,
          finished_at: d.finishedAt,
          duration_ms: d.durationMs,
        })
        .eq("id", id)
        .is("finished_at", null)
        .select()
        .maybeSingle<SessionRow>();
      if (error) fail("finishSession", error);
      return data ? toSession(data) : null;
    },

    async publishEntry(row) {
      // Score/level/duration are copied from the session inside the SQL function.
      const { data, error } = await db.rpc("publish_entry", {
        p_session_id: row.sessionId,
        p_nickname: row.nickname,
      });
      if (error) fail("publishEntry", error);
      const [published] = (data ?? []) as EntryRow[];
      return published ? toEntry(published) : null;
    },

    async getEntry(sessionId) {
      const { data, error } = await db
        .from("leaderboard_entries")
        .select()
        .eq("session_id", sessionId)
        .maybeSingle<EntryRow>();
      if (error) fail("getEntry", error);
      return data ? toEntry(data) : null;
    },

    async getRank(row) {
      const { data, error } = await db.rpc("leaderboard_rank", {
        p_session_id: row.sessionId,
      });
      if (error) fail("getRank", error);
      const [r] = (data ?? []) as { rank: number; total: number }[];
      return { rank: Number(r?.rank ?? 0), total: Number(r?.total ?? 0) };
    },

    async listLeaderboard({ limit, offset }) {
      const { data, error, count } = await db
        .from("leaderboard_entries")
        .select("*", { count: "exact" })
        .order("score", { ascending: false })
        .order("duration_ms", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1)
        .returns<EntryRow[]>();
      if (error) fail("listLeaderboard", error);
      return { entries: (data ?? []).map(toEntry), total: count ?? 0 };
    },

    async hitRateLimit(key, limit, windowMs) {
      const { data, error } = await db.rpc("hit_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: Math.ceil(windowMs / 1000),
      });
      if (error) fail("hitRateLimit", error);
      return data === true;
    },
  };
}
