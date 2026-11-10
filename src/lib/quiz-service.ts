import "server-only";
import { validateNickname } from "./nickname";
import {
  drawQuestions,
  getQuestionsByIds,
  NotEnoughQuestionsError,
  toPublicQuestion,
} from "./questions";
import {
  type ApiErrorCode,
  type LeaderboardEntry,
  type Locale,
  type PublishResponse,
  type QuizResult,
  type StartQuizResponse,
  LeaderboardQuerySchema,
  PublishBodySchema,
  StartQuizBodySchema,
  SubmitQuizBodySchema,
} from "./schemas";
import {
  answersMatchRound,
  canPublish,
  gradeRound,
  SESSION_TTL_MS,
} from "./scoring";
import {
  createSessionToken,
  RATE_LIMITS,
  sha256,
  tokenMatches,
  type RateLimitedAction,
} from "./security";
import type { LeaderboardRow, QuizStore, SessionRecord } from "./store/types";

export type ServiceResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: ApiErrorCode; message: string };

export type ServiceContext = {
  store: QuizStore;
  /** Salted hash of the client IP (null when unknown). */
  ipHash: string | null;
  now?: () => Date;
};

const ok = <T>(data: T, status = 200): ServiceResult<T> => ({
  ok: true,
  status,
  data,
});

const err = (
  status: number,
  code: ApiErrorCode,
  message: string,
): ServiceResult<never> => ({ ok: false, status, code, message });

async function rateLimited(ctx: ServiceContext, action: RateLimitedAction) {
  if (!ctx.ipHash) return false;
  const { limit, windowMs } = RATE_LIMITS[action];
  const allowed = await ctx.store.hitRateLimit(
    `${action}:${ctx.ipHash}`,
    limit,
    windowMs,
  );
  return !allowed;
}

function buildResult(session: SessionRecord, locale: Locale): QuizResult {
  const questions = getQuestionsByIds(session.questionIds);
  const { review } = gradeRound(
    session.level,
    questions,
    session.answers ?? {},
    locale,
  );
  const durationMs = session.durationMs ?? 0;
  return {
    sessionId: session.id,
    level: session.level,
    score: session.score ?? 0,
    correctCount: session.correctCount ?? 0,
    total: questions.length,
    durationMs,
    canPublish: canPublish(durationMs) && !session.published,
    published: session.published,
    review,
  };
}

function toEntry(row: LeaderboardRow, rank: number): LeaderboardEntry {
  return { rank, ...row };
}

// ---------------------------------------------------------------------------

export async function startQuiz(
  body: unknown,
  ctx: ServiceContext,
): Promise<ServiceResult<StartQuizResponse>> {
  const parsed = StartQuizBodySchema.safeParse(body);
  if (!parsed.success)
    return err(400, "validation", "Invalid level or locale.");
  if (await rateLimited(ctx, "start"))
    return err(429, "rate_limited", "Too many requests.");

  const { level, locale, exclude } = parsed.data;
  let questions;
  try {
    questions = drawQuestions(level, { exclude });
  } catch (e) {
    if (e instanceof NotEnoughQuestionsError)
      return err(503, "server_error", e.message);
    throw e;
  }

  const token = createSessionToken();
  const now = ctx.now?.() ?? new Date();
  const session = await ctx.store.createSession({
    level,
    locale,
    questionIds: questions.map((q) => q.id),
    tokenHash: sha256(token),
    ipHash: ctx.ipHash,
    startedAt: now.toISOString(),
  });

  return ok(
    {
      sessionId: session.id,
      token,
      level,
      locale,
      questions: questions.map((q) => toPublicQuestion(q, locale)),
    },
    201,
  );
}

