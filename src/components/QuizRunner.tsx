"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api-client";
import {
  activeRound,
  lastRoundIds,
  roundToken,
  type ActiveRound,
} from "@/lib/client-storage";
import type {
  Level,
  Locale,
  QuizResult,
  StartQuizResponse,
} from "@/lib/schemas";
import { AnswerButtons } from "./AnswerButtons";
import { ProgressBar } from "./ProgressBar";

type Phase =
  | { kind: "loading" }
  | { kind: "playing" }
  | { kind: "submitting" }
  | { kind: "error"; reason: "start" | "submit" | "expired" | "rate_limited" };

export function QuizRunner({
  level,
  locale,
}: {
  level: Level;
  locale: Locale;
}) {
  const t = useTranslations("Quiz");
  const router = useRouter();
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const startRound = useCallback(async () => {
    setPhase({ kind: "loading" });
    const res = await apiFetch<StartQuizResponse>("/api/quiz/start", {
      method: "POST",
      body: { level, locale, exclude: lastRoundIds.get(level) },
    });
    if (!res.ok) {
      setPhase({
        kind: "error",
        reason: res.code === "rate_limited" ? "rate_limited" : "start",
      });
      return;
    }
    const fresh: ActiveRound = {
      sessionId: res.data.sessionId,
      token: res.data.token,
      level,
      locale,
      questions: res.data.questions,
      answers: {},
      index: 0,
    };
    activeRound.set(fresh);
    setRound(fresh);
    setPhase({ kind: "playing" });
  }, [level, locale]);

  // Restore an in-progress round of this level (reload, locale switch), else start one.
  useEffect(() => {
    const saved = activeRound.get(level);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from sessionStorage
      setRound(saved);
      setPhase({ kind: "playing" });
    } else {
      void startRound();
    }
  }, [level, startRound]);

  const update = useCallback((next: ActiveRound) => {
    activeRound.set(next);
    setRound(next);
  }, []);

  const total = round?.questions.length ?? 10;
  const current = round?.questions[round.index];
  const isLast = round ? round.index === total - 1 : false;
  const answeredCount = round ? Object.keys(round.answers).length : 0;
  const allAnswered = answeredCount === total;

  const answer = useCallback(
    (value: boolean) => {
      if (!round || !current || phase.kind !== "playing") return;
      const answers = { ...round.answers, [current.id]: value };
      // Auto-advance; on the last question stay so the player can submit.
      const index = round.index < total - 1 ? round.index + 1 : round.index;
      update({ ...round, answers, index });
    },
    [round, current, phase.kind, total, update],
  );

  const goBack = useCallback(() => {
    if (round && round.index > 0) update({ ...round, index: round.index - 1 });
  }, [round, update]);

  const submit = useCallback(async () => {
    if (!round || !allAnswered) return;
    setPhase({ kind: "submitting" });
    const res = await apiFetch<QuizResult>("/api/quiz/submit", {
      method: "POST",
      body: {
        sessionId: round.sessionId,
        token: round.token,
        answers: round.answers,
      },
    });

    if (res.ok || res.code === "already_submitted") {
      roundToken.set(round.sessionId, round.token);
      lastRoundIds.set(
        level,
        round.questions.map((q) => q.id),
      );
      activeRound.clear(level);
      router.push(`/result/${round.sessionId}`);
      return;
    }
    if (res.code === "expired" || res.code === "not_found") {
      activeRound.clear(level);
      setPhase({ kind: "error", reason: "expired" });
      return;
    }
    setPhase({
      kind: "error",
      reason: res.code === "rate_limited" ? "rate_limited" : "submit",
    });
  }, [round, allAnswered, level, router]);

  // Keyboard: V/T or ← = true, F or → = false.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      if (key === "v" || key === "t" || key === "arrowleft") {
        e.preventDefault();
        answer(true);
      } else if (key === "f" || key === "arrowright") {
        e.preventDefault();
        answer(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  // Move focus to the new statement so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [round?.index]);

  if (phase.kind === "error") {
    const messages = {
      start: t("errorStart"),
      submit: t("errorSubmit"),
      expired: t("errorExpired"),
      rate_limited: t("errorRateLimited"),
    };
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center"
      >
        <p>{messages[phase.reason]}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {phase.reason === "submit" ? (
            <button
              type="button"
              onClick={submit}
              className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
            >
              {t("retry")}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRound}
              className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
            >
              {phase.reason === "expired" ? t("restart") : t("retry")}
            </button>
          )}
          <Link
            href="/"
            className="rounded-full border border-border px-5 py-2 font-medium hover:bg-surface-muted"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (!round || !current || phase.kind === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <p className="text-sm text-muted">{t("loading")}</p>
        <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  const busy = phase.kind === "submitting";

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar
        current={round.index + 1}
        total={total}
        label={t("progress", { current: round.index + 1, total })}
      />

      <article
        key={current.id}
        className="flex min-h-40 flex-col justify-center gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm motion-safe:animate-[fade-in_200ms_ease-out] sm:p-8"
      >
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("statementLabel")}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-xl leading-snug font-semibold text-pretty outline-none sm:text-2xl"
        >
          {current.statement}
        </h1>
      </article>

      <AnswerButtons
        selected={round.answers[current.id]}
        disabled={busy}
        onAnswer={answer}
        labels={{ true: t("true"), false: t("false") }}
      />

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={round.index === 0 || busy}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:invisible"
        >
          ← {t("back")}
        </button>
        <span className="text-xs text-muted">
          {t("answeredCount", { count: answeredCount, total })}
        </span>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || busy}
            className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? t("submitting") : t("seeResult")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => update({ ...round, index: round.index + 1 })}
            disabled={round.answers[current.id] === undefined}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:invisible"
          >
            {t("next")} →
          </button>
        )}
      </div>

      <p className="hidden text-center text-xs text-muted sm:block">
        {t("keyboardHint")}
      </p>
    </div>
  );
}
