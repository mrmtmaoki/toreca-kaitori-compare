import { getDb, getCardById, getExcludedShopDbIds, type CardSummary } from "./db";
import { SERIES_LIST } from "./series";

export interface TopMover {
  series: string;
  card: CardSummary;
  previousMaxPrice: number;
  changeAmount: number;
  changePercent: number;
}

const TARGET_WINDOW_DAYS = 30;
// Day bucketing here must match web/lib/priceHistory.ts's JST (UTC+9)
// convention — this site and its shops are Japan-only, and the daily scrape
// cron runs ~05:05 JST (still the *previous* UTC calendar day). Using raw
// UTC dates made this cutoff land partway into JST day 2 instead of at the
// end of JST day 1, which could pull a later intra-day price into
// "previous" — confirmed via a real card (ニコ・ロビン(プロモーションパックEXVol.4))
// that this ranked as a +5.3% riser here while its own chart (JST-bucketed)
// correctly showed -11.1%, because this cutoff's UTC end-of-day boundary
// included a same-JST-day-2 price update that should have counted as
// "current", not "previous".
const JST_OFFSET_SQL = "+9 hours";

/**
 * Shared "what date do we compare against" logic for both the single
 * top-mover-per-genre pick and the ranked multi-card lists below: target
 * `TARGET_WINDOW_DAYS` ago, clamped to the earliest data actually on record
 * so day-one-through-day-29 comparisons use whatever short window exists
 * instead of finding nothing. Returns null when there's only one scrape date
 * in the whole DB (literally nothing to compare against yet).
 */
function getComparisonCutoff(db: ReturnType<typeof getDb>): string | null {
  const { earliest, distinctDates } = db
    .prepare(
      `SELECT MIN(scraped_at) AS earliest, COUNT(DISTINCT date(scraped_at, '${JST_OFFSET_SQL}')) AS distinctDates
       FROM price_records`
    )
    .get() as { earliest: string | null; distinctDates: number };

  if (!earliest || distinctDates < 2) return null;

  const targetCutoff = new Date();
  targetCutoff.setDate(targetCutoff.getDate() - TARGET_WINDOW_DAYS);
  const targetCutoffIso = targetCutoff.toISOString();
  if (targetCutoffIso > earliest) return targetCutoffIso;

  // Clamping to the exact earliest millisecond-precision timestamp (instead
  // of end-of-that-day) was a real bug: `previous_latest`'s `<= cutoff`
  // would then only match the single row that happens to carry that exact
  // timestamp, not "every shop's state as of day one" — silently returning
  // no movers at all for the entire early-history period. Use the end of
  // the earliest JST calendar day instead, so every shop's first JST day of
  // scraping counts as the starting point for comparison.
  const earliestJstDay = (
    db.prepare(`SELECT date(?, '${JST_OFFSET_SQL}') AS d`).get(earliest) as { d: string }
  ).d;
  // End of that JST day, expressed back in UTC for comparison against
  // scraped_at (which is stored in UTC): JST 23:59:59.999 = UTC 14:59:59.999
  // the same calendar day.
  return `${earliestJstDay}T14:59:59.999Z`;
}

function excludedShopClause(db: ReturnType<typeof getDb>): string {
  const ids = getExcludedShopDbIds(db);
  return ids.length > 0 ? `AND pr.shop_id NOT IN (${ids.join(",")})` : "";
}

/** Whether there's at least 2 distinct scrape dates on record — the same
 * gate getTopMoverPerGenre/getTopMoversRanked use internally, exposed
 * directly so callers can decide up front whether to show the real ranking
 * UI or the pre-automation dummy fallback (see web/app/trending/page.tsx). */
export function hasMultiDayHistory(): boolean {
  return getComparisonCutoff(getDb()) !== null;
}

