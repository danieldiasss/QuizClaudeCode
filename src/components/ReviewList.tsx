import { getTranslations } from "next-intl/server";
import type { ReviewItem } from "@/lib/schemas";

export async function ReviewList({ items }: { items: ReviewItem[] }) {
  const t = await getTranslations("Result");
  const tq = await getTranslations("Quiz");
  const label = (v: boolean) => (v ? tq("true") : tq("false"));

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-4">
      <h2 id="review-heading" className="text-lg font-semibold">
        {t("reviewTitle")}
      </h2>
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`flex flex-col gap-2 rounded-2xl border-l-4 bg-surface p-5 shadow-sm ${
              item.isCorrect ? "border-l-success" : "border-l-danger"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  item.isCorrect
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-danger"
                }`}
              >
                <span aria-hidden="true">{item.isCorrect ? "✓" : "✗"}</span>
                <span className="sr-only">
                  {item.isCorrect ? t("correctLabel") : t("wrongLabel")}
                </span>
              </span>
              <p className="font-medium text-pretty">
                <span className="text-muted">{i + 1}. </span>
                {item.statement}
              </p>
            </div>
            <p className="pl-9 text-sm text-muted">
              {t("yourAnswer", { answer: label(item.userAnswer) })}
              {" · "}
              <strong className="font-semibold text-foreground">
                {t("correctAnswer", { answer: label(item.correctAnswer) })}
              </strong>
            </p>
            <p className="pl-9 text-sm text-pretty">{item.explanation}</p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pl-9 text-sm font-medium text-accent hover:underline"
            >
              {t("learnMore")} ↗
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
