"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api-client";
import { myEntry, roundToken } from "@/lib/client-storage";
import { NICKNAME_MAX, validateNickname } from "@/lib/nickname";
import type { PublishResponse } from "@/lib/schemas";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; rank: number; total: number }
  | { kind: "error"; message: string };

const noopSubscribe = () => () => {};

export function PublishPanel({
  sessionId,
  canPublish,
  published,
}: {
  sessionId: string;
  canPublish: boolean;
  published: boolean;
}) {
  const t = useTranslations("Publish");
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // The token lives in localStorage, so it's only known after hydration.
  const token = useSyncExternalStore(
    noopSubscribe,
    () => roundToken.get(sessionId),
    () => undefined,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const local = validateNickname(nickname);
    if (!local.ok) {
      setStatus({ kind: "error", message: t(`error_${local.error}`) });
      return;
    }
    setStatus({ kind: "sending" });
    const res = await apiFetch<PublishResponse>("/api/leaderboard", {
      method: "POST",
      body: { sessionId, token, nickname: local.value },
    });
    if (res.ok) {
      myEntry.set(sessionId);
      roundToken.clear(sessionId);
      setStatus({ kind: "done", rank: res.data.rank, total: res.data.total });
      return;
    }
    const byCode: Record<string, string> = {
      already_published: t("alreadyPublished"),
      too_fast: t("tooFast"),
      rate_limited: t("errorRateLimited"),
      not_found: t("notOwner"),
    };
    const message =
      res.code === "invalid_nickname" && res.message
        ? t(`error_${res.message as "blocked"}`)
        : (byCode[res.code] ?? t("errorNetwork"));
    setStatus({ kind: "error", message });
  }

  const box =
    "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm";

  if (status.kind === "done") {
    return (
      <section className={box} aria-live="polite">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-xl font-semibold text-accent">
          {t("success", { rank: status.rank, total: status.total })}
        </p>
        <Link
          href="/leaderboard"
          className="text-sm font-medium text-accent hover:underline"
        >
          → {t("title")}
        </Link>
      </section>
    );
  }

  if (published) {
    return <p className={`${box} text-muted`}>{t("alreadyPublished")}</p>;
  }
  if (!canPublish) {
    return <p className={`${box} text-muted`}>{t("tooFast")}</p>;
  }
  // Before hydration (undefined) or for visitors of a shared link (null): no form.
  if (!token) return null;

  return (
    <section className={box} aria-labelledby="publish-heading">
      <h2 id="publish-heading" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <label htmlFor="nickname" className="text-sm font-medium">
          {t("nicknameLabel")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="nickname"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX + 5}
            autoComplete="nickname"
            placeholder={t("nicknamePlaceholder")}
            aria-describedby="nickname-hint nickname-error"
            aria-invalid={status.kind === "error"}
            className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status.kind === "sending"}
            className="min-h-11 rounded-xl bg-accent px-5 font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
          >
            {status.kind === "sending" ? t("sending") : t("submit")}
          </button>
        </div>
        <p id="nickname-hint" className="text-xs text-muted">
          {t("nicknameHint")}
        </p>
        <p id="nickname-error" role="alert" className="text-sm text-danger">
          {status.kind === "error" ? status.message : ""}
        </p>
      </form>
    </section>
  );
}
