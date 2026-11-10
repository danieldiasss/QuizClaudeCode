import { describe, expect, it } from "vitest";
import {
  drawQuestions,
  getQuestionPool,
  getQuestionsByIds,
  includeUnreviewed,
  NotEnoughQuestionsError,
  shuffle,
  toPublicQuestion,
} from "@/lib/questions";
import { LEVELS, type Question } from "@/lib/schemas";

function seededRng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

function makeBank(perLevel: number, reviewed = true): Question[] {
  const prefix = {
    beginner: "beg",
    intermediate: "int",
    advanced: "adv",
  } as const;
  return LEVELS.flatMap((level) =>
    Array.from({ length: perLevel }, (_, i) => ({
      id: `${prefix[level]}-${String(i + 1).padStart(3, "0")}`,
      level,
      topic: "business" as const,
      answer: i % 2 === 0,
      statement: { pt: `pt ${level} ${i}`, en: `en ${level} ${i}` },
      explanation: { pt: "x", en: "x" },
      sourceUrl: "https://code.claude.com/docs/en/overview",
      reviewed: reviewed || i < 5,
    })),
  );
}

describe("includeUnreviewed", () => {
  it("defaults to unreviewed in dev and reviewed-only in production", () => {
    expect(
      includeUnreviewed({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      includeUnreviewed({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
  it("can be overridden with QUIZ_INCLUDE_UNREVIEWED", () => {
    expect(
      includeUnreviewed({
        NODE_ENV: "production",
        QUIZ_INCLUDE_UNREVIEWED: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      includeUnreviewed({
        NODE_ENV: "development",
        QUIZ_INCLUDE_UNREVIEWED: "false",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

describe("getQuestionPool", () => {
  const bank = makeBank(20, false); // only the first 5 per level are reviewed

  it("returns only the requested level", () => {
    const pool = getQuestionPool("advanced", bank, true);
    expect(pool).toHaveLength(20);
    expect(pool.every((q) => q.level === "advanced")).toBe(true);
  });

  it("filters out unreviewed questions when required", () => {
    const pool = getQuestionPool("beginner", bank, false);
    expect(pool).toHaveLength(5);
    expect(pool.every((q) => q.reviewed)).toBe(true);
  });
});

describe("drawQuestions", () => {
  const pool = getQuestionPool("intermediate", makeBank(20), true);

  it("draws 10 distinct questions of the same level", () => {
    const drawn = drawQuestions("intermediate", { pool, rng: seededRng() });
    expect(drawn).toHaveLength(10);
    expect(new Set(drawn.map((q) => q.id)).size).toBe(10);
    expect(drawn.every((q) => q.level === "intermediate")).toBe(true);
  });

  it("varies between draws", () => {
    const a = drawQuestions("intermediate", { pool, rng: seededRng(1) }).map(
      (q) => q.id,
    );
    const b = drawQuestions("intermediate", { pool, rng: seededRng(2) }).map(
      (q) => q.id,
    );
    expect(a).not.toEqual(b);
  });

  it("avoids excluded ids when the pool is large enough", () => {
    const previous = drawQuestions("intermediate", {
      pool,
      rng: seededRng(3),
    }).map((q) => q.id);
    const next = drawQuestions("intermediate", {
      pool,
      exclude: previous,
      rng: seededRng(4),
    });
    expect(next.some((q) => previous.includes(q.id))).toBe(false);
  });

  it("tops up with excluded ids when the pool is small", () => {
    const small = pool.slice(0, 12);
    const exclude = small.slice(0, 8).map((q) => q.id);
    const drawn = drawQuestions("intermediate", {
      pool: small,
      exclude,
      rng: seededRng(),
    });
    expect(drawn).toHaveLength(10);
    // the 4 fresh ones come first
    expect(drawn.slice(0, 4).every((q) => !exclude.includes(q.id))).toBe(true);
  });

  it("throws when there aren't enough playable questions", () => {
    expect(() =>
      drawQuestions("intermediate", { pool: pool.slice(0, 9) }),
    ).toThrow(NotEnoughQuestionsError);
  });
});

describe("shuffle", () => {
  it("keeps all items and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRng());
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("real bank", () => {
  it("has a full round available for every level in development", () => {
    for (const level of LEVELS) {
      expect(
        getQuestionPool(level, undefined, true).length,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("looks up questions by id preserving order", () => {
    const qs = getQuestionsByIds(["adv-002", "beg-001"]);
    expect(qs.map((q) => q.id)).toEqual(["adv-002", "beg-001"]);
    expect(() => getQuestionsByIds(["nope-001"])).toThrow();
  });
});

describe("toPublicQuestion", () => {
  it("never exposes the answer or the explanation", () => {
    const [q] = getQuestionsByIds(["beg-001"]);
    const pub = toPublicQuestion(q, "en");
    expect(Object.keys(pub).sort()).toEqual(["id", "statement"]);
    expect(pub.statement).toBe(q.statement.en);
  });
});
