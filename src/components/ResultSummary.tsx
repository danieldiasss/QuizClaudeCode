import { getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/format";
import type { QuizResult } from "@/lib/schemas";
import { maxScore, performanceBand } from "@/lib/scoring";

export async function ResultSummary({ result }: { result: QuizResult }) {
  const t = await getTranslations("Result");
  const tl = await getTranslations("Levels");
  const band = performanceBand(result.correctCount, result.total);

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">
        {t("level", { level: tl(result.level) })}
      </p>
      <p className="text-5xl font-semibold tracking-tight text-accent">
        {t("points", { score: result.score })}
        <span className="sr-only">
          {" "}
          / {maxScore(result.level, result.total)}
        </span>
      </p>
      <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-muted">
        <span>
          {t("correct", { correct: result.correctCount, total: result.total })}
        </span>
        <span aria-hidden="true">·</span>
        <span>{t("time", { time: formatDuration(result.durationMs) })}</span>
      </p>
      <p className="max-w-md text-pretty">{t(`band_${band}`)}</p>
    </section>
  );
}
