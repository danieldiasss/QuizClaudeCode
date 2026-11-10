import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Level } from "@/lib/schemas";
import { maxScore, POINTS_PER_CORRECT } from "@/lib/scoring";

const ACCENT_DOTS: Record<Level, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export async function LevelCard({ level }: { level: Level }) {
  const t = await getTranslations("Home");
  const tl = await getTranslations("Levels");

  return (
    <Link
      href={`/quiz/${level}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{tl(level)}</h3>
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`size-2 rounded-full ${i <= ACCENT_DOTS[level] ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </span>
      </div>
      <p className="flex-1 text-sm text-muted">{t(`${level}Description`)}</p>
      <div className="flex items-end justify-between gap-2 text-sm">
        <span className="text-muted">
          {t("pointsPerCorrect", { points: POINTS_PER_CORRECT[level] })}
          <br />
          {t("maxScore", { max: maxScore(level) })}
        </span>
        <span className="shrink-0 rounded-full bg-accent px-4 py-2 font-medium whitespace-nowrap text-accent-foreground transition group-hover:bg-accent-hover">
          {t("play")} →
        </span>
      </div>
    </Link>
  );
}