export async function submitQuiz(
  body: unknown,
  ctx: ServiceContext,
): Promise<ServiceResult<QuizResult>> {
  const parsed = SubmitQuizBodySchema.safeParse(body);
  if (!parsed.success) return err(400, "validation", "Invalid submission.");
  if (await rateLimited(ctx, "submit"))
    return err(429, "rate_limited", "Too many requests.");

  const { sessionId, token, answers } = parsed.data;
  const session = await ctx.store.getSession(sessionId);
  if (!session || !tokenMatches(token, session.tokenHash))
    return err(404, "not_found", "Quiz session not found.");
  if (session.finishedAt)
    return err(409, "already_submitted", "This round was already submitted.");

  const now = ctx.now?.() ?? new Date();
  const durationMs = Math.max(
    0,
    now.getTime() - new Date(session.startedAt).getTime(),
  );
  if (durationMs > SESSION_TTL_MS)
    return err(410, "expired", "This round has expired.");

  if (!answersMatchRound(session.questionIds, answers))
    return err(
      400,
      "validation",
      "Answers must cover exactly the round's questions.",
    );

  const questions = getQuestionsByIds(session.questionIds);
  const { correctCount, score } = gradeRound(
    session.level,
    questions,
    answers,
    session.locale,
  );

  const finished = await ctx.store.finishSession(session.id, {
    answers,
    correctCount,
    score,
    durationMs,
    finishedAt: now.toISOString(),
  });
  // Lost a race against a concurrent submit of the same session.
  if (!finished)
    return err(409, "already_submitted", "This round was already submitted.");

  return ok(buildResult(finished, session.locale));
}

export async function getResult(
  sessionId: string,
  localeParam: string | null,
  ctx: ServiceContext,
): Promise<ServiceResult<QuizResult>> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId))
    return err(404, "not_found", "Result not found.");
  const session = await ctx.store.getSession(sessionId);
  if (!session) return err(404, "not_found", "Result not found.");
  if (!session.finishedAt)
    return err(409, "not_finished", "This round is still in progress.");

  const locale: Locale =
    localeParam === "pt" || localeParam === "en" ? localeParam : session.locale;
  return ok(buildResult(session, locale));
}

export async function publishResult(
  body: unknown,
  ctx: ServiceContext,
): Promise<ServiceResult<PublishResponse>> {
  const parsed = PublishBodySchema.safeParse(body);
  if (!parsed.success) return err(400, "validation", "Invalid request.");
  if (await rateLimited(ctx, "publish"))
    return err(429, "rate_limited", "Too many requests.");

  const { sessionId, token, nickname } = parsed.data;
  const session = await ctx.store.getSession(sessionId);
  if (!session || !tokenMatches(token, session.tokenHash))
    return err(404, "not_found", "Quiz session not found.");
  if (!session.finishedAt)
    return err(409, "not_finished", "Finish the round before publishing.");
  if (session.published)
    return err(
      409,
      "already_published",
      "This round is already on the leaderboard.",
    );
  if (!canPublish(session.durationMs ?? 0))
    return err(403, "too_fast", "This round was too fast to be ranked.");

  const name = validateNickname(nickname);
  if (!name.ok) return err(422, "invalid_nickname", name.error);

  const now = ctx.now?.() ?? new Date();
  const row = await ctx.store.publishEntry({
    sessionId,
    nickname: name.value,
    level: session.level,
    score: session.score ?? 0,
    correctCount: session.correctCount ?? 0,
    durationMs: session.durationMs ?? 0,
    createdAt: now.toISOString(),
  });
  if (!row)
    return err(
      409,
      "already_published",
      "This round is already on the leaderboard.",
    );

  const { rank, total } = await ctx.store.getRank(row);
  return ok({ rank, total, entry: toEntry(row, rank) }, 201);
}

export async function listLeaderboard(
  query: Record<string, string | undefined>,
  ctx: ServiceContext,
): Promise<ServiceResult<{ entries: LeaderboardEntry[]; total: number }>> {
  const parsed = LeaderboardQuerySchema.safeParse(query);
  if (!parsed.success) return err(400, "validation", "Invalid pagination.");
  const { limit, offset } = parsed.data;
  const { entries, total } = await ctx.store.listLeaderboard({ limit, offset });
  return ok({
    entries: entries.map((row, i) => toEntry(row, offset + i + 1)),
    total,
  });
}
