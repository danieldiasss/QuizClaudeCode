import { describe, expect, it } from "vitest";
import {
  answersMatchRound,
  canPublish,
  compareEntries,
  gradeRound,
  maxScore,
  performanceBand,
  POINTS_PER_CORRECT,
} from "@/lib/scoring";
import { LEVELS, type Question } from "@/lib/schemas";

function makeQuestions(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `beg-${String(i + 1).padStart(3, "0")}`,
    level: "beginner",
    topic: "business",
    answer: i % 2 === 0,
    statement: { pt: `Afirmação ${i}`, en: `Statement ${i}` },
    explanation: { pt: `Explicação ${i}`, en: `Explanation ${i}` },
    sourceUrl: "https://code.claude.com/docs/en/overview",
    reviewed: true,
  }));
}

function answersWithCorrect(questions: Question[], correct: number) {
  return Object.fromEntries(
    questions.map((q, i) => [q.id, i < correct ? q.answer : !q.answer]),
  );
}

describe("gradeRound", () => {
  const questions = makeQuestions(10);

  for (const level of LEVELS) {
    for (let correct = 0; correct <= 10; correct++) {
      it(`${level}: ${correct}/10 correct → ${correct * POINTS_PER_CORRECT[level]} pts`, () => {
        const result = gradeRound(
          level,
          questions,
          answersWithCorrect(questions, correct),
          "pt",
        );
        expect(result.correctCount).toBe(correct);
        expect(result.score).toBe(correct * POINTS_PER_CORRECT[level]);
      });
    }
  }

  it("uses weights 10/20/30 and max 100/200/300", () => {
    expect(POINTS_PER_CORRECT).toEqual({
      beginner: 10,
      intermediate: 20,
      advanced: 30,
    });
    expect(LEVELS.map((l) => maxScore(l))).toEqual([100, 200, 300]);
  });

  it("builds a localized review with the answer key", () => {
    const { review } = gradeRound(
      "beginner",
      questions,
      answersWithCorrect(questions, 1),
      "en",
    );
    expect(review[0]).toMatchObject({
      id: "beg-001",
      statement: "Statement 0",
      explanation: "Explanation 0",
      userAnswer: true,
      correctAnswer: true,
      isCorrect: true,
    });
    expect(review[1].isCorrect).toBe(false);
  });
});

describe("answersMatchRound", () => {
  const ids = ["a", "b", "c"];
  it("accepts exactly the round ids with booleans", () => {
    expect(answersMatchRound(ids, { a: true, b: false, c: true })).toBe(true);
  });
  it("rejects missing, extra or non-boolean answers", () => {
    expect(answersMatchRound(ids, { a: true, b: false })).toBe(false);
    expect(
      answersMatchRound(ids, { a: true, b: false, c: true, d: true }),
    ).toBe(false);
    expect(answersMatchRound(ids, { a: true, b: false, x: true })).toBe(false);
    expect(answersMatchRound(ids, { a: true, b: false, c: "yes" })).toBe(false);
  });
});

describe("canPublish", () => {
  it("blocks rounds under 10 seconds", () => {
    expect(canPublish(9_999)).toBe(false);
    expect(canPublish(10_000)).toBe(true);
  });
});

describe("compareEntries", () => {
  it("orders by score desc, duration asc, createdAt asc", () => {
    const entries = [
      {
        id: "slow",
        score: 200,
        durationMs: 90_000,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "low",
        score: 100,
        durationMs: 10_000,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "fast-late",
        score: 200,
        durationMs: 30_000,
        createdAt: "2026-01-02T00:00:00Z",
      },
      {
        id: "fast-early",
        score: 200,
        durationMs: 30_000,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    expect(entries.sort(compareEntries).map((e) => e.id)).toEqual([
      "fast-early",
      "fast-late",
      "slow",
      "low",
    ]);
  });
});

describe("performanceBand", () => {
  it("maps 0–4, 5–7, 8–9 and 10", () => {
    expect([0, 4, 5, 7, 8, 9, 10].map((c) => performanceBand(c))).toEqual([
      "low",
      "low",
      "mid",
      "mid",
      "high",
      "high",
      "perfect",
    ]);
  });
});
