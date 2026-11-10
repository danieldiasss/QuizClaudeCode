import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher, LocaleSwitcherFallback } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader() {
  const t = await getTranslations("Header");

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          {t("brand")}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/leaderboard"
            className="text-muted hover:text-foreground"
          >
            {t("leaderboard")}
          </Link>
          <Link
            href="/about"
            className="hidden text-muted hover:text-foreground sm:inline"
          >
            {t("about")}
          </Link>
          <Suspense fallback={<LocaleSwitcherFallback />}>
            <LocaleSwitcher label={t("language")} />
          </Suspense>
          <ThemeToggle label={t("toggleTheme")} />
        </nav>
      </div>
    </header>
  );
}
