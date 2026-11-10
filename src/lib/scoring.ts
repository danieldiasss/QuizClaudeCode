import type { Level, Locale, Question, ReviewItem } from "./schemas";

export const POINTS_PER_CORRECT: Record<Level, number> = {
  beginner: 10,
  intermediate: 20,
  advanced: 30,
};

/** Rounds faster than this are scored but kept off the leaderboard (anti-bot). */
export const MIN_PUBLISH_DURATION_MS = 10_000;

/** Unfinished sessions can't be submitted after this. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export function maxScore(level: Level, total = 10) {
  return POINTS_PER_CORRECT[level] * total;
}

/** True when `answers` has exactly the round's ids, each with a boolean. */
export function answersMatchRound(
  questionIds: readonly string[],
  answers: Record<string, unknown>,
): answers is Record<string, boolean> {
  const keys = Object.keys(answers);
  return (
    keys.length === questionIds.length &&
    questionIds.every((id) => typeof answers[id] === "boolean")
  );
}

export function gradeRound(
  level: Level,
  questions: readonly Question[],
  answers: Record<string, boolean>,
  locale: Locale,
) {
  const review: ReviewItem[] = questions.map((q) => {
    const userAnswer = answers[q.id];
    return {
      id: q.id,
      statement: q.statement[locale],
      userAnswer,
      correctAnswer: q.answer,
      isCorrect: userAnswer === q.answer,
      explanation: q.explanation[locale],
      sourceUrl: q.sourceUrl,
    };
  });
  const correctCount = review.filter((r) => r.isCorrect).length;
  return {
    correctCount,
    score: correctCount * POINTS_PER_CORRECT[level],
    review,
  };
}

export function canPublish(durationMs: number) {
  return durationMs >= MIN_PUBLISH_DURATION_MS;
}

type Rankable = { score: number; durationMs: number; createdAt: string };

/** Leaderboard order: score desc, then duration asc, then earliest first. */
export function compareEntries(a: Rankable, b: Rankable) {
  return (
    b.score - a.score ||
    a.durationMs - b.durationMs ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

export type PerformanceBand = "low" | "mid" | "high" | "perfect";

export function performanceBand(correct: number, total = 10): PerformanceBand {
  if (correct >= total) return "perfect";
  if (correct >= 8) return "high";
  if (correct >= 5) return "mid";
  return "low";
}
