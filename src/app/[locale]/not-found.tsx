import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-6xl font-semibold text-accent">404</p>
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Link
        href="/"
        className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
