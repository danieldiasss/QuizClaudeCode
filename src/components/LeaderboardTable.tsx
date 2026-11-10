"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-client";
import { myEntry } from "@/lib/client-storage";
import { formatDate, formatDuration } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/schemas";

const PAGE = 100;
const noopSubscribe = () => () => {};

export function LeaderboardTable({
  initial,
  total,
}: {
  initial: LeaderboardEntry[];
  total: number;
}) {
  const t = useTranslations("Leaderboard");
  const tl = useTranslations("Levels");
  const locale = useLocale();
  const [entries, setEntries] = useState(initial);
  const [loading, setLoading] = useState(false);
  const mine = useSyncExternalStore(noopSubscribe, myEntry.get, () => null);

  async function loadMore() {
    setLoading(true);
    const res = await apiFetch<{ entries: LeaderboardEntry[]; total: number }>(
      `/api/leaderboard?limit=${PAGE}&offset=${entries.length}`,
    );
    if (res.ok) setEntries((prev) => [...prev, ...res.data.entries]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="border-b border-border text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t("rank")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("nickname")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("score")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("level")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("correct")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("time")}
              </th>
              <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                {t("date")}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isMine = e.sessionId === mine;
              return (
                <tr
                  key={e.sessionId}
                  aria-current={isMine ? "true" : undefined}
                  className={`border-b border-border last:border-0 ${isMine ? "bg-accent/10 font-semibold" : ""}`}
                >
                  <td className="px-4 py-3 text-muted tabular-nums">
                    {e.rank}
                  </td>
                  <td className="px-4 py-3">
                    {e.nickname}
                    {isMine && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        {t("you")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {e.score}
                  </td>
                  <td className="px-4 py-3">{tl(e.level)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {e.correctCount}/10
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatDuration(e.durationMs)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {formatDate(e.createdAt, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="self-center rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-60"
        >
          {loading ? t("loading") : t("loadMore")}
        </button>
      )}
    </div>
  );
}
