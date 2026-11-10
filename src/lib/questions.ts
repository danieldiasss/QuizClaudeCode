import "server-only";
import raw from "@/content/questions.json";
import {
  QuestionBankSchema,
  QUESTIONS_PER_ROUND,
  type Level,
  type Locale,
  type PublicQuestion,
  type Question,
} from "./schemas";

// Parsed once at module load: a malformed bank fails fast instead of mid-round.
const ALL_QUESTIONS: readonly Question[] = QuestionBankSchema.parse(raw);

export type Rng = () => number;

/**
 * Production serves only human-reviewed questions, unless explicitly overridden
 * (QUIZ_INCLUDE_UNREVIEWED=true) — e.g. to launch before the review is done.
 */
export function includeUnreviewed(env: NodeJS.ProcessEnv = process.env) {
  if (env.QUIZ_INCLUDE_UNREVIEWED === "true") return true;
  if (env.QUIZ_INCLUDE_UNREVIEWED === "false") return false;
  return env.NODE_ENV !== "production";
}

export function getQuestionPool(
  level: Level,
  bank: readonly Question[] = ALL_QUESTIONS,
  allowUnreviewed = includeUnreviewed(),
): Question[] {
  return bank.filter(
    (q) => q.level === level && (allowUnreviewed || q.reviewed),
  );
}

/** Unbiased Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class NotEnoughQuestionsError extends Error {
  constructor(level: Level, available: number) {
    super(
      `Level "${level}" has ${available} playable questions; ${QUESTIONS_PER_ROUND} are required.`,
    );
    this.name = "NotEnoughQuestionsError";
  }
}

/**
 * Draws `n` distinct random questions of a level. Questions in `exclude`
 * (e.g. the previous round) are avoided when the pool is large enough,
 * then used to top up if needed.
 */
export function drawQuestions(
  level: Level,
  {
    n = QUESTIONS_PER_ROUND,
    exclude = [],
    rng = Math.random,
    pool = getQuestionPool(level),
  }: {
    n?: number;
    exclude?: readonly string[];
    rng?: Rng;
    pool?: readonly Question[];
  } = {},
): Question[] {
  if (pool.length < n) throw new NotEnoughQuestionsError(level, pool.length);

  const excluded = new Set(exclude);
  const fresh = shuffle(
    pool.filter((q) => !excluded.has(q.id)),
    rng,
  );
  const reused = shuffle(
    pool.filter((q) => excluded.has(q.id)),
    rng,
  );
  return [...fresh, ...reused].slice(0, n);
}

export function getQuestionsByIds(
  ids: readonly string[],
  bank: readonly Question[] = ALL_QUESTIONS,
): Question[] {
  const byId = new Map(bank.map((q) => [q.id, q]));
  return ids.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Unknown question id: ${id}`);
    return q;
  });
}

/** Strips the answer key: the only shape that may be sent before submit. */
export function toPublicQuestion(q: Question, locale: Locale): PublicQuestion {
  return { id: q.id, statement: q.statement[locale] };
}
