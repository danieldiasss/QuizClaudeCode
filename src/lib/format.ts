/** 75_400 → "1m 15s"; 9_000 → "9s". */
export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}m ${String(seconds).padStart(2, "0")}s`
    : `${seconds}s`;
}

export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
