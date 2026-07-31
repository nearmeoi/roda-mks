// ISO-8601 week: week 1 is the week containing the year's first Thursday
// (equivalently, the week containing Jan 4th), weeks run Monday-Sunday.
export function weekToDateRange(week: number, year: number = new Date().getFullYear()): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Sunday (0) -> 7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start, end };
}

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatWeekLabel(week: number, year: number = new Date().getFullYear()): string {
  const { start, end } = weekToDateRange(week, year);
  const startMonth = MONTHS_ID[start.getUTCMonth()];
  const endMonth = MONTHS_ID[end.getUTCMonth()];
  const dateRange = startMonth === endMonth
    ? `${start.getUTCDate()}-${end.getUTCDate()} ${endMonth}`
    : `${start.getUTCDate()} ${startMonth}-${end.getUTCDate()} ${endMonth}`;
  return `${dateRange} ${end.getUTCFullYear()}`;
}

// Matches POS's "Week 34" style HQ/BS stock markers.
const WEEK_MARKER_RE = /^Week\s+(\d{1,2})$/i;

export function parseWeekMarker(value: string): number | null {
  const match = value.match(WEEK_MARKER_RE);
  return match ? Number(match[1]) : null;
}
