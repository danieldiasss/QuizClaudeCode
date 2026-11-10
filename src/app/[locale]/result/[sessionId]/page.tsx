import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { PublishPanel } from "@/components/PublishPanel";
import { ResultSummary } from "@/components/ResultSummary";
import { ReviewList } from "@/components/ReviewList";
import { ShareButtons } from "@/components/ShareButtons";
import { Link } from "@/i18n/navigation";
import { getResult } from "@/lib/quiz-service";
import type { Locale } from "@/lib/schemas";
import { getStore } from "@/lib/store";

type Props = PageProps<"/[locale]/result/[sessionId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ sessionId }, locale] = await Promise.all([params, rootLocale()]);
  const t = await getTranslations("Result");
  const image = `/api/og/result/${sessionId}?locale=${locale}`;
  return {
    title: t("title"),
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function ResultPage({ params }: Props) {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      <ResultView params={params} />
    </Suspense>
  );
}

async function ResultView({ params }: Pick<Props, "params">) {
  const { sessionId } = await params;
  const locale = (await rootLocale()) as Locale;
  const t = await getTranslations("Result");
  const tl = await getTranslations("Levels");
  const ts = await getTranslations("Share");

  const res = await getResult(sessionId, locale, {
    store: getStore(),
    ipHash: null,
  });

  if (!res.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
        <p>{res.code === "not_finished" ? t("notFinished") : t("notFound")}</p>
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
        >
          {t("otherLevel")}
        </Link>
      </div>
    );
  }

  const result = res.data;
  const shareText = ts("text", {
    score: result.score,
    correct: result.correctCount,
    level: tl(result.level),
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">{t("title")}</h1>
      <ResultSummary result={result} />

      <PublishPanel
        sessionId={result.sessionId}
        canPublish={result.canPublish}
        published={result.published}
      />

      <ShareButtons
        text={shareText}
        path={`/${locale}/result/${result.sessionId}`}
      />

      <nav className="flex flex-wrap gap-3">
        <Link
          href={`/quiz/${result.level}`}
          className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
        >
          {t("playAgain")}
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2 font-medium hover:bg-surface-muted"
        >
          {t("otherLevel")}
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-full border border-border px-5 py-2 font-medium hover:bg-surface-muted"
        >
          {t("seeLeaderboard")}
        </Link>
      </nav>

      <ReviewList items={result.review} />
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}