/**
 * Biggest price riser per genre, comparing the current max buyback price
 * against its value as of `TARGET_WINDOW_DAYS` ago — or, while less history
 * than that actually exists, against the very first snapshot on record, so
 * this starts showing a real (if short-window) comparison as soon as a
 * second day of scrape data lands, rather than staying empty until a full
 * 30 days accumulates.
 *
 * Returns null when there's only one scrape date in the whole DB (day one —
 * literally nothing to compare against yet, every card would show 0 change).
 */
export function getTopMoverPerGenre(): TopMover[] | null {
  const db = getDb();
  const cutoff = getComparisonCutoff(db);
  if (!cutoff) return null;
  const excludedClause = excludedShopClause(db);

  const movers: TopMover[] = [];

  for (const series of SERIES_LIST) {
    const row = db
      .prepare(
        `WITH current_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
           WHERE 1=1 ${excludedClause}
         ),
         previous_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
           WHERE pr.scraped_at <= ? ${excludedClause}
         )
         SELECT c.id AS card_id, MAX(cl.price) AS current_max, MAX(pl.price) AS previous_max
         FROM cards c
         JOIN current_latest cl ON cl.card_id = c.id AND cl.rn = 1
         JOIN previous_latest pl ON pl.card_id = c.id AND pl.rn = 1
         WHERE c.series = ?
         GROUP BY c.id
         HAVING current_max > previous_max
         ORDER BY (current_max - previous_max) DESC
         LIMIT 1`
      )
      .get(cutoff, series.name) as { card_id: number; current_max: number; previous_max: number } | undefined;

    if (!row) continue;

    const card = getCardById(row.card_id, series.name);
    if (!card) continue;

    movers.push({
      series: series.slug,
      card,
      previousMaxPrice: row.previous_max,
      changeAmount: row.current_max - row.previous_max,
      changePercent: ((row.current_max - row.previous_max) / row.previous_max) * 100,
    });
  }

  return movers.length > 0 ? movers : null;
}

/**
 * Ranked top-N risers or fallers within one genre — the multi-card version
 * of getTopMoverPerGenre, for the /trending page's per-genre ranking
 * sections. Same comparison-window logic; `direction` flips the HAVING/ORDER
 * BY so "down" finds cards whose current max is *below* the cutoff price.
 */
export function getTopMoversRanked(seriesName: string, direction: "up" | "down", limit: number): TopMover[] {
  const db = getDb();
  const cutoff = getComparisonCutoff(db);
  if (!cutoff) return [];
  const excludedClause = excludedShopClause(db);

  const having = direction === "up" ? "current_max > previous_max" : "current_max < previous_max";
  const orderBy = direction === "up" ? "(current_max - previous_max) DESC" : "(current_max - previous_max) ASC";

  const rows = db
    .prepare(
      `WITH current_latest AS (
         SELECT pr.card_id, pr.shop_id, pr.price,
           ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
         FROM price_records pr
       ),
       previous_latest AS (
         SELECT pr.card_id, pr.shop_id, pr.price,
           ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
         FROM price_records pr
         WHERE pr.scraped_at <= ?
       )
       SELECT c.id AS card_id, MAX(cl.price) AS current_max, MAX(pl.price) AS previous_max
       FROM cards c
       JOIN current_latest cl ON cl.card_id = c.id AND cl.rn = 1
       JOIN previous_latest pl ON pl.card_id = c.id AND pl.rn = 1
       WHERE c.series = ?
       GROUP BY c.id
       HAVING ${having}
       ORDER BY ${orderBy}
       LIMIT ?`
    )
    .all(cutoff, seriesName, limit) as { card_id: number; current_max: number; previous_max: number }[];

  const movers: TopMover[] = [];
  for (const row of rows) {
    const card = getCardById(row.card_id, seriesName);
    if (!card) continue;
    movers.push({
      series: seriesName,
      card,
      previousMaxPrice: row.previous_max,
      changeAmount: row.current_max - row.previous_max,
      changePercent: ((row.current_max - row.previous_max) / row.previous_max) * 100,
    });
  }
  return movers;
}
