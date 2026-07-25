/** Relative time label for dashboard cards (Turkish locale). */
export function formatRelativeTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });

  const seconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(seconds);
  if (absSeconds < 60) return rtf.format(seconds, "second");

  const minutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) return rtf.format(minutes, "minute");

  const hours = Math.round(diffMs / 3_600_000);
  const absHours = Math.abs(hours);
  if (absHours < 24) return rtf.format(hours, "hour");

  const days = Math.round(diffMs / 86_400_000);
  const absDays = Math.abs(days);
  if (absDays < 30) return rtf.format(days, "day");

  const months = Math.round(diffMs / (86_400_000 * 30));
  const absMonths = Math.abs(months);
  if (absMonths < 12) return rtf.format(months, "month");

  const years = Math.round(diffMs / (86_400_000 * 365));
  return rtf.format(years, "year");
}

/** Latest timestamp among workspace, profile and optional document update. */
export function latestTimestamp(...values: Array<string | null | undefined>): string | null {
  let latest: Date | null = null;

  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date.getTime() > latest.getTime()) {
      latest = date;
    }
  }

  return latest ? latest.toISOString() : null;
}
