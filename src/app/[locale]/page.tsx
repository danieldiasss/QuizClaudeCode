import { getTranslations } from "next-intl/server";
import { LevelCard } from "@/components/LevelCard";
import { Link } from "@/i18n/navigation";
import { LEVELS } from "@/lib/schemas";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 pt-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-pretty text-muted">
          {t("subtitle")}
        </p>
      </section>

      <section aria-labelledby="levels-heading" className="flex flex-col gap-4">
        <h2
          id="levels-heading"
          className="text-sm font-medium tracking-wide text-muted uppercase"
        >
          {t("chooseLevel")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <LevelCard key={level} level={level} />
          ))}
        </div>
      </section>

      <p className="text-center">
        <Link
          href="/leaderboard"
          className="text-sm font-medium text-accent hover:underline"
        >
          {t("seeLeaderboard")} →
        </Link>
      </p>
    </div>
  );
}
