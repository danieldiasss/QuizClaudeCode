import { beforeEach, describe, expect, it } from "vitest";
import {
  getResult,
  listLeaderboard,
  publishResult,
  startQuiz,
  submitQuiz,
  type ServiceContext,
  type ServiceResult,
} from "@/lib/quiz-service";
import { getQuestionsByIds } from "@/lib/questions";
import type { Level, StartQuizResponse } from "@/lib/schemas";
import { memoryStore, resetMemoryStore } from "@/lib/store/memory-store";

const T0 = new Date("2026-11-10T12:00:00Z");
const at = (ms: number) => () => new Date(T0.getTime() + ms);

function ctx(nowMs = 0, ipHash: string | null = "ip-a"): ServiceContext {
  return { store: memoryStore, ipHash, now: at(nowMs) };
}

function unwrap<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.status} ${r.code}`);
  return r.data;
}

async function start(level: Level = "beginner", c = ctx()) {
  return unwrap(await startQuiz({ level, locale: "pt" }, c));
}

function answersFor(round: StartQuizResponse, correct: number) {
  const questions = getQuestionsByIds(round.questions.map((q) => q.id));
  return Object.fromEntries(
    questions.map((q, i) => [q.id, i < correct ? q.answer : !q.answer]),
  );
}

async function playRound({
  level = "beginner" as Level,
  correct = 7,
  durationMs = 60_000,
} = {}) {
  const round = await start(level);
  const result = unwrap(
    await submitQuiz(
      {
        sessionId: round.sessionId,
        token: round.token,
        answers: answersFor(round, correct),
      },
      ctx(durationMs),
    ),
  );
  return { round, result };
}

beforeEach(() => resetMemoryStore());

describe("POST /api/quiz/start", () => {
  it("returns 10 questions WITHOUT answer or explanation", async () => {
    const r = await startQuiz({ level: "advanced", locale: "en" }, ctx());
    expect(r.status).toBe(201);
    const data = unwrap(r);
    expect(data.questions).toHaveLength(10);
    for (const q of data.questions) {
      expect(Object.keys(q).sort()).toEqual(["id", "statement"]);
      expect(q.id).toMatch(/^adv-/);
    }
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/"answer"|"explanation"|"correctAnswer"/);
  });

  it("returns statements in the requested locale", async () => {
    const data = unwrap(
      await startQuiz({ level: "beginner", locale: "en" }, ctx()),
    );
    const [first] = getQuestionsByIds([data.questions[0].id]);
    expect(data.questions[0].statement).toBe(first.statement.en);
  });

  it("rejects an invalid level or locale with 400", async () => {
    expect(
      (await startQuiz({ level: "expert", locale: "pt" }, ctx())).status,
    ).toBe(400);
    expect(
      (await startQuiz({ level: "beginner", locale: "fr" }, ctx())).status,
    ).toBe(400);
    expect((await startQuiz(undefined, ctx())).status).toBe(400);
  });

  it("avoids the previous round's questions", async () => {
    const first = await start();
    const second = unwrap(
      await startQuiz(
        {
          level: "beginner",
          locale: "pt",
          exclude: first.questions.map((q) => q.id),
        },
        ctx(),
      ),
    );
    const firstIds = new Set(first.questions.map((q) => q.id));
    expect(second.questions.some((q) => firstIds.has(q.id))).toBe(false);
  });

  it("rate limits after 30 starts from the same IP", async () => {
    for (let i = 0; i < 30; i++) await start();
    const r = await startQuiz({ level: "beginner", locale: "pt" }, ctx());
    expect(r).toMatchObject({ status: 429, code: "rate_limited" });
    // another IP is unaffected
    expect(
      (await startQuiz({ level: "beginner", locale: "pt" }, ctx(0, "ip-b")))
        .status,
    ).toBe(201);
  });
});

describe("POST /api/quiz/submit", () => {
  it("scores on the server with level weights and measures duration", async () => {
    const { result } = await playRound({
      level: "intermediate",
      correct: 8,
      durationMs: 45_000,
    });
    expect(result).toMatchObject({
      level: "intermediate",
      correctCount: 8,
      score: 160,
      total: 10,
      durationMs: 45_000,
      canPublish: true,
      published: false,
    });
    expect(result.review).toHaveLength(10);
    expect(result.review[0]).toHaveProperty("explanation");
    expect(result.review[0]).toHaveProperty("sourceUrl");
  });

  it("ignores any score or duration sent by the client", async () => {
    const round = await start("advanced");
    const result = unwrap(
      await submitQuiz(
        {
          sessionId: round.sessionId,
          token: round.token,
          answers: answersFor(round, 0),
          score: 300,
          durationMs: 1,
        },
        ctx(20_000),
      ),
    );
    expect(result.score).toBe(0);
    expect(result.durationMs).toBe(20_000);
  });

  it("returns 409 on a second submit", async () => {
    const round = await start();
    const body = {
      sessionId: round.sessionId,
      token: round.token,
      answers: answersFor(round, 5),
    };
    expect((await submitQuiz(body, ctx(30_000))).status).toBe(200);
    expect(await submitQuiz(body, ctx(31_000))).toMatchObject({
      status: 409,
      code: "already_submitted",
    });
  });

  it("returns 400 when answers are incomplete or have extra ids", async () => {
    const round = await start();
    const answers = answersFor(round, 5);
    const [firstId] = Object.keys(answers);
    const incomplete = { ...answers };
    delete incomplete[firstId];

    const base = { sessionId: round.sessionId, token: round.token };
    expect(
      (await submitQuiz({ ...base, answers: incomplete }, ctx(30_000))).status,
    ).toBe(400);
    expect(
      (
        await submitQuiz(
          { ...base, answers: { ...answers, "beg-999": true } },
          ctx(30_000),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await submitQuiz(
          { ...base, answers: { ...incomplete, "beg-999": true } },
          ctx(30_000),
        )
      ).status,
    ).toBe(400);
  });

  it("returns 404 for a wrong token (someone else's shared link)", async () => {
    const round = await start();
    const r = await submitQuiz(
      {
        sessionId: round.sessionId,
        token: "x".repeat(43),
        answers: answersFor(round, 10),
      },
      ctx(30_000),
    );
    expect(r).toMatchObject({ status: 404, code: "not_found" });
  });

  it("returns 410 after the 2h session TTL", async () => {
    const round = await start();
    const r = await submitQuiz(
      {
        sessionId: round.sessionId,
        token: round.token,
        answers: answersFor(round, 5),
      },
      ctx(2 * 60 * 60 * 1000 + 1),
    );
    expect(r).toMatchObject({ status: 410, code: "expired" });
  });

  it("flags rounds under 10s as not publishable", async () => {
    const { result } = await playRound({ durationMs: 9_000 });
    expect(result.canPublish).toBe(false);
  });
});

describe("GET /api/quiz/result/[sessionId]", () => {
  it("returns the finished result, localized on demand", async () => {
    const { round, result } = await playRound();
    const en = unwrap(await getResult(round.sessionId, "en", ctx()));
    expect(en.score).toBe(result.score);
    const [q] = getQuestionsByIds([en.review[0].id]);
    expect(en.review[0].statement).toBe(q.statement.en);
  });

  it("returns 409 while the round is in progress and 404 for unknown ids", async () => {
    const round = await start();
    expect((await getResult(round.sessionId, null, ctx())).status).toBe(409);
    expect(
      (await getResult("00000000-0000-4000-8000-000000000000", null, ctx()))
        .status,
    ).toBe(404);
    expect((await getResult("not-a-uuid", null, ctx())).status).toBe(404);
  });
});

describe("POST /api/leaderboard", () => {
  it("publishes once and returns the rank", async () => {
    const { round } = await playRound({ correct: 6 });
    const r = await publishResult(
      { sessionId: round.sessionId, token: round.token, nickname: "  Ana  " },
      ctx(70_000),
    );
    expect(r.status).toBe(201);
    expect(unwrap(r)).toMatchObject({
      rank: 1,
      total: 1,
      entry: { nickname: "Ana", score: 60 },
    });

    const again = await publishResult(
      { sessionId: round.sessionId, token: round.token, nickname: "Ana" },
      ctx(71_000),
    );
    expect(again).toMatchObject({ status: 409, code: "already_published" });
  });

  it("returns 409 when the round isn't finished", async () => {
    const round = await start();
    const r = await publishResult(
      { sessionId: round.sessionId, token: round.token, nickname: "Ana" },
      ctx(30_000),
    );
    expect(r).toMatchObject({ status: 409, code: "not_finished" });
  });

  it("refuses rounds faster than 10s", async () => {
    const { round } = await playRound({ durationMs: 5_000 });
    const r = await publishResult(
      { sessionId: round.sessionId, token: round.token, nickname: "Bot" },
      ctx(6_000),
    );
    expect(r).toMatchObject({ status: 403, code: "too_fast" });
  });

  it("rejects improper nicknames with 422", async () => {
    const { round } = await playRound();
    const r = await publishResult(
      { sessionId: round.sessionId, token: round.token, nickname: "f.u.c.k" },
      ctx(70_000),
    );
    expect(r).toMatchObject({
      status: 422,
      code: "invalid_nickname",
      message: "blocked",
    });
  });

  it("requires the round's token", async () => {
    const { round } = await playRound();
    const r = await publishResult(
      { sessionId: round.sessionId, token: "y".repeat(43), nickname: "Thief" },
      ctx(70_000),
    );
    expect(r.status).toBe(404);
  });
});

describe("GET /api/leaderboard", () => {
  it("orders by score desc, then faster time", async () => {
    const plays = [
      {
        name: "Beginner10",
        level: "beginner" as Level,
        correct: 10,
        durationMs: 20_000,
      }, // 100
      {
        name: "AdvSlow",
        level: "advanced" as Level,
        correct: 5,
        durationMs: 90_000,
      }, // 150
      {
        name: "AdvFast",
        level: "advanced" as Level,
        correct: 5,
        durationMs: 40_000,
      }, // 150
      {
        name: "Inter9",
        level: "intermediate" as Level,
        correct: 9,
        durationMs: 60_000,
      }, // 180
    ];
    for (const p of plays) {
      const { round } = await playRound(p);
      unwrap(
        await publishResult(
          { sessionId: round.sessionId, token: round.token, nickname: p.name },
          ctx(p.durationMs + 1_000),
        ),
      );
    }

    const { entries, total } = unwrap(await listLeaderboard({}, ctx()));
    expect(total).toBe(4);
    expect(entries.map((e) => [e.rank, e.nickname, e.score])).toEqual([
      [1, "Inter9", 180],
      [2, "AdvFast", 150],
      [3, "AdvSlow", 150],
      [4, "Beginner10", 100],
    ]);

    const page2 = unwrap(
      await listLeaderboard({ limit: "2", offset: "2" }, ctx()),
    );
    expect(page2.entries.map((e) => e.rank)).toEqual([3, 4]);
  });

  it("rejects invalid pagination", async () => {
    expect((await listLeaderboard({ limit: "1000" }, ctx())).status).toBe(400);
    expect((await listLeaderboard({ offset: "-1" }, ctx())).status).toBe(400);
  });
});
