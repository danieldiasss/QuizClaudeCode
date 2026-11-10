"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const noopSubscribe = () => () => {};

export function ShareButtons({ text, path }: { text: string; path: string }) {
  const t = useTranslations("Share");
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => process.env.NEXT_PUBLIC_SITE_URL ?? "",
  );
  const canShareNatively = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  const url = `${origin}${path}`;
  const full = `${text} ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  const btn =
    "inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-surface-muted";

  return (
    <section aria-labelledby="share-heading" className="flex flex-col gap-3">
      <h2 id="share-heading" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {canShareNatively && (
          <button
            type="button"
            className={btn}
            onClick={() => navigator.share({ text, url }).catch(() => {})}
          >
            {t("native")}
          </button>
        )}
        <a
          className={btn}
          target="_blank"
          rel="noopener noreferrer"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        >
          {t("linkedin")}
        </a>
        <a
          className={btn}
          target="_blank"
          rel="noopener noreferrer"
          href={`https://x.com/intent/post?text=${encodeURIComponent(full)}`}
        >
          {t("x")}
        </a>
        <button type="button" className={btn} onClick={copy}>
          {copied ? `✓ ${t("copied")}` : t("copy")}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? t("copied") : ""}
        </span>
      </div>
    </section>
  );
}
