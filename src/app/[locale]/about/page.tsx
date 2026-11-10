import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("About");
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-pretty">{t("body1")}</p>
      <p className="text-pretty">{t("body2")}</p>
      <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        {t("disclaimer")}
      </p>
      <a
        href="https://code.claude.com/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent hover:underline"
      >
        {t("docsLink")} ↗
      </a>
    </article>
  );
}
