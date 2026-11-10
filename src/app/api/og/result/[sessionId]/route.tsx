import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getResult } from "@/lib/quiz-service";
import { getStore } from "@/lib/store";
import { maxScore } from "@/lib/scoring";

const COPY = {
  pt: {
    title: "Quiz V ou F · Claude Code",
    levels: {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    },
    correct: "acertos",
    cta: "Consegue me superar?",
    fallback: "Quanto você sabe sobre Claude Code?",
  },
  en: {
    title: "T/F Quiz · Claude Code",
    levels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
    correct: "correct",
    cta: "Can you beat me?",
    fallback: "How much do you know about Claude Code?",
  },
} as const;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/og/result/[sessionId]">,
) {
  const { sessionId } = await ctx.params;
  const locale =
    request.nextUrl.searchParams.get("locale") === "en" ? "en" : "pt";
  const c = COPY[locale];
  const res = await getResult(sessionId, locale, {
    store: getStore(),
    ipHash: null,
  }).catch(() => null);
  const result = res?.ok ? res.data : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#fafaf9",
        color: "#1c1917",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
        {c.title}
      </div>
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 32, color: "#57534e" }}>
            {c.levels[result.level]}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <span
              style={{
                fontSize: 160,
                fontWeight: 700,
                color: "#d97757",
                lineHeight: 1,
              }}
            >
              {result.score}
            </span>
            <span style={{ fontSize: 48, color: "#57534e" }}>
              / {maxScore(result.level, result.total)} pts
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 40 }}>
            {result.correctCount}/{result.total} {c.correct}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>
          {c.fallback}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "#d97757",
          fontWeight: 600,
        }}
      >
        {c.cta}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      // A finished result never changes, so it can be cached by crawlers/CDN.
      headers: result
        ? { "Cache-Control": "public, max-age=86400, immutable" }
        : undefined,
    },
  );
}
