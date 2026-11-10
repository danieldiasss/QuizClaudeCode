"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const LABELS: Record<AppLocale, string> = { pt: "PT", en: "EN" };

// Reads the pathname, so it must render inside <Suspense> (cacheComponents).
export function LocaleSwitcher({ label }: { label: string }) {
  const locale = useLocale();
  // Without `pathnames` config this is the real path minus the locale prefix,
  // e.g. "/quiz/advanced", so switching keeps the current page.
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-border p-0.5"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className="rounded-full px-3 py-1 text-xs font-medium transition-colors aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}

export function LocaleSwitcherFallback() {
  return (
    <div className="inline-flex h-8 w-[5.5rem] rounded-full border border-border" />
  );
}
