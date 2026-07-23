export interface PriceEvent {
  date: string; // "YYYY-MM-DD" — a day the price actually changed
  maxPrice: number;
  medianPrice: number;
}

export const TREND_PERIODS = [
  { key: "1w", label: "1週間", days: 7 },
  { key: "1m", label: "1ヶ月", days: 30 },
  { key: "3m", label: "3ヶ月", days: 90 },
  { key: "1y", label: "1年", days: 365 },
  { key: "all", label: "全期間", days: Infinity },
] as const;

export type TrendPeriodKey = (typeof TREND_PERIODS)[number]["key"];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The underlying data is event-driven (`insertPriceRecord` only writes a row
 * when the price actually changes, see src/db.ts) — a real card's raw history
 * is a sparse, irregularly-spaced list of change events, not one row per day.
 * Charting that directly would draw a diagonal line "smoothly" interpolating
 * between two dates that actually had a constant price the whole time, which
 * misrepresents what happened. Forward-filling onto a regular grid (using the
 * most recently known value at each grid point) reflects the real step-
 * function shape while still producing the continuous-looking line users
 * expect from a stock-style chart.
 *
 * Longer ranges are also bucketed (weekly/monthly) rather than always daily —
 * a 1-year daily chart would cram ~365 points into the same width as a
 * 7-point weekly one, mostly showing long flat stretches (real buyback prices
 * don't move every day) and making genuine recent moves hard to see. Bucket
 * granularity is picked from the actual displayed range, not the nominal
 * period, so "全期間" stays daily while history is still short (e.g. the
 * first few months after automation goes live) and only coarsens once there's
 * enough history to need it.
 */
function pickBucketDays(rangeDays: number): number {
  if (rangeDays <= 90) return 1;
  if (rangeDays <= 730) return 7;
  return 30;
}

export function resamplePriceTrend(
  events: PriceEvent[],
  periodKey: TrendPeriodKey,
  today: Date = new Date()
): PriceEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const period = TREND_PERIODS.find((p) => p.key === periodKey)!;
  const earliestDate = sorted[0].date;
  const todayIso = toIsoDate(today);

  const rangeDays = Number.isFinite(period.days)
    ? period.days
    : Math.max(1, Math.round((today.getTime() - new Date(earliestDate).getTime()) / 86_400_000) + 1);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - rangeDays + 1);
  const startIso = toIsoDate(startDate) < earliestDate ? earliestDate : toIsoDate(startDate);

  const bucketDays = pickBucketDays(rangeDays);

  // Seed with whatever was already true at the start of the window (the last
  // change that happened before it, if any) so the chart doesn't start with
  // a false gap when the most recent change predates the window.
  let lastKnown: PriceEvent | null = null;
  for (const e of sorted) {
    if (e.date < startIso) lastKnown = e;
    else break;
  }

  const result: PriceEvent[] = [];
  let eventIdx = sorted.findIndex((e) => e.date >= startIso);
  if (eventIdx === -1) eventIdx = sorted.length;

  const cursor = new Date(startIso);
  while (toIsoDate(cursor) <= todayIso) {
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + bucketDays - 1);
    const bucketEndIso = toIsoDate(bucketEnd) > todayIso ? todayIso : toIsoDate(bucketEnd);

    while (eventIdx < sorted.length && sorted[eventIdx].date <= bucketEndIso) {
      lastKnown = sorted[eventIdx];
      eventIdx++;
    }
    if (lastKnown) {
      result.push({ date: bucketEndIso, maxPrice: lastKnown.maxPrice, medianPrice: lastKnown.medianPrice });
    }

    cursor.setDate(cursor.getDate() + bucketDays);
  }

  return result;
}
