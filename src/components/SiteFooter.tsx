import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-border">
      <p className="mx-auto w-full max-w-3xl px-4 py-6 text-center text-xs text-muted sm:px-6">
        {t("disclaimer")}
      </p>
    </footer>
  );
}
