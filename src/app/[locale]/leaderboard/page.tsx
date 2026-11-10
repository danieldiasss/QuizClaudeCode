import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Link } from "@/i18n/navigation";
import { listLeaderboard } from "@/lib/quiz-service";
import { getStore } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Leaderboard");
  return { title: t("title") };
}

export default async function LeaderboardPage() {
  const t = await getTranslations("Leaderboard");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" />
        }
      >
        <LeaderboardData />
      </Suspense>
    </div>
  );
}

async function LeaderboardData() {
  // The store may be in-memory (synchronous): force request-time rendering so the
  // build never freezes an empty leaderboard into the static shell.
  await connection();
  const t = await getTranslations("Leaderboard");
  const res = await listLeaderboard({}, { store: getStore(), ipHash: null });
  const { entries, total } = res.ok ? res.data : { entries: [], total: 0 };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-10 text-center">
        <p>{t("empty")}</p>
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
        >
          {t("play")}
        </Link>
      </div>
    );
  }
  return <LeaderboardTable initial={entries} total={total} />;
}
