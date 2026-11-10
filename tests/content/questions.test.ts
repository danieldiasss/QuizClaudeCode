import { describe, expect, it } from "vitest";
import raw from "@/content/questions.json";
import { LEVELS, QuestionBankSchema } from "@/lib/schemas";

const bank = QuestionBankSchema.parse(raw);

describe("question bank", () => {
  it("matches the schema (ids, levels, topics, both locales, https sources)", () => {
    expect(() => QuestionBankSchema.parse(raw)).not.toThrow();
  });

  it("has unique ids", () => {
    const ids = bank.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique statements", () => {
    const pt = bank.map((q) => q.statement.pt);
    const en = bank.map((q) => q.statement.en);
    expect(new Set(pt).size).toBe(pt.length);
    expect(new Set(en).size).toBe(en.length);
  });

  for (const level of LEVELS) {
    describe(level, () => {
      const questions = bank.filter((q) => q.level === level);

      it("has 20 questions", () => {
        expect(questions).toHaveLength(20);
      });

      it("keeps true/false balance between 35% and 65%", () => {
        const ratio =
          questions.filter((q) => q.answer).length / questions.length;
        expect(ratio).toBeGreaterThanOrEqual(0.35);
        expect(ratio).toBeLessThanOrEqual(0.65);
      });
    });
  }

  it("points every source to the official Claude Code docs", () => {
    for (const q of bank) {
      expect(q.sourceUrl).toMatch(/^https:\/\/(code|docs)\.claude\.com\//);
    }
  });
});
