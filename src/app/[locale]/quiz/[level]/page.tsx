import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { QuizRunner } from "@/components/QuizRunner";
import { LEVELS, LevelSchema, type Locale } from "@/lib/schemas";

export function generateStaticParams() {
  return LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/quiz/[level]">): Promise<Metadata> {
  const { level } = await params;
  const parsed = LevelSchema.safeParse(level);
  if (!parsed.success) return {};
  const t = await getTranslations("Levels");
  return { title: t(parsed.data) };
}

export default async function QuizPage({
  params,
}: PageProps<"/[locale]/quiz/[level]">) {
  const { level } = await params;
  const parsed = LevelSchema.safeParse(level);
  if (!parsed.success) notFound();

  const locale = (await rootLocale()) as Locale;
  // key: switching language remounts the runner so it restores in the new locale.
  return <QuizRunner key={locale} level={parsed.data} locale={locale} />;
}
